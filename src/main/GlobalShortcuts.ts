import { globalShortcut } from 'electron';
import { spawnCommandBarUI } from './commands/CommandBar';

let currentCommandBarShortcut: string | null = null;
const commandBarHandler = () => {
  spawnCommandBarUI();
};

export const rebindCommandBarShortcut = (newShortcut: string): boolean => {
  if (newShortcut === currentCommandBarShortcut) return true;
  try {
    if (!globalShortcut.register(newShortcut, commandBarHandler)) return false;
  } catch (error) {
    console.error('Failed to register shortcut:', error);
    return false;
  }
  if (currentCommandBarShortcut)
    globalShortcut.unregister(currentCommandBarShortcut);
  currentCommandBarShortcut = newShortcut;
  return true;
};

export const registerGlobalShortcuts = (
  shortcut = 'CommandOrControl+Shift+T',
) => {
  if (!rebindCommandBarShortcut(shortcut))
    console.error('Failed to register shortcut:', shortcut);
};

export const unregisterGlobalShortcuts = () => {
  globalShortcut.unregisterAll();
  currentCommandBarShortcut = null;
};
