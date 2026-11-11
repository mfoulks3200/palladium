import { CommandBar } from '@/components/CommandBar';
import '../globals.css';
import '@fontsource/inter/100.css';
import '@fontsource/inter/200.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/800.css';
import './App.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { SettingsProvider } from '@/lib/settings';
import { DesignTokenProvider } from '@/hooks/use-design-tokens';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export const App = () => {
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
            <CommandBar className="h-full max-h-full min-h-full w-full max-w-full min-w-full" />
          </ThemeProvider>
        </DesignTokenProvider>
      </SettingsProvider>
    </ErrorBoundary>
  );
};
