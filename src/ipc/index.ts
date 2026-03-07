import { IpcIcons } from './Icons';
import { SettingSchema } from './SettingsRegistry';

export interface OverlayOptions {
  position: {
    x: number;
    y: number;
    height: number;
    width: number;
  };
}

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

export interface TabActionsIpc {
  action: 'back' | 'forward' | 'refresh' | 'hard-refresh' | 'mute' | 'unmute';
}

interface CommandInputSuggestionIpc {
  provider?: string;
  mode: 'suggestions';
  input: string;
}

interface CommandInputExecutionIpc {
  provider?: string;
  mode: 'execute';
  input: string;
  command: string;
  tabUuid?: string;
}

export type CommandInputIpc =
  | CommandInputSuggestionIpc
  | CommandInputExecutionIpc;

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
        icon?: IpcIcons | string;
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

export interface CommandBarIpc {
  action: 'open' | 'close';
  tabUuid?: string;
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

export interface CaptureExceptionIpc {
  message: string;
  stack: string;
  name: string;
  source: string;
}

export interface WindowActionIpc {
  action: 'close' | 'minimize' | 'maximize';
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

export interface MediaControlIpc {
  mediaId: string;
  action: 'play' | 'pause' | 'next' | 'previous';
}

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
 * Protocol definition for Renderer -> Main communication
 */
export interface RendererToMainEvents {
  'update-tab-meta': [];
  'update-active-tab': [{ activeTabUuid: string }];
  'update-tab-url': [{ newUrl: string }];
  'open-new-tab': [{ newUrl: string }];
  'close-tab': [{ uuid: string }];
  'tab-actions': [TabActionsIpc];
  'reorder-tab': [{ startIndex: number; finishIndex: number }];
  'tab-context-menu': [{ uuid: string }];
  'app-resize': [{ width: number; height: number }];
  'browser-layout-change': [OverlayOptions];
  'devtools-layout-change': [OverlayOptions];
  'ipc-example': [string];
  'command-input': [CommandInputIpc];
  'command-bar': [CommandBarIpc];
  'internal-page-navigate': [InternalPageNavigateIpc];
  'settings-sync': [SettingSchema];
  'get-history': [];
  'clear-history': [];
  'feature-flags-sync': [];
  'feature-flags-refresh': [];
  'capture-exception': [CaptureExceptionIpc];
  'get-system-meta': [];
  'window-action': [WindowActionIpc];
  'open-settings': [];
  'media-control': [MediaControlIpc];
}

/**
 * Protocol definition for Main -> Renderer communication
 */
export interface MainToRendererEvents {
  'update-tab-meta': [TabManagerIpc];
  'browser-layout-change': [];
  'devtools-layout-change': [];
  'ipc-example': [string];
  'command-response': [CommandResponseIpc];
  'command-setup': [CommandBarSetupIpc];
  'internal-page-navigate': [InternalPageNavigateIpc];
  'settings-sync': [SettingSchema];
  'history-data': [HistoryItem[]];
  'feature-flags-sync': [FeatureFlagsIpc];
  'system-meta': [SystemMetaIpc];
  'media-state': [MediaStateIpc];
}

export type Channels = keyof RendererToMainEvents | keyof MainToRendererEvents;
