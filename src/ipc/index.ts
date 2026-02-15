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
}

export interface TabManagerIpc {
  currentTabUuid?: string | null;
  tabs: TabIpcPacket[];
}

export interface TabActionsIpc {
  action: 'back' | 'forward' | 'refresh' | 'hard-refresh' | 'mute' | 'unmute';
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
  'ipc-example': [string];
}

/**
 * Protocol definition for Main -> Renderer communication
 */
export interface MainToRendererEvents {
  'update-tab-meta': [TabManagerIpc];
  'browser-layout-change': [];
  'ipc-example': [string];
}

export type Channels = keyof RendererToMainEvents | keyof MainToRendererEvents;
