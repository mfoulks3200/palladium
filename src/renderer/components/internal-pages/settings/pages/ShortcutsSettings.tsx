import { useContext, useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { SettingsContext } from '@/hooks/settings';
import { SettingsOption } from '../SettingComponents';
import { cn } from '@/lib/utils';

/**
 * Convert a browser KeyboardEvent into an Electron accelerator string.
 * Returns null if the event is a lone modifier key press (not a valid shortcut).
 */
const buildAccelerator = (e: KeyboardEvent): string | null => {
  const MODIFIER_KEYS = ['Meta', 'Control', 'Shift', 'Alt'];
  if (MODIFIER_KEYS.includes(e.key)) return null;

  const parts: string[] = [];

  // Map metaKey (Mac Cmd) or ctrlKey (Win/Linux Ctrl) → CommandOrControl
  if (e.metaKey || e.ctrlKey) parts.push('CommandOrControl');
  if (e.shiftKey) parts.push('Shift');
  if (e.altKey) parts.push('Alt');

  // Must have at least one modifier
  if (parts.length === 0) return null;

  const KEY_MAP: Record<string, string> = {
    ' ': 'Space',
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    Enter: 'Return',
    Escape: 'Escape',
    Backspace: 'Backspace',
    Delete: 'Delete',
    Tab: 'Tab',
  };

  const mapped =
    KEY_MAP[e.key] ?? (e.key.length === 1 ? e.key.toUpperCase() : e.key);
  parts.push(mapped);

  return parts.join('+');
};

const formatAccelerator = (acc: string): string => {
  return acc
    .split('+')
    .map((part) => {
      const labels: Record<string, string> = {
        CommandOrControl: '⌘/Ctrl',
        Command: '⌘',
        Control: 'Ctrl',
        Shift: '⇧ Shift',
        Alt: '⌥ Alt',
        Return: '↩',
        Escape: 'Esc',
        Backspace: '⌫',
        Delete: 'Del',
        Space: 'Space',
        Up: '↑',
        Down: '↓',
        Left: '←',
        Right: '→',
      };
      return labels[part] ?? part;
    })
    .join(' + ');
};

export const ShortcutsSettings = () => {
  const { useSetting } = useContext(SettingsContext);
  const [commandBarShortcut, setCommandBarShortcut] = useSetting(
    'shortcuts.commandBar',
  );
  const [recording, setRecording] = useState(false);
  const [pendingShortcut, setPendingShortcut] = useState<string | null>(null);
  const recorderRef = useRef<HTMLDivElement>(null);

  // Keep a ref to the setter so confirmShortcut doesn't need it as a dep.
  // useSetting returns a new arrow function on every render, which would
  // otherwise make confirmShortcut (and the keydown useEffect) re-create
  // on every render.
  const setCommandBarShortcutRef = useRef(setCommandBarShortcut);
  useLayoutEffect(() => {
    setCommandBarShortcutRef.current = setCommandBarShortcut;
  });

  const startRecording = () => {
    setRecording(true);
    setPendingShortcut(null);
    // Focus the recorder div so keydown events land there
    setTimeout(() => recorderRef.current?.focus(), 0);
  };

  const confirmShortcut = useCallback(() => {
    if (pendingShortcut) {
      setCommandBarShortcutRef.current(pendingShortcut);
    }
    setRecording(false);
    setPendingShortcut(null);
  }, [pendingShortcut]);

  const cancelRecording = useCallback(() => {
    setRecording(false);
    setPendingShortcut(null);
  }, []);

  useEffect(() => {
    if (!recording) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        cancelRecording();
        return;
      }
      if (e.key === 'Enter' && pendingShortcut) {
        confirmShortcut();
        return;
      }

      const accelerator = buildAccelerator(e);
      if (accelerator) {
        setPendingShortcut(accelerator);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [recording, pendingShortcut, confirmShortcut, cancelRecording]);

  return (
    <SettingsOption
      name="Command Bar"
      description="Global shortcut to open the command bar from anywhere on your system."
    >
      {recording ? (
        <div
          ref={recorderRef}
          tabIndex={0}
          className="flex items-center gap-2 outline-none"
        >
          <kbd
            className={cn(
              'flex min-w-32 items-center justify-center rounded-md border px-3 py-1.5 text-sm font-mono',
              'border-white/30 bg-white/10',
              pendingShortcut ? 'text-white' : 'animate-pulse text-white/40',
            )}
          >
            {pendingShortcut
              ? formatAccelerator(pendingShortcut)
              : 'Press keys…'}
          </kbd>
          <button
            onClick={confirmShortcut}
            disabled={!pendingShortcut}
            className={cn(
              'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
              'bg-white/15 hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-30',
            )}
          >
            Save
          </button>
          <button
            onClick={cancelRecording}
            className="rounded-md px-2.5 py-1 text-xs font-medium transition-colors bg-white/5 hover:bg-white/15"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={startRecording}
          title="Click to record a new shortcut"
          className={cn(
            'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-mono transition-colors',
            'border-white/20 bg-white/5 hover:bg-white/15',
          )}
        >
          {formatAccelerator(commandBarShortcut)}
        </button>
      )}
    </SettingsOption>
  );
};
