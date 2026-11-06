import type { IpcMainEvent, IpcMainInvokeEvent, WebContents } from 'electron';
import {
  rendererEventSchemas,
  rendererInvocationSchemas,
} from '../ipc/RequestSchemas';

type Role = 'main-ui' | 'command-bar';
const commandBarChannels = new Set([
  'command-input',
  'command-bar',
  'get-settings',
  'get-feature-flags',
  'get-system-meta',
  'capture-exception',
]);
const trustedRenderers = new WeakMap<
  WebContents,
  { url: string; role: Role }
>();
const documentUrl = (url: string) => {
  const parsed = new URL(url);
  parsed.hash = '';
  return parsed.href;
};

/** Only the main process can grant authority to an app-owned WebContents. */
export function authorizeIpcRenderer(
  contents: WebContents,
  url: string,
  role: Role,
) {
  const registration = { url: documentUrl(url), role };
  trustedRenderers.set(contents, registration);
  const dispose = () => {
    if (trustedRenderers.get(contents) === registration)
      trustedRenderers.delete(contents);
    contents.removeListener('destroyed', dispose);
  };
  contents.once('destroyed', dispose);
  return dispose;
}

export function isAuthorizedIpcRequest(
  event: IpcMainEvent | IpcMainInvokeEvent,
  channel: string,
) {
  try {
    const trusted = trustedRenderers.get(event.sender);
    const frame = event.senderFrame;
    return (
      !!trusted &&
      !event.sender.isDestroyed() &&
      !!frame &&
      frame === event.sender.mainFrame &&
      documentUrl(frame.url) === trusted.url &&
      documentUrl(event.sender.getURL()) === trusted.url &&
      (trusted.role === 'main-ui' || commandBarChannels.has(channel)) &&
      (Object.hasOwn(rendererEventSchemas, channel) ||
        Object.hasOwn(rendererInvocationSchemas, channel))
    );
  } catch {
    // Destroyed or detached frames are never authorized.
    return false;
  }
}
