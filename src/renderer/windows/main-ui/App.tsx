import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import '@fontsource/inter/100';
import '@fontsource/inter/200';
import '@fontsource/inter/300';
import '@fontsource/inter/400';
import '@fontsource/inter/500';
import '@fontsource/inter/600';
import '@fontsource/inter/700';
import '@fontsource/inter/800';
import './App.css';
import '../globals.css';
import { ThemeProvider } from '../../components/ThemeProvider';
import {
  createContext,
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { BrowserUI } from '../../components/BrowserUI';
import { TabManagerIpc } from '../../../ipc';
import { SettingsProvider } from '@/lib/settings';
import { FeatureFlagProvider } from '@/lib/feature-flags';
import { SystemMetaProvider } from '@/lib/system-meta';
import { DesignTokenProvider } from '../../hooks/use-design-tokens';
import { ErrorBoundary } from '../../components/ErrorBoundary';

interface InternalTabMetaItem {
  title: string;
  icon: ReactElement;
}

interface InternalTabMeta {
  tabs: Record<string, InternalTabMetaItem>;
  setTabMeta: (meta: InternalTabMetaItem, tabId?: string) => void;
}

export const TabMetaContext = createContext<TabManagerIpc | null>(null);
export const InternalTabMetaContext = createContext<InternalTabMeta | null>(
  null,
);

function Main() {
  const [tabMeta, setTabMeta] = useState<TabManagerIpc | null>(null);
  const [internalTabMeta, setInternalTabMeta] = useState<
    Record<string, InternalTabMetaItem>
  >({});

  useEffect(() => {
    window.electron.ipcRenderer.on('update-tab-meta', (args) => {
      setTabMeta(args);
    });

    window.electron.ipcRenderer.sendMessage('update-tab-meta');
  }, []);

  const tabMetaRef = useRef(tabMeta);
  tabMetaRef.current = tabMeta;

  const setTabMetaItem = useCallback(
    (meta: InternalTabMetaItem, tabId?: string) => {
      setInternalTabMeta((oldMeta) => {
        const currentTabMeta = tabMetaRef.current;
        if (tabId || (currentTabMeta && currentTabMeta?.currentTabUuid)) {
          return {
            ...oldMeta,
            [(tabId ?? currentTabMeta!.currentTabUuid)!]: meta,
          };
        } else {
          return oldMeta;
        }
      });
    },
    [],
  );

  const internalTabMetaValue = useMemo(
    () => ({
      tabs: internalTabMeta,
      setTabMeta: setTabMetaItem,
    }),
    [internalTabMeta, setTabMetaItem],
  );

  return (
    <SettingsProvider>
      <FeatureFlagProvider>
        <SystemMetaProvider>
          <DesignTokenProvider>
            <TabMetaContext.Provider value={tabMeta}>
              <InternalTabMetaContext.Provider value={internalTabMetaValue}>
                <BrowserUI />
              </InternalTabMetaContext.Provider>
            </TabMetaContext.Provider>
          </DesignTokenProvider>
        </SystemMetaProvider>
      </FeatureFlagProvider>
    </SettingsProvider>
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
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}
