const mockMenu = { popup: jest.fn() };

jest.mock('electron', () => ({
  app: {
    quit: jest.fn(),
  },
  Menu: {
    buildFromTemplate: jest.fn(() => mockMenu),
    setApplicationMenu: jest.fn(),
  },
  shell: {
    openExternal: jest.fn(),
  },
  BrowserWindow: jest.fn(),
}));

jest.mock('../TabManager', () => ({
  TabManager: {
    getInstance: jest.fn(() => ({
      getAllTabs: jest.fn(() => []),
      focusTab: jest.fn(),
    })),
  },
}));

jest.mock('../Tab', () => ({
  Tab: jest.fn().mockImplementation((url: string) => ({
    getCurrentUrl: jest.fn(() => url),
  })),
}));

import MenuBuilder from '../menu';
import { Menu } from 'electron';

function createMockBrowserWindow() {
  return {
    webContents: {
      on: jest.fn(),
      reload: jest.fn(),
      toggleDevTools: jest.fn(),
      openDevTools: jest.fn(),
      inspectElement: jest.fn(),
    },
    setFullScreen: jest.fn(),
    isFullScreen: jest.fn(() => false),
    close: jest.fn(),
  } as any;
}

describe('MenuBuilder', () => {
  const originalPlatform = process.platform;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'production';
    process.env.DEBUG_PROD = 'false';
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  it('calls buildMenu in the constructor', () => {
    const spy = jest.spyOn(MenuBuilder.prototype, 'buildMenu');
    const win = createMockBrowserWindow();
    new MenuBuilder(win);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('calls Menu.buildFromTemplate and Menu.setApplicationMenu', () => {
    const win = createMockBrowserWindow();
    new MenuBuilder(win);
    expect(Menu.buildFromTemplate).toHaveBeenCalled();
    expect(Menu.setApplicationMenu).toHaveBeenCalledWith(mockMenu);
  });

  describe('darwin template', () => {
    it('has expected top-level menu labels', () => {
      const win = createMockBrowserWindow();
      const builder = new MenuBuilder(win);
      const template = builder.buildDarwinTemplate();
      const labels = template.map((item) => item.label);
      expect(labels).toEqual([
        'Palladium',
        'Edit',
        'View',
        'Window',
        'Help',
      ]);
    });
  });

  describe('default template', () => {
    it('has expected top-level menu labels', () => {
      const win = createMockBrowserWindow();
      const builder = new MenuBuilder(win);
      const template = builder.buildDefaultTemplate();
      const labels = template.map((item) => item.label);
      expect(labels).toEqual(['&File', '&View', 'Help']);
    });
  });

  describe('development mode', () => {
    it('includes dev tools entries in darwin View menu', () => {
      process.env.NODE_ENV = 'development';
      const win = createMockBrowserWindow();
      const builder = new MenuBuilder(win);
      const template = builder.buildDarwinTemplate();
      const viewMenu = template.find((item) => item.label === 'View');
      const viewSubmenu = viewMenu?.submenu as any[];
      const submenuLabels = viewSubmenu.map((item: any) => item.label);
      expect(submenuLabels).toContain('Reload');
      expect(submenuLabels).toContain('Toggle Developer Tools');
    });

    it('includes dev tools entries in default View menu', () => {
      process.env.NODE_ENV = 'development';
      const win = createMockBrowserWindow();
      const builder = new MenuBuilder(win);
      const template = builder.buildDefaultTemplate();
      const viewMenu = template.find((item) => item.label === '&View');
      const viewSubmenu = viewMenu?.submenu as any[];
      const submenuLabels = viewSubmenu.map((item: any) => item.label);
      expect(submenuLabels).toContain('&Reload');
      expect(submenuLabels).toContain('Toggle &Developer Tools');
    });

    it('sets up context menu on webContents', () => {
      process.env.NODE_ENV = 'development';
      const win = createMockBrowserWindow();
      new MenuBuilder(win);
      expect(win.webContents.on).toHaveBeenCalledWith(
        'context-menu',
        expect.any(Function),
      );
    });
  });
});
