import {
  Menu,
  MenuItem,
  Session,
  WebContentsView,
  session,
} from 'electron';
import { MediaState, TabIpcPacket } from '../ipc';
import { HistoryEvent, HistoryManager } from './HistoryManager';
import path from 'node:path';
import os from 'node:os';
import { AnalyticsManager } from './AnalyticsManager';
import { MediaStateTracker } from './MediaStateTracker';

const devToolsCSS = `
body > .widget.vbox.root-view {
    margin-bottom: 0px !important;
    margin-right: 0px !important;
}

div.widget.vbox[slot="sidebar"]{
  position: absolute !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  height: 100vh !important;
  width: 100vw !important;
  min-height: 100vh !important;
  min-width: 100vw !important;
  max-height: 100vh !important;
  max-width: 100vw !important;
}
`;

export class Tab extends EventTarget {
  public uuid: string = crypto.randomUUID();
  public isInternalPage: boolean = false;
  public devMode: boolean = false;
  private currentUrl: string = '';
  private faviconB64: string | null = null;
  private isPlayingAudio: boolean = false;
  public readonly mediaTracker = new MediaStateTracker();
  public view: WebContentsView;
  public devToolsView: WebContentsView = null as any;
  private static session: Session;

  constructor(currentUrl: string) {
    super();
    this.currentUrl = currentUrl;
    this.mediaTracker.addEventListener('media-state-changed', () => {
      this.dispatchEvent(new CustomEvent('media-state-changed'));
    });
    if (!Tab.session) {
      const sessionPath = path.join(
        os.homedir(),
        '.palladium',
        'sessions',
        'main',
      );
      Tab.session = session.fromPath(sessionPath);
    }
    this.view = new WebContentsView({
      webPreferences: {
        contextIsolation: true,
        sandbox: true,
        scrollBounce: true,
        backgroundThrottling: true,
        session: Tab.session,
      },
    });
    this.setupDevtoolsWindow();
    if (!currentUrl.startsWith('palladium://')) {
      HistoryManager.getInstance().addTab(this.uuid);
      this.registerTabEvents();
      this.view.webContents.loadURL(this.currentUrl);
      this.view.webContents.on('context-menu', () => {
        const menu = new Menu();
        if (!this.isDevMode()) {
          menu.append(
            new MenuItem({
              label: 'Enable dev mode',
              click: () => {
                this.setDevMode(true);
              },
            }),
          );
        }

        menu.popup({});
      });
    } else {
      this.isInternalPage = true;
    }
  }

  private setupDevtoolsWindow() {
    this.devToolsView = new WebContentsView({
      webPreferences: {
        contextIsolation: true,
        sandbox: true,
        scrollBounce: true,
        backgroundThrottling: true,
        session: Tab.session,
      },
    });

    this.devToolsView.webContents.on('destroyed', () => {
      if (!this.view.webContents.isDestroyed()) {
        this.setDevMode(false);
        this.setupDevtoolsWindow();
        this.dispatchEvent(new CustomEvent('request-focus'));
      }
    });
  }

  private async imageUrlToBase64(url: string): Promise<string | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = response.headers.get('content-type') || 'image/png';

      return `data:${contentType};base64,${buffer.toString('base64')}`;
    } catch (error) {
      console.error('Error converting image to Base64:', error);
      return null;
    }
  }

  public getCurrentUrl() {
    if (this.isInternalPage) {
      return this.currentUrl;
    } else {
      return this.view.webContents.getURL();
    }
  }

  public getTitle() {
    return this.view.webContents.getTitle();
  }

  public isDevMode() {
    return this.devMode;
  }

  public setDevMode(shouldEnable: boolean) {
    if (this.devMode === shouldEnable) return;
    this.devMode = shouldEnable;
    if (shouldEnable) {
      if (this.devToolsView.webContents.isDestroyed()) {
        this.setupDevtoolsWindow();
      }
      try {
        this.view.webContents.setDevToolsWebContents(
          this.devToolsView.webContents,
        );
      } catch (e) {
        console.error('Failed to set devtools web contents:', e);
      }
      this.view.webContents.openDevTools({ mode: 'bottom' });
      // Devtoolception
      // this.devToolsView.webContents.openDevTools({ mode: 'detach' });
    } else {
      if (this.view.webContents.isDevToolsOpened()) {
        this.view.webContents.closeDevTools();
      }
      // Detaching with null is causing native conversion errors in some Electron environments.
      // Since we handle recreation on 'destroyed', we can safely skip explicit detachment.
    }
    this.publishMetadataUpdateEvent();
  }

  public getFavicon() {
    return this.faviconB64;
  }

  public getMuted() {
    return this.view.webContents.isAudioMuted();
  }

  public setMuted(shouldMute: boolean) {
    this.view.webContents.setAudioMuted(shouldMute);
    this.publishMetadataUpdateEvent();
  }

  public addMediaState(state: MediaState) {
    this.mediaTracker.addMediaState(state);
  }

  public updateMediaState(state: Partial<MediaState> & { id: string }) {
    this.mediaTracker.updateMediaState(state);
  }

  public removeMediaState(id: string) {
    this.mediaTracker.removeMediaState(id);
  }

  public getMediaStates(): MediaState[] {
    return this.mediaTracker.getMediaStates();
  }

  public getTabIpcMeta(): TabIpcPacket {
    return {
      uuid: this.uuid,
      url: this.getCurrentUrl(),
      title: this.getTitle(),
      faviconB64: this.faviconB64 ?? undefined,
      isDevMode: this.isDevMode(),
      isPlayingAudio: this.isPlayingAudio,
      isMuted: this.view.webContents.isAudioMuted(),
      isLoading: this.view.webContents.isLoading(),
      isInternal: this.isInternalPage,
    };
  }

  private registerTabEvents() {
    this.view.webContents.on(
      'page-favicon-updated',
      async (event, favicons) => {
        // favicons is an array of URLs, typically with different sizes
        if (favicons && favicons.length > 0) {
          const faviconUrl = favicons[0];
          this.faviconB64 = await this.imageUrlToBase64(faviconUrl);
          this.publishMetadataUpdateEvent();
        }
      },
    );

    this.view.webContents.on('audio-state-changed', async (event) => {
      this.isPlayingAudio = event.audible;
      const mediaId = `audio-${this.uuid}`;
      try {
        const sessionData = await this.view.webContents.executeJavaScript(`
          (() => {
            const players = [...document.querySelectorAll('video')];
            const player = players.length > 0
              ? players.sort((a, b) => b.duration - a.duration)[0]
              : null;
            return {
              playbackState: navigator.mediaSession.playbackState,
              metadata: navigator.mediaSession.metadata ? {
                album: navigator.mediaSession.metadata.album ?? "",
                artist: navigator.mediaSession.metadata.artist ?? "",
                artwork: navigator.mediaSession.metadata.artwork ?? [],
                title: navigator.mediaSession.metadata.title ?? "",
              } : null,
              duration: player?.duration ?? 0,
              currentTime: player?.currentTime ?? 0,
            };
          })()
        `);
        if (sessionData.metadata) {
          if (this.mediaTracker.activeMediaId && this.mediaTracker.activeMediaId === mediaId) {
            this.updateMediaState({
              id: mediaId,
              title: sessionData.metadata.title,
              playing: event.audible,
              progress: sessionData.currentTime,
              duration: sessionData.duration,
            });
          } else {
            this.mediaTracker.activeMediaId = mediaId;
            this.addMediaState({
              id: mediaId,
              type: 'audio',
              title: sessionData.metadata.title,
              album: sessionData.metadata.album,
              artist: sessionData.metadata.artist,
              artworkUrl: sessionData.metadata.artwork?.[0]?.src ?? '',
              playing: event.audible,
              progress: sessionData.currentTime,
              duration: sessionData.duration,
            });
          }
        }
      } catch {
        // Tab may have been destroyed
      }
      this.publishMetadataUpdateEvent();
    });

    this.view.webContents.on('devtools-opened', async () => {
      this.setDevMode(true);
      this.devToolsView.webContents.insertCSS(devToolsCSS);
      // Devtool-ception
      // this.devToolsView.webContents.openDevTools();
    });

    this.view.webContents.on('devtools-closed', async () => {
      this.setDevMode(false);
    });

    this.view.webContents.on('did-navigate', async () => {
      if (this.mediaTracker.activeMediaId) {
        this.removeMediaState(this.mediaTracker.activeMediaId);
        this.mediaTracker.activeMediaId = null;
      }
      AnalyticsManager.getInstance().capture('page_navigated');
      const historyEvent: HistoryEvent = {
        tabUuid: this.uuid,
        url: this.getCurrentUrl(),
        title:
          (await this.view.webContents.executeJavaScript(
            `try{document.querySelector('title').innerText}catch(e){}`,
          )) ?? this.getTitle(),
        metaDescription: await this.view.webContents.executeJavaScript(
          `try{document.querySelector('meta[name="description"]').content}catch(e){}`,
        ),
        metaKeywords: await this.view.webContents.executeJavaScript(
          `try{document.querySelector('meta[name="keywords"]').content}catch(e){}`,
        ),
      };
      HistoryManager.getInstance().addHistoryEvent(historyEvent);
      Tab.session.flushStorageData();
      this.publishMetadataUpdateEvent();
    });

    this.view.webContents.on('destroyed', () => {
      HistoryManager.getInstance().closeTab(this.uuid);
      Tab.session.flushStorageData();
    });

    this.view.webContents.on('did-start-loading', async () => {
      this.publishMetadataUpdateEvent();
    });

    this.view.webContents.on('did-stop-loading', async () => {
      this.publishMetadataUpdateEvent();
    });

    this.view.webContents.setWindowOpenHandler((edata) => {
      this.dispatchEvent(
        new CustomEvent('new-window-requested', {
          detail: { url: edata.url, disposition: edata.disposition },
        }),
      );
      return { action: 'deny' };
    });
  }

  public destroyTab() {
    HistoryManager.getInstance().closeTab(this.uuid);
  }

  private publishMetadataUpdateEvent() {
    const updateEvent = new CustomEvent('tab-updated', {
      detail: this.getTabIpcMeta(),
      bubbles: true, // Events can bubble up the DOM if necessary
    });
    this.dispatchEvent(updateEvent);
  }
}
