import { session, type Session } from 'electron';
import os from 'node:os';
import path from 'node:path';
import { configureWebsitePermissions } from './WebsitePermissions';

let websiteSession: Session | undefined;

export function getWebsiteSession(): Session {
  if (!websiteSession) {
    websiteSession = session.fromPath(
      path.join(os.homedir(), '.palladium', 'sessions', 'main'),
    );
    configureWebsitePermissions(websiteSession);
  }
  return websiteSession;
}
