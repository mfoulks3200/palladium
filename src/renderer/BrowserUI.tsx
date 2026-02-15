import { Dog } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Card } from './components/ui/card';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from './components/ui/resizable';
import { RefObject, useCallback, useEffect, useRef } from 'react';
import { OverlayOptions } from 'src/ipc/Overlay';
import { Anvil } from 'lucide-react';

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
    window.electron.ipcRenderer.on(
      'browser-layout-change',
      // @ts-expect-error
      (args: unknown[]) => {
        onResize();
      },
    );

    if (browserPanelRef.current) {
      browserPanelRef.current.addEventListener('resize', onResize);
    }

    return () => {
      if (browserPanelRef.current) {
        browserPanelRef.current.removeEventListener('resize', onResize);
      }
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
  return (
    <Card
      className="flex h-full grow items-center justify-center bg-black/75 p-2 drop-shadow-md backdrop-blur-sm backdrop-saturate-200"
      ref={ref}
    >
      <div className="flex h-full grow flex-col items-center justify-center opacity-25 select-none">
        <Anvil size={256} strokeWidth={0.33} />
        <div className="text-8xl font-light">Palladium</div>
        <div className="text-xl">
          The browser purpose-built to get out of your way.
        </div>
      </div>
    </Card>
  );
};
