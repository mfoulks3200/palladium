import { ReactNode } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SettingsProvider } from '@/lib/settings';
import { DesignTokenProvider } from '@/hooks/use-design-tokens';
import { ThemeProvider } from '@/components/ThemeProvider';

interface CoreProvidersProps {
  children: ReactNode;
}

export function CoreProviders({ children }: CoreProvidersProps) {
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
            {children}
          </ThemeProvider>
        </DesignTokenProvider>
      </SettingsProvider>
    </ErrorBoundary>
  );
}
