import { Component, ErrorInfo, PropsWithChildren, ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * A top-level React Error Boundary that catches render-phase exceptions and
 * forwards them to the Main process via IPC for PostHog exception tracking.
 *
 * Wrap this around the outermost component tree of each renderer window.
 */
export class ErrorBoundary extends Component<
  PropsWithChildren,
  ErrorBoundaryState
> {
  constructor(props: PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    window.electron.ipcRenderer.sendMessage('capture-exception', {
      message: error.message,
      stack: error.stack ?? '',
      name: error.name,
      source: 'renderer-react',
    });

    console.error('[ErrorBoundary] Caught render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full items-center justify-center p-8 text-center">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Something went wrong</h2>
            <p className="text-muted-foreground text-sm">
              An unexpected error occurred. Try reloading the window.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

interface ComponentErrorBoundaryProps {
  name?: string;
  fallback?: ReactNode;
}

/**
 * A granular error boundary for wrapping individual UI sections.
 * Crashes are isolated — the rest of the browser UI stays functional.
 */
export class ComponentErrorBoundary extends Component<
  PropsWithChildren<ComponentErrorBoundaryProps>,
  ErrorBoundaryState
> {
  constructor(props: PropsWithChildren<ComponentErrorBoundaryProps>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    window.electron.ipcRenderer.sendMessage('capture-exception', {
      message: error.message,
      stack: error.stack ?? '',
      name: error.name,
      source: `renderer-react:${this.props.name ?? 'unknown'}`,
    });

    console.error(
      `[ErrorBoundary:${this.props.name ?? 'unknown'}] Caught render error:`,
      error,
      info,
    );
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return null;
    }

    return this.props.children;
  }
}
