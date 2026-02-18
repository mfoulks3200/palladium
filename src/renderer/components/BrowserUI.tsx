import { Dog } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Card } from './ui/card';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from './ui/resizable';
import { RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { OverlayOptions } from '../../ipc';
import { Anvil } from 'lucide-react';
import { InternalPageRouter } from './internal-pages/InternalPageRouter';

export const BrowserUI = () => {
  const browserPanelRef = useRef<HTMLDivElement>(null);

  const onResize = useCallback(() => {
    if (browserPanelRef.current) {
      const rect = browserPanelRef.current.getBoundingClientRect();
      window.electron.ipcRenderer.sendMessage('browser-layout-change', {
        position: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        },
      } as OverlayOptions);
    }
  }, [browserPanelRef.current]);

  useEffect(() => {
    window.electron.ipcRenderer.on('browser-layout-change', () => {
      onResize();
    });

    const resizeObserver = new ResizeObserver((entries) => {
      onResize();
    });

    if (browserPanelRef.current) {
      browserPanelRef.current.addEventListener('resize', onResize);
      resizeObserver.observe(browserPanelRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [browserPanelRef.current]);

  return (
    <div className="h-full p-3">
      <ResizablePanelGroup orientation="horizontal" onLayoutChange={onResize}>
        <ResizablePanel defaultSize="250px" maxSize="400px" minSize="200px">
          <Sidebar />
        </ResizablePanel>
        <ResizableHandle className="mx-1 w-1 rounded-sm border-none bg-transparent transition-colors after:hidden after:border-none hover:bg-black/50" />
        <ResizablePanel minSize="30%">
          <BrowserBackgroundPanel ref={browserPanelRef} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

const BrowserBackgroundPanel = ({
  ref,
}: {
  ref: RefObject<HTMLDivElement | null>;
}) => {
  const [internalPageUrl, setInternalPageUrl] = useState('');

  useEffect(() => {
    window.electron.ipcRenderer.on('internal-page-navigate', (response) => {
      setInternalPageUrl(response.newPath);
    });
  }, []);

  return (
    <Card
      className="flex h-full grow items-center justify-center overflow-hidden bg-black/75 py-0 drop-shadow-md backdrop-blur-sm backdrop-saturate-200"
      ref={ref}
    >
      {internalPageUrl.trim().length > 0 && (
        <InternalPageRouter path={internalPageUrl} />
      )}
    </Card>
  );
};
