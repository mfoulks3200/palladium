import { CommandBar } from '@/components/CommandBar';
import '../globals.css';
import '@fontsource/inter/100';
import '@fontsource/inter/200';
import '@fontsource/inter/400';
import '@fontsource/inter/500';
import '@fontsource/inter/800';
import './App.css';
import { ThemeProvider } from '@/components/ThemeProvider';

export const App = () => {
  return (
    <>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <CommandBar className="h-full w-full max-w-full" />
      </ThemeProvider>
    </>
  );
};
