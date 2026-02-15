// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { MainToRendererEvents, RendererToMainEvents } from '../ipc';

const electronHandler = {
  ipcRenderer: {
    sendMessage<T extends keyof RendererToMainEvents>(
      channel: T,
      ...args: RendererToMainEvents[T]
    ) {
      ipcRenderer.send(channel, ...args);
    },
    on<T extends keyof MainToRendererEvents>(
      channel: T,
      func: (...args: MainToRendererEvents[T]) => void,
    ) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...(args as MainToRendererEvents[T]));
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once<T extends keyof MainToRendererEvents>(
      channel: T,
      func: (...args: MainToRendererEvents[T]) => void,
    ) {
      ipcRenderer.once(channel, (_event, ...args) =>
        func(...(args as MainToRendererEvents[T])),
      );
    },
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
