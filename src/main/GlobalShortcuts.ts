import { globalShortcut } from 'electron';

export const registerGlobalShortcuts = () => {
  const ret = globalShortcut.register('CommandOrControl+X', () => {
    console.log('CommandOrControl+X is pressed');
  });

  if (!ret) {
    console.log('registration failed');
  }
};

export const unregisterGlobalShortcuts = () => {
  globalShortcut.unregisterAll();
};
