import { WebContentsView } from 'electron';
import { Tab } from '../Tab';

jest.mock('electron', () => {
  const { EventEmitter } = require('events');
  return {
    session: {
      fromPath: () => ({
        setPermissionCheckHandler: jest.fn(),
        setPermissionRequestHandler: jest.fn(),
      }),
    },
    WebContentsView: jest.fn().mockImplementation(() => {
      const contents = Object.assign(new EventEmitter(), {
        isDestroyed: jest.fn(() => false),
      });
      contents.close = jest.fn(() => {
        contents.isDestroyed.mockReturnValue(true);
        contents.emit('destroyed');
      });
      return { webContents: contents };
    }),
  };
});
jest.mock('../HistoryManager', () => ({ HistoryManager: {} }));
jest.mock('../AnalyticsManager', () => ({ AnalyticsManager: {} }));

it('destroys page and devtools exactly once without recreating devtools', () => {
  const tab = new Tab('palladium://settings');
  tab.addMediaState({ id: 'audio' } as any);
  tab.destroyTab();
  tab.destroyTab();
  expect(tab.view.webContents.close).toHaveBeenCalledTimes(1);
  expect(tab.devToolsView.webContents.close).toHaveBeenCalledTimes(1);
  expect(WebContentsView).toHaveBeenCalledTimes(2);
  expect(tab.getMediaStates()).toEqual([]);
});
