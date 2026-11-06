// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import {
  MainToRendererEvents,
  mainToRendererChannels,
  RendererToMainEvents,
  RendererToMainInvocations,
} from '../ipc';

import {
  rendererEventSchemas,
  rendererInvocationSchemas,
} from '../ipc/RequestSchemas';

const SEND_ALLOWLIST = new Set(Object.keys(rendererEventSchemas));
const INVOKE_ALLOWLIST = new Set(Object.keys(rendererInvocationSchemas));
const RECEIVE_ALLOWLIST = new Set(Object.keys(mainToRendererChannels));

const electronHandler = {
  ipcRenderer: {
    sendMessage<T extends keyof RendererToMainEvents>(
      channel: T,
      ...args: RendererToMainEvents[T]
    ) {
      if (!SEND_ALLOWLIST.has(channel)) {
        console.warn(`Blocked IPC send to unknown channel: ${channel}`);
        return;
      }
      ipcRenderer.send(channel, ...args);
    },
    invoke<T extends keyof RendererToMainInvocations>(
      channel: T,
      ...args: RendererToMainInvocations[T]['args']
    ): Promise<RendererToMainInvocations[T]['result']> {
      if (!INVOKE_ALLOWLIST.has(channel)) {
        console.warn(`Blocked IPC invoke to unknown channel: ${channel}`);
        return Promise.reject(new Error(`IPC channel not allowed: ${channel}`));
      }
      return ipcRenderer.invoke(channel, ...args);
    },
    on<T extends keyof MainToRendererEvents>(
      channel: T,
      func: (...args: MainToRendererEvents[T]) => void,
    ) {
      if (!RECEIVE_ALLOWLIST.has(channel)) {
        console.warn(`Blocked IPC listener on unknown channel: ${channel}`);
        return () => {};
      }
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
      if (!RECEIVE_ALLOWLIST.has(channel)) {
        console.warn(`Blocked IPC once on unknown channel: ${channel}`);
        return () => {};
      }
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...(args as MainToRendererEvents[T]));
      ipcRenderer.once(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    },
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
