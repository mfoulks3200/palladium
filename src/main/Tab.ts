import { Menu, MenuItem, WebContentsView, nativeImage } from 'electron';
import { TabIpcPacket } from 'src/ipc/Tabs';

export class Tab extends EventTarget {
  public uuid: string = crypto.randomUUID();
  private currentUrl: string = '';
  private faviconB64: string | null = null;
  private isPlayingAudio: boolean = false;
  public view: WebContentsView;

  constructor(currentUrl: string) {
    super();
    this.currentUrl = currentUrl;
    this.view = new WebContentsView({
      webPreferences: {
        contextIsolation: true,
        sandbox: true,
        scrollBounce: true,
        backgroundThrottling: true,
      },
    });
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
    return this.view.webContents.getURL();
  }

  public getTitle() {
    return this.view.webContents.getTitle();
  }

  public isDevMode() {
    return this.view.webContents.isDevToolsOpened();
  }

  public setDevMode(shouldEnable: boolean) {
    if (shouldEnable) {
      this.view.webContents.openDevTools();
    } else {
      this.view.webContents.closeDevTools();
    }
  }

  public getFavicon() {
    return this.view.webContents;
  }

  public getMuted() {
    return this.view.webContents.isAudioMuted();
  }

  public setMuted(shouldMute: boolean) {
    this.view.webContents.setAudioMuted(shouldMute);
    this.publishMetadataUpdateEvent();
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
      this.publishMetadataUpdateEvent();
    });

    this.view.webContents.on('devtools-opened', async () => {
      this.publishMetadataUpdateEvent();
    });

    this.view.webContents.on('devtools-closed', async () => {
      this.publishMetadataUpdateEvent();
    });

    this.view.webContents.on('did-navigate', async () => {
      this.publishMetadataUpdateEvent();
    });

    this.view.webContents.on('did-start-loading', async () => {
      this.publishMetadataUpdateEvent();
    });

    this.view.webContents.on('did-start-loading', async () => {
      this.publishMetadataUpdateEvent();
    });
  }

  private publishMetadataUpdateEvent() {
    const updateEvent = new CustomEvent('tab-updated', {
      detail: this.getTabIpcMeta(),
      bubbles: true, // Events can bubble up the DOM if necessary
    });
    this.dispatchEvent(updateEvent);
  }
}
