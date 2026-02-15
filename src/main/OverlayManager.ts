import { disablePortalClearingOnBlur } from '@/components/PortalOverlay';
import { BrowserWindow, WebContentsView } from 'electron';
import { OverlayOptions } from '../ipc';

let overlayView: WebContentsView | null = null;

export const setupOverlayManager = (mainWindow: BrowserWindow) => {
  mainWindow.webContents.removeAllListeners('-add-new-contents');
  mainWindow.webContents.addListener(
    //@ts-expect-error
    '-add-new-contents',
    (event: Event, webContents: Electron.WebContents, ...args: any[]) => {
      if (args[7] === 'overlay') {
        const overlayPos: OverlayOptions = JSON.parse(args[9]);
        overlayView = new WebContentsView({ webContents });

        overlayView.setBackgroundColor('#00000000');

        overlayView.webContents.insertCSS(`
        html, body{
            background: transparent !important;
            background-image: none !important;
            pointer-events: none;
        }

        body *{
            pointer-events: all;
            -webkit-app-region: no-drag;
        }
    `);

        overlayView.setBounds({
          x: overlayPos.position.x,
          y: overlayPos.position.y,
          width: overlayPos.position.width,
          height: overlayPos.position.height,
        });

        // overlayView.webContents.openDevTools();

        mainWindow.contentView.addChildView(overlayView);

        overlayView.webContents.focus();

        overlayView.webContents.on('destroyed', () => {
          if (overlayView && overlayView && !disablePortalClearingOnBlur) {
            overlayView.removeAllListeners();
            mainWindow.contentView.removeChildView(overlayView);
          }
        });
      }
    },
  );
};
