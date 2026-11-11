import { BrowserWindow } from 'electron';
import { commandBarSetup } from '../commands/CommandBar';
import { typedIpcMain } from '../ipc';

jest.mock('electron', () => {
  const { EventEmitter } = require('events');
  return {
    app: { isPackaged: true },
    BrowserWindow: jest.fn().mockImplementation(() => {
      const win = Object.assign(new EventEmitter(), {
        webContents: { insertCSS: jest.fn() },
        loadURL: jest.fn(),
        isDestroyed: jest.fn(() => false),
      });
      win.destroy = jest.fn(() => {
        win.isDestroyed.mockReturnValue(true);
        win.emit('closed');
      });
      return win;
    }),
  };
});
jest.mock('../ipc', () => ({ typedIpcMain: { on: jest.fn(() => jest.fn()) } }));
jest.mock('../IpcAuthorization', () => ({ authorizeIpcRenderer: jest.fn() }));
jest.mock('../util', () => ({
  resolveHtmlPath: () => 'file:///commandBar.html',
}));
jest.mock('../TabManager', () => ({ TabManager: {} }));

it('destroys the prewarmed window and IPC listener before owner reopen', () => {
  const dispose = commandBarSetup();
  const first = (BrowserWindow as unknown as jest.Mock).mock.results[0].value;
  const unsubscribe = (typedIpcMain.on as jest.Mock).mock.results[0].value;
  dispose();
  expect(first.destroy).toHaveBeenCalledTimes(1);
  expect(unsubscribe).toHaveBeenCalledTimes(1);
  const disposeSecond = commandBarSetup();
  expect(BrowserWindow).toHaveBeenCalledTimes(2);
  disposeSecond();
});
