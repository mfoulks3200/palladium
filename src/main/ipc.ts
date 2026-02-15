import { ipcMain, IpcMainEvent, WebContents } from 'electron';
import { MainToRendererEvents, RendererToMainEvents } from '../ipc';

export const typedIpcMain = {
  on<T extends keyof RendererToMainEvents>(
    channel: T,
    listener: (event: IpcMainEvent, ...args: RendererToMainEvents[T]) => void,
  ) {
    ipcMain.on(channel, (event, ...args) =>
      listener(event, ...(args as RendererToMainEvents[T])),
    );
  },
  once<T extends keyof RendererToMainEvents>(
    channel: T,
    listener: (event: IpcMainEvent, ...args: RendererToMainEvents[T]) => void,
  ) {
    ipcMain.once(channel, (event, ...args) =>
      listener(event, ...(args as RendererToMainEvents[T])),
    );
  },
  removeListener<T extends keyof RendererToMainEvents>(
    channel: T,
    listener: (event: IpcMainEvent, ...args: RendererToMainEvents[T]) => void,
  ) {
    ipcMain.removeListener(channel, listener as any);
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
