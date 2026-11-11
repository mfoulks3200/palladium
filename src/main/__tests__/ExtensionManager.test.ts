// @jest-environment node
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { dialog, type BrowserWindow, type Extensions } from 'electron';
import { ExtensionManager } from '../ExtensionManager';

jest.mock('electron', () => ({
  dialog: { showMessageBox: jest.fn(), showOpenDialog: jest.fn() },
}));
const rootWindow = {} as BrowserWindow;
let temp: string, source: string, store: string;
const runtime = {
  loadExtension: jest.fn(async (folder: string) => ({
    id: path.basename(folder),
  })),
  getAllExtensions: jest.fn(() => []),
  removeExtension: jest.fn(),
};
async function start() {
  const manager = new ExtensionManager(store, runtime as unknown as Extensions);
  await manager.restore();
  return manager;
}
beforeEach(async () => {
  jest.clearAllMocks();
  temp = await fs.mkdtemp(path.join(os.tmpdir(), 'palladium-extensions-'));
  source = path.join(temp, 'example');
  store = path.join(temp, 'store');
  await fs.mkdir(source);
  await fs.writeFile(
    path.join(source, 'manifest.json'),
    JSON.stringify({
      manifest_version: 3,
      name: 'Example',
      version: '1.0',
      permissions: ['storage'],
      host_permissions: ['https://example.com/*'],
      optional_permissions: ['tabs'],
      optional_host_permissions: ['https://optional.test/*'],
      content_scripts: [{ matches: ['http://localhost/*'], js: ['badge.js'] }],
    }),
  );
  jest
    .mocked(dialog.showOpenDialog)
    .mockResolvedValue({ filePaths: [source], canceled: false });
  jest
    .mocked(dialog.showMessageBox)
    .mockResolvedValue({ response: 1, checkboxChecked: false });
});
afterEach(async () => {
  await fs.rm(temp, { recursive: true, force: true });
});

it('shows permissions before loading and discards a declined install', async () => {
  jest
    .mocked(dialog.showMessageBox)
    .mockResolvedValue({ response: 0, checkboxChecked: false });
  const manager = await start();
  expect(await manager.manage({ action: 'install' }, rootWindow)).toEqual({
    extensions: [],
  });
  const options = (dialog.showMessageBox as jest.Mock).mock.calls[0][1];
  expect(options.detail.split('\n')).toEqual([
    'Permission: storage',
    'Website access: https://example.com/*',
    'Run scripts on: http://localhost/*',
    'Optional permission: tabs',
    'Optional website access: https://optional.test/*',
  ]);
  expect(runtime.loadExtension).not.toHaveBeenCalled();
  expect(await fs.readdir(store)).toEqual([]);
});

it('restores enabled copies, skips disabled entries and remembers removal', async () => {
  let manager = await start();
  const installed = await manager.manage({ action: 'install' }, rootWindow);
  expect(installed.extensions[0]).toMatchObject({
    name: 'Example',
    enabled: true,
  });
  const { id } = installed.extensions[0];
  expect(
    (await manager.manage({ action: 'install' }, rootWindow)).error,
  ).toMatch(/already installed/);
  await fs.writeFile(path.join(source, 'manifest.json'), '{}');
  manager = await start();
  expect(runtime.loadExtension).toHaveBeenLastCalledWith(path.join(store, id));
  expect(
    await fs.readFile(path.join(store, id, 'manifest.json'), 'utf8'),
  ).toContain('storage');
  expect(
    (await manager.manage({ action: 'disable', id }, rootWindow)).extensions[0]
      .enabled,
  ).toBe(false);
  expect(runtime.removeExtension).toHaveBeenCalledWith(id);
  runtime.loadExtension.mockClear();
  manager = await start();
  expect(runtime.loadExtension).not.toHaveBeenCalled();
  expect(
    (await manager.manage({ action: 'enable', id }, rootWindow)).extensions[0]
      .enabled,
  ).toBe(true);
  expect(
    (await manager.manage({ action: 'remove', id }, rootWindow)).extensions,
  ).toEqual([]);
  manager = await start();
  expect(
    (await manager.manage({ action: 'list' }, rootWindow)).extensions,
  ).toEqual([]);
  expect(await fs.readFile(path.join(source, 'manifest.json'), 'utf8')).toBe(
    '{}',
  );
  expect(await fs.readdir(store)).toEqual(['installed.json']);
});

it('rejects linked files before permission review', async () => {
  await fs.symlink(
    path.join(source, 'manifest.json'),
    path.join(source, 'linked.json'),
  );
  const result = await (
    await start()
  ).manage({ action: 'install' }, rootWindow);
  expect(result.error).toMatch(/regular files/);
  expect(dialog.showMessageBox).not.toHaveBeenCalled();
  expect(runtime.loadExtension).not.toHaveBeenCalled();
});

it('unloads and discards the copy if the installation cannot be saved', async () => {
  const manager = await start();
  await fs.mkdir(path.join(store, 'installed.json'));
  const result = await manager.manage({ action: 'install' }, rootWindow);
  expect(result.error).toBeTruthy();
  expect(result.extensions).toEqual([]);
  expect(runtime.removeExtension).toHaveBeenCalledTimes(1);
  expect(await fs.readdir(store)).toEqual(['installed.json']);
});

it('lets the user disable an extension that failed to restore', async () => {
  const first = await start();
  const {
    extensions: [installed],
  } = await first.manage({ action: 'install' }, rootWindow);
  runtime.loadExtension.mockRejectedValueOnce(
    new Error('Unsupported extension'),
  );
  const manager = await start();
  expect(
    (await manager.manage({ action: 'list' }, rootWindow)).extensions[0],
  ).toMatchObject({
    enabled: true,
    error: 'Unsupported extension',
  });
  expect(
    (await manager.manage({ action: 'disable', id: installed.id }, rootWindow))
      .extensions[0],
  ).toMatchObject({ enabled: false });
  runtime.loadExtension.mockClear();
  await start();
  expect(runtime.loadExtension).not.toHaveBeenCalled();
});
