import { globalShortcut } from 'electron';
import { spawnCommandBarUI } from './commands/CommandBar';

let currentCommandBarShortcut: string | null = null;

const commandBarHandler = () => {
  spawnCommandBarUI();
};

export const registerGlobalShortcuts = (
  shortcut = 'CommandOrControl+Shift+T',
) => {
  currentCommandBarShortcut = shortcut;
  const ret = globalShortcut.register(shortcut, commandBarHandler);
  if (!ret) {
    console.log('registration failed for shortcut:', shortcut);
  }
};

export const rebindCommandBarShortcut = (newShortcut: string) => {
  if (currentCommandBarShortcut) {
    globalShortcut.unregister(currentCommandBarShortcut);
  }
  currentCommandBarShortcut = newShortcut;
  const ret = globalShortcut.register(newShortcut, commandBarHandler);
  if (!ret) {
    console.log('Failed to register shortcut:', newShortcut);
  }
};

export const unregisterGlobalShortcuts = () => {
  globalShortcut.unregisterAll();
};
