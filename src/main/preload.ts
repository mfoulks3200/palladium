// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import {
  MainToRendererEvents,
  RendererToMainEvents,
  RendererToMainInvocations,
} from '../ipc';

// Runtime allowlists prevent DevTools/userscripts from sending to arbitrary
// IPC channels. TypeScript generics enforce types at compile time, but the
// preload context bridge is reachable at runtime by anything in the renderer.
const SEND_ALLOWLIST: Set<string> = new Set<string>([
  'request-tab-meta',
  'update-active-tab',
  'update-tab-url',
  'open-new-tab',
  'close-tab',
  'tab-actions',
  'reorder-tab',
  'tab-context-menu',
  'app-resize',
  'browser-layout-change',
  'devtools-layout-change',
  'command-bar',
  'settings-sync',
  'clear-history',
  'feature-flags-refresh',
  'capture-exception',
  'window-action',
  'open-settings',
  'media-control',
] satisfies (keyof RendererToMainEvents)[]);

const INVOKE_ALLOWLIST: Set<string> = new Set<string>([
  'get-history',
  'get-system-meta',
  'get-settings',
  'get-feature-flags',
  'command-input',
] satisfies (keyof RendererToMainInvocations)[]);

const RECEIVE_ALLOWLIST: Set<string> = new Set<string>([
  'update-tab-meta',
  'request-browser-layout',
  'request-devtools-layout',
  'command-setup',
  'internal-page-navigate',
  'feature-flags-sync',
  'media-state',
] satisfies (keyof MainToRendererEvents)[]);

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
        return;
      }
      ipcRenderer.once(channel, (_event, ...args) =>
        func(...(args as MainToRendererEvents[T])),
      );
    },
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
