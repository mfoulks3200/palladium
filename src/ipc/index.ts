import { RendererInvocationArgs } from './RequestSchemas';
export type {
  RendererToMainEvents,
  OverlayOptions,
  TabActionsIpc,
  CommandBarIpc,
  CommandInputIpc,
  CaptureExceptionIpc,
  WindowActionIpc,
  MediaControlIpc,
} from './RequestSchemas';
import type { RendererToMainEvents } from './RequestSchemas';
import { IpcIcons } from './Icons';
import { SettingSchema } from './SettingsRegistry';

export interface TabIpcPacket {
  uuid: string;
  url: string;
  title: string;
  faviconB64?: string;
  isDevMode: boolean;
  isPlayingAudio: boolean;
  isMuted: boolean;
  isLoading: boolean;
  isInternal: boolean;
}

export interface TabManagerIpc {
  currentTabUuid?: string | null;
  tabs: TabIpcPacket[];
}

export interface CommandResponseIpc {
  provider: {
    lozenge?: {
      name: string;
      color: string;
      icon?: IpcIcons;
    };
    prompt: string;
  };
  suggestions: {
    [section: string]: {
      section: {
        name: string;
        id: string;
      };
      commands: {
        icon?: IpcIcons;
        name: string;
        subname?: string;
        keywords?: string[];
        value: string;
        score?: number;
        weight?: number;
        shortcut?: {
          shortcutStr: string;
          name: string;
          color: string;
        };
      }[];
    };
  };
}

export interface CommandBarSetupIpc {
  tabUuid: string;
  prefill: string;
}

export interface InternalPageNavigateIpc {
  newPath: string;
}

export interface HistoryItem {
  id: number;
  tab_uuid: string;
  url: string;
  title: string;
  metaDescription: string;
  metaKeywords: string;
  timestamp: string;
}

export interface FeatureFlagsIpc {
  flags: Record<string, string | boolean>;
}

export interface MediaState {
  id: string;
  type: string;
  title?: string;
  artist?: string;
  album?: string;
  artworkUrl?: string;
  playing?: boolean;
  progress?: number;
  duration?: number;
}

export type MediaStateIpc =
  | { action: 'add'; state: MediaState }
  | { action: 'update'; state: Partial<MediaState> & { id: string } }
  | { action: 'remove'; id: string };

export interface SystemMetaIpc {
  platform: string;
  arch: string;
  osVersion: string;
  electronVersion: string;
  chromeVersion: string;
  nodeVersion: string;
  appVersion: string;
  appName: string;
  gitInfo: {
    version: string;
    commitHash: string;
    branch: string;
    lastCommitDateTime: string;
  };
}

/**
 * Protocol definition for Main -> Renderer communication
 */
export interface MainToRendererEvents {
  'update-tab-meta': [TabManagerIpc];
  'request-browser-layout': [];
  'request-devtools-layout': [];
  'command-setup': [CommandBarSetupIpc];
  'shortcut-rejected': [{ requested: string; actual: string }];
  'internal-page-navigate': [InternalPageNavigateIpc];
  'feature-flags-sync': [FeatureFlagsIpc];
  'media-state': [MediaStateIpc];
}

/**
 * Protocol definition for Renderer -> Main request-response communication.
 * Uses ipcMain.handle / ipcRenderer.invoke pattern.
 * Each key maps to { args: [...], result: ReturnType }.
 */
interface InvocationResults {
  'get-history': HistoryItem[];
  'get-system-meta': SystemMetaIpc;
  'get-settings': SettingSchema;
  'get-feature-flags': FeatureFlagsIpc;
  'command-input': CommandResponseIpc | void;
}

export type RendererToMainInvocations = {
  [K in keyof RendererInvocationArgs]: {
    args: RendererInvocationArgs[K];
    result: InvocationResults[K];
  };
};

export const mainToRendererChannels = {
  'update-tab-meta': true,
  'request-browser-layout': true,
  'request-devtools-layout': true,
  'command-setup': true,
  'shortcut-rejected': true,
  'internal-page-navigate': true,
  'feature-flags-sync': true,
  'media-state': true,
} satisfies Record<keyof MainToRendererEvents, true>;

export type Channels =
  | keyof RendererToMainEvents
  | keyof MainToRendererEvents
  | keyof RendererToMainInvocations;
