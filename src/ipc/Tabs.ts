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
