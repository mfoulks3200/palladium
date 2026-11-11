import { EventEmitter } from 'events';

jest.mock('electron', () => {
  const { EventEmitter: Emitter } = require('events');
  return {
    app: Object.assign(new Emitter(), {
      commandLine: { appendSwitch: jest.fn() },
      whenReady: () => Promise.resolve(),
    }),
  };
});
jest.mock('../BrowserWindowUI', () => ({
  BrowserWindowUI: jest.fn().mockImplementation(() => {
    const { EventEmitter: Emitter } = require('events');
    return {
      mainWindow: Object.assign(new Emitter(), {
        show: jest.fn(),
        focus: jest.fn(),
        isMinimized: () => true,
        restore: jest.fn(),
      }),
    };
  }),
}));
jest.mock('../GlobalShortcuts', () => ({
  unregisterGlobalShortcuts: jest.fn(),
}));
jest.mock('../AnalyticsManager', () => ({
  AnalyticsManager: { getInstance: jest.fn() },
}));

it('reuses the actual owner on activation and recreates it only after close', async () => {
  const exceptions = process.listeners('uncaughtException');
  const rejections = process.listeners('unhandledRejection');
  const { app } = require('electron');
  const { BrowserWindowUI } = require('../BrowserWindowUI');
  require('../main');
  await Promise.resolve();
  expect(BrowserWindowUI).toHaveBeenCalledTimes(1);
  const first = BrowserWindowUI.mock.results[0].value
    .mainWindow as EventEmitter & any;
  app.emit('activate');
  expect(BrowserWindowUI).toHaveBeenCalledTimes(1);
  expect(first.restore).toHaveBeenCalled();
  expect(first.show).toHaveBeenCalled();
  expect(first.focus).toHaveBeenCalled();
  first.emit('closed');
  app.emit('activate');
  app.emit('activate');
  expect(BrowserWindowUI).toHaveBeenCalledTimes(2);
  for (const listener of process.listeners('uncaughtException'))
    if (!exceptions.includes(listener))
      process.removeListener('uncaughtException', listener);
  for (const listener of process.listeners('unhandledRejection'))
    if (!rejections.includes(listener))
      process.removeListener('unhandledRejection', listener);
});
