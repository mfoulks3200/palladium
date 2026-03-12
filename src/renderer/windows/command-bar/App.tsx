import { CommandBar } from '@/components/CommandBar';
import '../globals.css';
import '@fontsource/inter/100';
import '@fontsource/inter/200';
import '@fontsource/inter/400';
import '@fontsource/inter/500';
import '@fontsource/inter/800';
import './App.css';
import { ThemeProvider } from '@/hooks/ThemeProvider';
import { SettingsProvider } from '@/hooks/settings';
import { DesignTokenProvider } from '@/hooks/use-design-tokens';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useEffect, useState } from 'react';

export const App = () => {
  const [visible, setVisible] = useState(
    document.visibilityState === 'visible',
  );

  useEffect(() => {
    const handleVisibility = () =>
      setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', handleVisibility);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  return (
    <ErrorBoundary>
      <SettingsProvider>
        <DesignTokenProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {visible ? (
              <CommandBar className="h-full max-h-full min-h-full w-full max-w-full min-w-full" />
            ) : (
              <></>
            )}
          </ThemeProvider>
        </DesignTokenProvider>
      </SettingsProvider>
    </ErrorBoundary>
  );
};
