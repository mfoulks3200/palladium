import { Dog } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Card } from './ui/card';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from './ui/resizable';
import {
  PropsWithChildren,
  RefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { OverlayOptions } from '../../ipc';
import { InternalPageRouter } from './internal-pages/InternalPageRouter';

import styles from './BrowserUI.module.css';
import { cn } from '@/lib/utils';
import { TabMetaContext } from '@/windows/main-ui/App';
import { ShaderBackground } from './ShaderBackground';

export const BrowserUI = () => {
  const tabMeta = useContext(TabMetaContext);

  const currentTab = tabMeta?.tabs.find(
    (tab) => tab.uuid === tabMeta.currentTabUuid,
  );
  const isShowingDevtools = currentTab?.isDevMode ?? false;

  console.log(currentTab);
  const browserPanelRef = useRef<HTMLDivElement>(null);
  const devtoolsPanelRef = useRef<HTMLDivElement>(null);

  const onBrowserResize = useCallback(() => {
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

  const onDevtoolsResize = useCallback(() => {
    if (devtoolsPanelRef.current && isShowingDevtools) {
      const rect = devtoolsPanelRef.current.getBoundingClientRect();
      window.electron.ipcRenderer.sendMessage('devtools-layout-change', {
        position: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        },
      } as OverlayOptions);
    }
  }, [devtoolsPanelRef.current, isShowingDevtools]);

  useEffect(() => {
    window.electron.ipcRenderer.on('browser-layout-change', () => {
      onBrowserResize();
    });

    window.electron.ipcRenderer.on('devtools-layout-change', () => {
      onDevtoolsResize();
    });

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === browserPanelRef.current) {
          onBrowserResize();
        }
        if (
          devtoolsPanelRef.current &&
          entry.target === devtoolsPanelRef.current
        ) {
          onDevtoolsResize();
        }
      }
    });

    if (browserPanelRef.current) {
      // browserPanelRef.current.addEventListener('resize', onBrowserResize);
      resizeObserver.observe(browserPanelRef.current);
    }
    if (devtoolsPanelRef.current) {
      // browserPanelRef.current.addEventListener('resize', onBrowserResize);
      resizeObserver.observe(devtoolsPanelRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [browserPanelRef.current, devtoolsPanelRef.current]);

  const browserBackgroundPanel = (
    <BrowserBackgroundPanel ref={browserPanelRef} />
  );

  let browserPanel = <></>;
  if (isShowingDevtools) {
    const isVertical = true;
    browserPanel = (
      <ResizablePanelGroup
        orientation={isVertical ? 'vertical' : 'horizontal'}
        onLayoutChange={onBrowserResize}
      >
        <ResizablePanel defaultSize="60%" minSize="20%">
          {browserBackgroundPanel}
        </ResizablePanel>
        <ResizableHandle
          className={cn(
            'rounded-sm border-none bg-transparent transition-colors after:hidden after:border-none hover:bg-black/50',
            {
              ['my-0.5 min-h-1 w-full']: isVertical,
              ['mx-0.5 h-full min-w-1']: !isVertical,
            },
          )}
        />
        <ResizablePanel minSize="20%">
          <BrowserPanel ref={devtoolsPanelRef}></BrowserPanel>
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  } else {
    browserPanel = browserBackgroundPanel;
  }

  return (
    <div className="h-screen max-h-screen w-screen max-w-screen">
      <div className="absolute h-full w-full">
        <ShaderBackground />
      </div>
      <div className={cn('h-full w-full p-2 px-2', styles.draggableFrame)}>
        <ResizablePanelGroup
          orientation="horizontal"
          onLayoutChange={onBrowserResize}
        >
          <ResizablePanel defaultSize="250px" maxSize="400px" minSize="200px">
            <Sidebar />
          </ResizablePanel>
          <ResizableHandle className="mx-0.5 w-1 rounded-sm border-none bg-transparent transition-colors after:hidden after:border-none hover:bg-black/50" />
          <ResizablePanel minSize="30%">{browserPanel}</ResizablePanel>
        </ResizablePanelGroup>
      </div>
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
    <BrowserPanel ref={ref}>
      {internalPageUrl.trim().length > 0 && (
        <InternalPageRouter path={internalPageUrl} />
      )}
    </BrowserPanel>
  );
};

const BrowserPanel = ({
  ref,
  children,
}: PropsWithChildren<{
  ref?: RefObject<HTMLDivElement | null>;
}>) => {
  return (
    <Card
      className="flex h-full grow items-center justify-center overflow-hidden bg-black/75 py-0 drop-shadow-md backdrop-blur-sm backdrop-saturate-200"
      ref={ref}
    >
      {children}
    </Card>
  );
};
