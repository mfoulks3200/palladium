import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import '@fontsource/inter/100';
import '@fontsource/inter/200';
import '@fontsource/inter/400';
import '@fontsource/inter/500';
import '@fontsource/inter/800';
import './App.css';
import './globals.css';
import { ThemeProvider } from '../../components/ThemeProvider';
import { createContext, useCallback, useEffect, useState } from 'react';
import { OverlayPortal } from '../../components/PortalOverlay';
import { CommandBar } from '../../components/CommandBar';
import { BrowserUI } from '../../components/BrowserUI';
import { TabManagerIpc } from '../../../ipc';

export const CommandBarContext = createContext<
  (tabUuid: string, prefill?: string) => void
>(() => {});
export const TabMetaContext = createContext<TabManagerIpc | null>(null);

function Main() {
  const [showingCommandBar, setShowingCommandBar] = useState(false);
  const [commandBarTabUuid, setCommandBarTabUuid] = useState('new');
  const [commandPrefill, setCommandPrefill] = useState('');
  const [tabMeta, setTabMeta] = useState<TabManagerIpc | null>(null);

  useEffect(() => {
    window.electron.ipcRenderer.on('update-tab-meta', (args) => {
      setTabMeta(args);
    });

    window.electron.ipcRenderer.sendMessage('update-tab-meta');
  }, []);

  const openCommandBar = useCallback(
    (tabUuid: string, prefill?: string) => {
      if (prefill) {
        setCommandPrefill(prefill);
      }
      setCommandBarTabUuid(tabUuid);
      setShowingCommandBar(true);
    },
    [showingCommandBar, setShowingCommandBar],
  );

  return (
    <TabMetaContext.Provider value={tabMeta}>
      <CommandBarContext.Provider value={openCommandBar}>
        <BrowserUI />
        <div className="pointer-events-none absolute top-0 left-0 z-0 flex h-full w-full items-center justify-center">
          {showingCommandBar && (
            <OverlayPortal
              className="h-1/3 w-2xl"
              onBlur={() => {
                console.log('Command bar closed');
                setShowingCommandBar(false);
              }}
            >
              <CommandBar
                prefill={commandPrefill}
                tabUuid={commandBarTabUuid}
                className="h-full w-full max-w-full"
              />
            </OverlayPortal>
          )}
        </div>
      </CommandBarContext.Provider>
    </TabMetaContext.Provider>
  );
}

export default function App() {
  useEffect(() => {
    const resizeListener = () => {
      window.electron.ipcRenderer.sendMessage('app-resize', {
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    addEventListener('resize', resizeListener);

    return () => {
      removeEventListener('resize', resizeListener);
    };
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <Router>
        <Routes>
          <Route path="/" element={<Main />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}
