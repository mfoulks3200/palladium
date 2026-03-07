import { createRoot } from 'react-dom/client';
import { App } from './App';

// ---------------------------------------------------------------------------
// Global exception handlers — forward to Main process via IPC
// ---------------------------------------------------------------------------

window.onerror = (_msg, _source, _line, _col, error) => {
  window.electron.ipcRenderer.sendMessage('capture-exception', {
    message: error?.message ?? String(_msg),
    stack: error?.stack ?? '',
    name: error?.name ?? 'Error',
    source: 'renderer-command-bar',
  });
};

window.onunhandledrejection = (event: PromiseRejectionEvent) => {
  const { reason } = event;
  window.electron.ipcRenderer.sendMessage('capture-exception', {
    message: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? (reason.stack ?? '') : '',
    name: reason instanceof Error ? reason.name : 'UnhandledRejection',
    source: 'renderer-command-bar',
  });
};

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);
root.render(<App />);
