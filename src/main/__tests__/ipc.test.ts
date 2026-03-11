const mockOn = jest.fn();
const mockOnce = jest.fn();
const mockRemoveListener = jest.fn();
const mockSend = jest.fn();

jest.mock('electron', () => ({
  ipcMain: {
    on: mockOn,
    once: mockOnce,
    removeListener: mockRemoveListener,
  },
}));

import { typedIpcMain, typedWebContents } from '../ipc';

describe('typedIpcMain', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers a listener with ipcMain.on', () => {
    const listener = jest.fn();
    typedIpcMain.on('request-tab-meta', listener);
    expect(mockOn).toHaveBeenCalledWith('request-tab-meta', expect.any(Function));
  });

  it('forwards events to the typed listener', () => {
    const listener = jest.fn();
    typedIpcMain.on('request-tab-meta', listener);

    // Simulate ipcMain calling the wrapper
    const wrapper = mockOn.mock.calls[0][1];
    const fakeEvent = { sender: {} };
    wrapper(fakeEvent);
    expect(listener).toHaveBeenCalledWith(fakeEvent);
  });

  it('registers a one-time listener with ipcMain.once', () => {
    const listener = jest.fn();
    typedIpcMain.once('request-tab-meta', listener);
    expect(mockOnce).toHaveBeenCalledWith('request-tab-meta', expect.any(Function));
  });

  it('removes a listener via ipcMain.removeListener', () => {
    const listener = jest.fn();
    typedIpcMain.removeListener('request-tab-meta', listener);
    expect(mockRemoveListener).toHaveBeenCalledWith('request-tab-meta', listener);
  });
});

describe('typedWebContents', () => {
  it('sends a message on the given channel', () => {
    const fakeWebContents = { send: mockSend } as any;
    const typed = typedWebContents(fakeWebContents);

    typed.send('update-tab-meta', {
      currentTabUuid: 'abc',
      tabs: [],
    });

    expect(mockSend).toHaveBeenCalledWith('update-tab-meta', {
      currentTabUuid: 'abc',
      tabs: [],
    });
  });
});
