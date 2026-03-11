const mockSend = jest.fn();
const mockOn = jest.fn();
const mockOnce = jest.fn();
const mockRemoveListener = jest.fn();
const mockExposeInMainWorld = jest.fn();

jest.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: mockExposeInMainWorld,
  },
  ipcRenderer: {
    send: mockSend,
    on: mockOn,
    once: mockOnce,
    removeListener: mockRemoveListener,
  },
}));

// Importing the module triggers contextBridge.exposeInMainWorld at the top level
import '../preload';

// Capture the handler before any beforeEach can clear the mock call history
const handler = mockExposeInMainWorld.mock.calls[0][1];

describe('preload', () => {
  it('calls contextBridge.exposeInMainWorld with "electron" and the handler', () => {
    expect(mockExposeInMainWorld).toHaveBeenCalledTimes(1);
    expect(mockExposeInMainWorld).toHaveBeenCalledWith('electron', handler);
  });

  describe('electronHandler', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('sendMessage', () => {
      it('delegates to ipcRenderer.send with channel and args', () => {
        handler.ipcRenderer.sendMessage('open-new-tab', {
          newUrl: 'https://example.com',
        });
        expect(mockSend).toHaveBeenCalledWith('open-new-tab', {
          newUrl: 'https://example.com',
        });
      });
    });

    describe('on', () => {
      it('registers a listener via ipcRenderer.on and returns an unsubscribe function', () => {
        const callback = jest.fn();

        const unsubscribe = handler.ipcRenderer.on(
          'update-tab-meta',
          callback,
        );

        expect(mockOn).toHaveBeenCalledWith(
          'update-tab-meta',
          expect.any(Function),
        );
        expect(typeof unsubscribe).toBe('function');
      });

      it('forwards event args to the provided callback', () => {
        const callback = jest.fn();

        handler.ipcRenderer.on('update-tab-meta', callback);

        // Grab the internal subscription wrapper passed to ipcRenderer.on
        const subscription = mockOn.mock.calls[0][1];
        const fakeEvent = {};
        const fakePayload = { currentTabUuid: 'abc', tabs: [] };

        subscription(fakeEvent, fakePayload);

        expect(callback).toHaveBeenCalledWith(fakePayload);
      });

      it('removes the listener when the unsubscribe function is called', () => {
        const callback = jest.fn();

        const unsubscribe = handler.ipcRenderer.on(
          'update-tab-meta',
          callback,
        );

        // Grab the exact subscription reference that was registered
        const subscription = mockOn.mock.calls[0][1];

        unsubscribe();

        expect(mockRemoveListener).toHaveBeenCalledWith(
          'update-tab-meta',
          subscription,
        );
      });
    });

    describe('once', () => {
      it('delegates to ipcRenderer.once', () => {
        const callback = jest.fn();

        handler.ipcRenderer.once('update-tab-meta', callback);

        expect(mockOnce).toHaveBeenCalledWith(
          'update-tab-meta',
          expect.any(Function),
        );
      });

      it('forwards event args to the provided callback', () => {
        const callback = jest.fn();

        handler.ipcRenderer.once('update-tab-meta', callback);

        // Grab the wrapper passed to ipcRenderer.once
        const wrapper = mockOnce.mock.calls[0][1];
        const fakeEvent = {};
        const fakePayload = { currentTabUuid: 'abc', tabs: [] };

        wrapper(fakeEvent, fakePayload);

        expect(callback).toHaveBeenCalledWith(fakePayload);
      });
    });
  });
});
