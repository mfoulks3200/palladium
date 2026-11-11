import { EventEmitter } from 'events';
import { BrowserWindow, dialog } from 'electron';
import { configureWebsitePermissions } from '../WebsitePermissions';

jest.mock('electron', () => ({
  BrowserWindow: { fromWebContents: jest.fn(), getAllWindows: jest.fn() },
  dialog: { showMessageBox: jest.fn() },
}));

let request: (...args: any[]) => void;
let check: (...args: any[]) => boolean;
let contents: any;
beforeEach(() => {
  jest.resetAllMocks();
  contents = Object.assign(new EventEmitter(), {
    getURL: jest.fn(() => 'https://one.test/page'),
    isDestroyed: jest.fn(() => false),
  });
  (BrowserWindow.fromWebContents as jest.Mock).mockReturnValue({
    isDestroyed: () => false,
  });
  configureWebsitePermissions({
    setPermissionRequestHandler: (fn: typeof request) => {
      request = fn;
    },
    setPermissionCheckHandler: (fn: typeof check) => {
      check = fn;
    },
  } as any);
});
const details = { requestingUrl: 'https://one.test/page' };
async function ask(permission = 'notifications', extra = {}) {
  const result = jest.fn();
  request(contents, permission, result, { ...details, ...extra });
  await Promise.resolve();
  return result;
}
it('denies checks and unknown, invalid and cross-origin requests by default', async () => {
  expect(check(contents, 'notifications', 'https://one.test', details)).toBe(
    false,
  );
  for (const [permission, extra] of [
    ['unknown', {}],
    ['notifications', { requestingUrl: 'file:///secret' }],
    ['notifications', { requestingUrl: 'https://other.test/' }],
  ] as const) {
    expect(await ask(permission, extra)).toHaveBeenCalledWith(false);
  }
  expect(dialog.showMessageBox).not.toHaveBeenCalled();
});
it('remembers explicit deny, and grants only the selected origin and capability', async () => {
  (dialog.showMessageBox as jest.Mock).mockResolvedValueOnce({ response: 0 });
  expect(await ask()).toHaveBeenCalledWith(false);
  expect(await ask()).toHaveBeenCalledWith(false);
  expect(dialog.showMessageBox).toHaveBeenCalledTimes(1);
  (dialog.showMessageBox as jest.Mock).mockResolvedValueOnce({ response: 1 });
  expect(await ask('media', { mediaTypes: ['audio'] })).toHaveBeenCalledWith(
    true,
  );
  expect(
    check(contents, 'media', 'https://one.test', {
      ...details,
      mediaType: 'audio',
    }),
  ).toBe(true);
  expect(
    check(contents, 'media', 'https://one.test', {
      ...details,
      mediaType: 'video',
    }),
  ).toBe(false);
  expect(
    check(contents, 'media', 'https://other.test', {
      requestingUrl: 'https://other.test/',
      mediaType: 'audio',
    }),
  ).toBe(false);
});
it('denies stale decisions and dialog failures', async () => {
  let resolve: (value: any) => void = () => {};
  (dialog.showMessageBox as jest.Mock).mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const result = jest.fn();
  request(contents, 'notifications', result, details);
  contents.getURL.mockReturnValue('https://two.test');
  resolve({ response: 1 });
  await Promise.resolve();
  expect(result).toHaveBeenCalledWith(false);
  contents.getURL.mockReturnValue('https://one.test/page');
  (dialog.showMessageBox as jest.Mock).mockRejectedValueOnce(
    new Error('closed'),
  );
  expect(await ask()).toHaveBeenCalledWith(false);
});

it('finds the real owning window of a tab view distinct from its chrome', async () => {
  (BrowserWindow.fromWebContents as jest.Mock).mockReturnValue(null);
  const parent = {
    contentView: { children: [{ webContents: contents }] },
    isDestroyed: () => false,
  };
  (BrowserWindow.getAllWindows as jest.Mock).mockReturnValue([parent]);
  (dialog.showMessageBox as jest.Mock).mockResolvedValue({ response: 1 });
  expect(await ask()).toHaveBeenCalledWith(true);
  expect(dialog.showMessageBox).toHaveBeenCalledWith(
    parent,
    expect.any(Object),
  );
});
