import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { sessionUrl } from '../ipc/RequestSchemas';

const index = z.number().int().nonnegative();
const space = z
  .object({
    tabs: z.array(sessionUrl),
    selected: index.nullable(),
  })
  .refine(({ tabs, selected }) => selected === null || selected < tabs.length);

const session = z
  .object({
    version: z.literal(1),
    activeSpace: index,
    spaces: z.array(space).min(1),
  })
  .refine(({ activeSpace, spaces }) => activeSpace < spaces.length);

export class SpaceSession {
  private writable = true;

  constructor(private readonly file: string) {}

  read() {
    let raw: string;
    try {
      raw = fs.readFileSync(this.file, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.writable = false;
        console.warn('Could not read the saved spaces.');
      }
      return null;
    }
    try {
      return session.parse(JSON.parse(raw));
    } catch {
      try {
        fs.renameSync(this.file, this.file + '.unreadable-' + randomUUID());
      } catch {
        this.writable = false;
      }
      console.warn('Could not restore the saved spaces.');
      return null;
    }
  }

  write(snapshot: z.infer<typeof session>) {
    if (!this.writable) return;
    const temporary = this.file + '.' + randomUUID() + '.tmp';
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.writeFileSync(temporary, JSON.stringify(snapshot), {
        mode: 0o600,
        flag: 'wx',
      });
      fs.renameSync(temporary, this.file);
    } finally {
      fs.rmSync(temporary, { force: true });
    }
  }
}
