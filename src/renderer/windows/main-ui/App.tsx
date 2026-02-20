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
import { createContext, useEffect, useState } from 'react';
import { BrowserUI } from '../../components/BrowserUI';
import { TabManagerIpc } from '../../../ipc';
import { SettingsProvider } from '@/lib/settings';

export const TabMetaContext = createContext<TabManagerIpc | null>(null);

function Main() {
  const [tabMeta, setTabMeta] = useState<TabManagerIpc | null>(null);

  useEffect(() => {
    window.electron.ipcRenderer.on('update-tab-meta', (args) => {
      setTabMeta(args);
    });

    window.electron.ipcRenderer.sendMessage('update-tab-meta');
  }, []);

  return (
    <SettingsProvider>
      <TabMetaContext.Provider value={tabMeta}>
        <BrowserUI />
      </TabMetaContext.Provider>
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
