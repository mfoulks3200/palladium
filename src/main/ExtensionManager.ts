import { BrowserWindow, dialog, type Extensions } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { ExtensionResult, ManagedExtension } from '../ipc';
import { extensionAction } from '../ipc/RequestSchemas';
import { typedIpcMain } from './ipc';
import { getWebsiteSession } from './WebsiteSession';

const recordSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  version: z.string(),
  permissions: z.array(z.string()),
  enabled: z.boolean(),
  source: z.string(),
  key: z.string().optional(),
});
type Entry = z.infer<typeof recordSchema>;
const strings = z.array(z.string()).default([]);
const manifestSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  key: z.string().optional(),
  permissions: strings,
  optional_permissions: strings,
  host_permissions: strings,
  optional_host_permissions: strings,
  content_scripts: z.array(z.object({ matches: strings })).default([]),
});

function message(error: unknown) {
  return error instanceof Error ? error.message : 'Extension operation failed.';
}

export class ExtensionManager {
  private records: Entry[] = [];
  private active = new Map<string, string>();
  private failures = new Map<string, string>();
  private busy = false;
  private storageError?: string;

  constructor(
    private root: string,
    private runtime: Extensions,
  ) {}

  private folder(id: string) {
    return path.join(this.root, id);
  }

  async restore() {
    try {
      await fs.mkdir(this.root, { recursive: true, mode: 0o700 });
      const data = await fs.readFile(
        path.join(this.root, 'installed.json'),
        'utf8',
      );
      this.records = z.array(recordSchema).parse(JSON.parse(data));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.storageError = 'Could not read the saved extension list.';
      }
      return;
    }
    for (const item of this.records.filter((entry) => entry.enabled)) {
      try {
        await this.load(item);
      } catch (error) {
        this.failures.set(item.id, message(error));
      }
    }
  }

  private async save(records: Entry[]) {
    const file = path.join(this.root, 'installed.json');
    const temporary = file + '.' + randomUUID();
    try {
      await fs.writeFile(temporary, JSON.stringify(records), {
        mode: 0o600,
        flag: 'wx',
      });
      await fs.rename(temporary, file);
      this.records = records;
    } finally {
      await fs.rm(temporary, { force: true });
    }
  }

  private async load(item: Entry) {
    if (
      item.key &&
      this.runtime
        .getAllExtensions()
        .some((ext) => ext.manifest.key === item.key)
    ) {
      throw new Error('An extension with this identity is already loaded.');
    }
    const extension = await this.runtime.loadExtension(this.folder(item.id));
    this.active.set(item.id, extension.id);
    this.failures.delete(item.id);
  }

  private unload(id: string) {
    const runtimeId = this.active.get(id);
    if (runtimeId) this.runtime.removeExtension(runtimeId);
    this.active.delete(id);
    this.failures.delete(id);
  }

  private async install(parent: BrowserWindow) {
    const selected = await dialog.showOpenDialog(parent, {
      title: 'Choose an unpacked Chrome extension',
      properties: ['openDirectory'],
    });
    if (selected.canceled) return;
    const source = await fs.realpath(selected.filePaths[0]);
    if (this.ownsSource(source))
      throw new Error('This folder is already installed.');
    if (this.runtime.getAllExtensions().some((ext) => ext.path === source)) {
      throw new Error(
        'Restart without the developer extension environment variable before installing this folder.',
      );
    }
    // Reject unrelated folders before copying their contents.
    await fs.access(path.join(source, 'manifest.json'));
    const id = randomUUID();
    const folder = this.folder(id);
    try {
      // Review and load the same private copy, even if the source folder changes.
      await fs.cp(source, folder, {
        recursive: true,
        filter: async (file) => {
          const stat = await fs.lstat(file);
          if (!stat.isFile() && !stat.isDirectory())
            throw new Error(
              'Choose a folder containing only regular files and directories.',
            );
          return true;
        },
      });
      const parsed = manifestSchema.safeParse(
        JSON.parse(
          await fs.readFile(path.join(folder, 'manifest.json'), 'utf8'),
        ),
      );
      if (!parsed.success)
        throw new Error('Invalid or unsupported extension manifest.');
      const m = parsed.data;
      if (m.key && this.records.some((item) => item.key === m.key))
        throw new Error(
          'An extension with this identity is already installed.',
        );
      const permissions = [
        ...new Set([
          ...m.permissions.map((p) => 'Permission: ' + p),
          ...m.host_permissions.map((p) => 'Website access: ' + p),
          ...m.content_scripts.flatMap((script) =>
            script.matches.map((p) => 'Run scripts on: ' + p),
          ),
          ...m.optional_permissions.map((p) => 'Optional permission: ' + p),
          ...m.optional_host_permissions.map(
            (p) => 'Optional website access: ' + p,
          ),
        ]),
      ];
      const approval = await dialog.showMessageBox(parent, {
        type: 'question',
        title: 'Review extension permissions',
        message: `Install ${m.name} (${m.version})?`,
        detail:
          permissions.join('\n') ||
          'No permissions or website access requested.',
        buttons: ['Cancel', 'Install'],
        defaultId: 0,
        cancelId: 0,
      });
      if (approval.response !== 1) return;
      const entry = {
        id,
        source,
        name: m.name,
        version: m.version,
        key: m.key,
        permissions,
        enabled: true,
      };
      await this.load(entry);
      await this.save([...this.records, entry]);
    } finally {
      if (!this.records.some((item) => item.id === id)) {
        this.unload(id);
        await fs.rm(folder, { recursive: true, force: true });
      }
    }
  }

  ownsSource(source: string) {
    return this.records.some((item) => item.source === source);
  }

  async manage(
    action: z.infer<typeof extensionAction>,
    parent: BrowserWindow,
  ): Promise<ExtensionResult> {
    const list = (): ManagedExtension[] =>
      this.records.map(({ id, name, version, permissions, enabled }) => ({
        id,
        name,
        version,
        permissions,
        enabled,
        error: this.failures.get(id),
      }));
    if (this.storageError || action.action === 'list')
      return { extensions: list(), error: this.storageError };
    if (this.busy)
      return {
        extensions: list(),
        error: 'Another extension operation is in progress.',
      };
    this.busy = true;
    try {
      if (action.action === 'install') await this.install(parent);
      else {
        const entry = this.records.find((item) => item.id === action.id);
        if (!entry) throw new Error('Extension is no longer installed.');
        const enabled = action.action === 'enable';
        const records =
          action.action === 'remove'
            ? this.records.filter((item) => item !== entry)
            : this.records.map((item) =>
                item === entry ? { ...entry, enabled } : item,
              );
        if (enabled && !this.active.has(entry.id)) {
          await this.load(entry);
          try {
            await this.save(records);
          } catch (error) {
            this.unload(entry.id);
            throw error;
          }
        } else {
          await this.save(records);
          if (!enabled) this.unload(entry.id);
          if (action.action === 'remove')
            await fs.rm(this.folder(entry.id), {
              recursive: true,
              force: true,
            });
        }
      }
      return { extensions: list() };
    } catch (error) {
      return { extensions: list(), error: message(error) };
    } finally {
      this.busy = false;
    }
  }
}

export async function setupExtensions() {
  const manager = new ExtensionManager(
    path.join(os.homedir(), '.palladium', 'extensions'),
    getWebsiteSession().extensions,
  );
  await manager.restore();
  typedIpcMain.handle('manage-extensions', (event, action) => {
    const parent = BrowserWindow.fromWebContents(event.sender);
    if (!parent) throw new Error('Missing Settings window');
    return manager.manage(action, parent);
  });
  return manager;
}
