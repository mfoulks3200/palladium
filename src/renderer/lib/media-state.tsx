import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { MediaState, MediaStateIpc } from 'src/ipc';

interface MediaStateContextValue {
  mediaStates: Map<string, MediaState>;
}

const MediaStateContext = createContext<MediaStateContextValue>({
  mediaStates: new Map(),
});

export const MediaStateProvider = ({ children }: PropsWithChildren) => {
  const [mediaStates, setMediaStates] = useState<Map<string, MediaState>>(
    () => new Map(),
  );

  useEffect(() => {
    const removeListener = window.electron.ipcRenderer.on(
      'media-state',
      (message: MediaStateIpc) => {
        setMediaStates((prev) => {
          const next = new Map(prev);
          switch (message.action) {
            case 'add':
              next.set(message.state.id, message.state);
              break;
            case 'update': {
              const existing = next.get(message.state.id);
              if (existing) {
                next.set(message.state.id, { ...existing, ...message.state });
              }
              break;
            }
            case 'remove':
              next.delete(message.id);
              break;
          }
          return next;
        });
      },
    );

    return () => {
      removeListener();
    };
  }, []);

  return (
    <MediaStateContext.Provider value={{ mediaStates }}>
      {children}
    </MediaStateContext.Provider>
  );
};

export const useMediaStates = (): MediaState[] => {
  const { mediaStates } = useContext(MediaStateContext);
  return useMemo(() => [...mediaStates.values()], [mediaStates]);
};

export const useMediaState = (id: string): MediaState | undefined => {
  const { mediaStates } = useContext(MediaStateContext);
  return mediaStates.get(id);
};
