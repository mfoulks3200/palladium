import {
  ipcMain,
  IpcMainEvent,
  IpcMainInvokeEvent,
  WebContents,
} from 'electron';
import {
  MainToRendererEvents,
  RendererToMainEvents,
  RendererToMainInvocations,
} from '../ipc';
import {
  rendererEventSchemas,
  rendererInvocationSchemas,
} from '../ipc/RequestSchemas';
import { isAuthorizedIpcRequest } from './IpcAuthorization';

type EventListener<T extends keyof RendererToMainEvents> = (
  event: IpcMainEvent,
  ...args: RendererToMainEvents[T]
) => void;
const subscriptions = new Set<{
  channel: string;
  listener: unknown;
  dispose: () => void;
}>();
const handlers = new Map<string, () => void>();

function subscribe<T extends keyof RendererToMainEvents>(
  channel: T,
  listener: EventListener<T>,
  once = false,
) {
  let active = true;
  const dispose = () => {
    if (!active) return;
    active = false;
    ipcMain.removeListener(channel, wrapper);
    subscriptions.delete(registration);
  };
  const wrapper = (event: IpcMainEvent, ...args: unknown[]) => {
    if (!active) return;
    const parsed = rendererEventSchemas[channel].safeParse(args);
    if (!isAuthorizedIpcRequest(event, channel) || !parsed.success) {
      console.warn(`Rejected IPC event: ${channel}`);
      return;
    }
    if (once) dispose();
    try {
      Promise.resolve(
        listener(event, ...(parsed.data as RendererToMainEvents[T])),
      ).catch(() => console.warn(`IPC event failed: ${channel}`));
    } catch {
      console.warn(`IPC event failed: ${channel}`);
    }
  };
  const registration = { channel, listener, dispose };
  ipcMain.on(channel, wrapper);
  subscriptions.add(registration);
  return dispose;
}

export const typedIpcMain = {
  on<T extends keyof RendererToMainEvents>(
    channel: T,
    listener: EventListener<T>,
  ) {
    return subscribe(channel, listener);
  },
  once<T extends keyof RendererToMainEvents>(
    channel: T,
    listener: EventListener<T>,
  ) {
    return subscribe(channel, listener, true);
  },
  removeListener<T extends keyof RendererToMainEvents>(
    channel: T,
    listener: EventListener<T>,
  ) {
    for (const subscription of subscriptions) {
      if (
        subscription.channel === channel &&
        subscription.listener === listener
      )
        subscription.dispose();
    }
  },
  handle<T extends keyof RendererToMainInvocations>(
    channel: T,
    listener: (
      event: IpcMainInvokeEvent,
      ...args: RendererToMainInvocations[T]['args']
    ) =>
      | RendererToMainInvocations[T]['result']
      | Promise<RendererToMainInvocations[T]['result']>,
  ) {
    const dispose = () => {
      if (handlers.get(channel) !== dispose) return;
      ipcMain.removeHandler(channel);
      handlers.delete(channel);
    };
    ipcMain.handle(channel, async (event, ...args) => {
      if (!isAuthorizedIpcRequest(event, channel))
        throw new Error('IPC request unauthorized');
      const parsed = rendererInvocationSchemas[channel].safeParse(args);
      if (!parsed.success) throw new Error('IPC request invalid');
      try {
        return await listener(
          event,
          ...(parsed.data as RendererToMainInvocations[T]['args']),
        );
      } catch {
        throw new Error('IPC request failed');
      }
    });
    handlers.set(channel, dispose);
    return dispose;
  },
};

export const typedWebContents = (webContents: WebContents) => ({
  send<T extends keyof MainToRendererEvents>(
    channel: T,
    ...args: MainToRendererEvents[T]
  ) {
    webContents.send(channel, ...args);
  },
});
