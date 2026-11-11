import {
  ChevronLeft,
  ChevronRight,
  Cog,
  Maximize2,
  Minus,
  Plus,
  RotateCw,
  X,
} from 'lucide-react';
import { BrowserTab } from './BrowserTab';
import { Button } from './ui/button';
import { Card } from './ui/card';

import {
  type CSSProperties,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { TabActionsIpc, TabManagerIpc } from '../../ipc';
import { InternalTabMetaContext, TabMetaContext } from '@/lib/tab-meta';
import {
  dropTargetForElements,
  monitorForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { getReorderDestinationIndex } from '@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index';

import { cn } from '@/lib/utils';
import styles from './BrowserUI.module.css';
import { useSystemMeta } from '@/lib/system-meta';
import { MediaWidget } from './MediaWidget';
import { ComponentErrorBoundary } from './ErrorBoundary';

const openCommandBar = (uuid?: string) => {
  window.electron.ipcRenderer.sendMessage('command-bar', {
    action: 'open',
    tabUuid: uuid,
  });
};

export const Sidebar = () => {
  const tabMeta = useContext(TabMetaContext);

  const scroller = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const dots = useRef<HTMLElement>(null);
  const activeSpace = tabMeta?.activeSpace;
  const spaceCount = tabMeta?.spaceCount;

  const [dragPreviews, setDragPreviews] = useState<
    TabManagerIpc['neighbors'][number][] | null
  >(null);
  const expanded = dragPreviews !== null;
  useLayoutEffect(() => {
    const selected = strip.current?.querySelector<HTMLElement>(
      '[aria-current="true"]',
    );
    if (scroller.current && selected)
      scroller.current.scrollLeft = selected.offsetLeft;
  }, [expanded]);

  useLayoutEffect(() => {
    const element = scroller.current;
    const panels = strip.current;
    if (!element || !panels || activeSpace === undefined) return;
    const selected = panels.querySelector<HTMLElement>('[aria-current="true"]');
    if (!selected) return;
    const nav = dots.current;
    const clearPreview = () => nav?.style.removeProperty('--swipe-space');
    const preview = () => {
      const distance = element.scrollLeft - selected.offsetLeft;
      const neighbor =
        distance > 0
          ? selected.nextElementSibling
          : selected.previousElementSibling;
      if (!distance || !(neighbor instanceof HTMLElement)) {
        clearPreview();
        return;
      }
      const stride = Math.abs(neighbor.offsetLeft - selected.offsetLeft);
      if (stride)
        nav?.style.setProperty(
          '--swipe-space',
          String(activeSpace + distance / stride),
        );
    };
    const align = () => {
      clearPreview();
      element.scrollLeft = selected.offsetLeft;
    };
    align();
    let width = element.clientWidth;
    const observer = new ResizeObserver(() => {
      if (element.clientWidth !== width) {
        width = element.clientWidth;
        align();
      }
    });
    observer.observe(element);

    const scrollToPanel = (panel: HTMLElement) => {
      const reducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;
      element.scrollTo({
        left: panel.offsetLeft,
        behavior: reducedMotion ? 'instant' : 'smooth',
      });
    };

    // Keep the source tab mounted until drop, even after the adjacent list slides in.
    let dragging = false;
    let dragVersion = 0;
    let previewPanel = selected;
    let edge = 0;
    let timer: number | undefined;
    const clearEdge = () => {
      window.clearTimeout(timer);
      edge = 0;
    };
    const advance = () => {
      const neighbor =
        edge < 0
          ? previewPanel.previousElementSibling
          : previewPanel.nextElementSibling;
      if (!edge || !(neighbor instanceof HTMLElement)) return;
      previewPanel = neighbor;
      scrollToPanel(neighbor);
      timer = window.setTimeout(advance, 850);
    };
    const trackEdge = ({ clientX, clientY }: DragEvent) => {
      if (!dragging) return;
      const bounds = element.getBoundingClientRect();
      const list = panels.getBoundingClientRect();
      let direction = 0;
      if (
        clientY >= list.top &&
        clientY < list.bottom &&
        clientX >= bounds.left &&
        clientX <= bounds.right
      ) {
        if (clientX < bounds.left + 32) direction = -1;
        else if (clientX > bounds.right - 32) direction = 1;
      }
      if (edge === direction) return;
      clearEdge();
      edge = direction;
      if (direction) timer = window.setTimeout(advance, 300);
    };
    const stopMonitoring = monitorForElements({
      canMonitor: ({ source }) => source.data.type === 'tab',
      onDragStart: () => {
        dragging = true;
        const version = ++dragVersion;
        setDragPreviews([]);
        window.electron.ipcRenderer
          .invoke('get-space-previews')
          .then((previews) => {
            if (dragging && version === dragVersion) setDragPreviews(previews);
          })
          .catch(() => {
            if (dragging && version === dragVersion) setDragPreviews(null);
          });
        previewPanel = selected;
      },
      onDrop: ({ location }) => {
        clearEdge();
        dragging = false;
        setDragPreviews(null);
        if (
          !location.current.dropTargets.some(
            (target) => target.data.type === 'space-panel',
          )
        )
          align();
      },
    });
    const panelAt = (x: number) =>
      Array.from(panels.children).find((panel) => {
        const rect = panel.getBoundingClientRect();
        return x >= rect.left && x < rect.right;
      });
    const stopDropTarget = dropTargetForElements({
      element: panels,
      canDrop: ({ source, input }) => {
        const panel = panelAt(input.clientX);
        return source.data.type === 'tab' && !!panel && panel !== selected;
      },
      getData: () => ({ type: 'space-panel' }),
      onDrop: ({ source, location }) => {
        const panel = panelAt(location.current.input.clientX);
        if (
          typeof source.data.uuid === 'string' &&
          panel instanceof HTMLElement &&
          panel !== selected
        ) {
          window.electron.ipcRenderer.sendMessage('move-tab-to-space', {
            uuid: source.data.uuid,
            space: Number(panel.dataset.space),
            activate: true,
          });
        }
      },
    });

    const settle = () => {
      if (dragging) return;
      let nearest = selected;
      for (const panel of panels.querySelectorAll<HTMLElement>(
        '[data-space]',
      )) {
        if (
          Math.abs(panel.offsetLeft - element.scrollLeft) <
          Math.abs(nearest.offsetLeft - element.scrollLeft)
        )
          nearest = panel;
      }
      if (Math.abs(nearest.offsetLeft - element.scrollLeft) > 1) {
        scrollToPanel(nearest);
      } else if (nearest !== selected) {
        window.electron.ipcRenderer.sendMessage('switch-space', {
          space: Number(nearest.dataset.space),
        });
      }
    };
    const leaveSidebar = (event: DragEvent) => {
      if (
        !(event.relatedTarget instanceof Node) ||
        !element.contains(event.relatedTarget)
      )
        clearEdge();
    };
    element.addEventListener('dragenter', trackEdge);
    element.addEventListener('dragover', trackEdge);
    element.addEventListener('dragleave', leaveSidebar);
    element.addEventListener('scroll', preview);
    element.addEventListener('scrollend', settle);
    return () => {
      dragging = false;
      setDragPreviews(null);
      element.removeEventListener('dragenter', trackEdge);
      element.removeEventListener('dragover', trackEdge);
      element.removeEventListener('dragleave', leaveSidebar);
      clearPreview();
      clearEdge();
      stopMonitoring();
      stopDropTarget();
      observer.disconnect();
      element.removeEventListener('scroll', preview);
      element.removeEventListener('scrollend', settle);
    };
  }, [activeSpace, spaceCount]);

  const currentTab =
    tabMeta?.tabs.find((t) => t.uuid === tabMeta.currentTabUuid) ?? null;

  return (
    <div className="@container h-full">
      <div
        ref={scroller}
        aria-label="Space tabs"
        role="region"
        className="h-full [scrollbar-width:none] overflow-x-auto overflow-y-hidden overscroll-x-none"
      >
        <div className="flex h-full w-max min-w-full flex-col gap-2">
          <div className="sticky left-0 flex w-[100cqw] flex-col gap-2">
            <NavigationBar />
            <AddressBar
              currentTabUrl={currentTab?.url}
              currentTabUuid={currentTab?.uuid}
            />
          </div>
          <div className="relative grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] gap-y-2 py-2">
            <Card
              aria-hidden="true"
              className="pointer-events-none sticky left-0 col-start-1 row-span-2 row-start-1 -my-2 w-[100cqw] py-0 drop-shadow-md"
            />
            <div
              ref={strip}
              className="relative col-start-1 row-start-1 flex min-h-0 gap-4"
            >
              <TabList dragPreviews={dragPreviews} />
            </div>
            <div className="sticky left-0 col-start-1 row-start-2 flex w-[100cqw] flex-col gap-2 px-2">
              <ComponentErrorBoundary name="MediaWidget">
                <MediaWidget />
              </ComponentErrorBoundary>
              <SidebarActions />
              {tabMeta && (
                <nav
                  ref={dots}
                  style={{ '--selected-space': activeSpace } as CSSProperties}
                  aria-label="Spaces"
                  className="flex flex-wrap items-center justify-center"
                >
                  {Array.from({ length: tabMeta.spaceCount }, (_, space) => (
                    <SpaceButton
                      key={space}
                      space={space}
                      active={space === activeSpace}
                    />
                  ))}
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="New space"
                    title="New space"
                    onClick={() =>
                      window.electron.ipcRenderer.sendMessage('create-space')
                    }
                  >
                    <Plus />
                  </Button>
                </nav>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function SpaceButton({ space, active }: { space: number; active: boolean }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [over, setOver] = useState(false);
  useEffect(() => {
    if (!ref.current || active) return;
    return dropTargetForElements({
      element: ref.current,
      canDrop: ({ source }) => source.data.type === 'tab',
      onDragEnter: () => setOver(true),
      onDragLeave: () => setOver(false),
      onDrop: ({ source }) => {
        setOver(false);
        if (typeof source.data.uuid === 'string') {
          window.electron.ipcRenderer.sendMessage('move-tab-to-space', {
            uuid: source.data.uuid,
            space,
          });
        }
      },
    });
  }, [space, active]);
  const label = `Space ${space + 1}`;
  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon-xs"
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(over && 'ring-primary ring-2')}
      onClick={() =>
        window.electron.ipcRenderer.sendMessage('switch-space', { space })
      }
    >
      <span
        aria-hidden="true"
        style={{ '--dot-index': space } as CSSProperties}
        className={cn('size-2 rounded-full bg-current', styles.spaceDot)}
      />
    </Button>
  );
}

const NavigationBar = () => {
  const meta = useSystemMeta();

  const sendTabAction = useCallback((action: TabActionsIpc['action']) => {
    window.electron.ipcRenderer.sendMessage('tab-actions', {
      action,
    } as TabActionsIpc);
  }, []);

  return (
    <Card className="p-0">
      <div className={cn('z-10 flex h-8 w-full items-center gap-0')}>
        {meta?.platform !== 'darwin' && <NonNativeWindowControls />}
        <div className="windowDragRegion h-full grow"></div>
        <div className={cn('flex items-center gap-2 pr-1')}>
          <Button
            variant="ghost"
            className={cn(
              'max-h-6 max-w-6',
              'hover:dark:bg-surface-raised hover:dark:text-surface-overlay-foreground',
            )}
            size="icon-sm"
            onClick={() => sendTabAction('back')}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="ghost"
            className={cn(
              'max-h-6 max-w-6',
              'hover:dark:bg-surface-raised hover:dark:text-surface-overlay-foreground',
            )}
            size="icon-sm"
            onClick={() => sendTabAction('forward')}
          >
            <ChevronRight />
          </Button>
          <Button
            variant="ghost"
            className={cn(
              'max-h-6 max-w-6',
              'hover:dark:bg-surface-raised hover:dark:text-surface-overlay-foreground',
            )}
            size="icon-sm"
            onClick={() => sendTabAction('refresh')}
          >
            <RotateCw />
          </Button>
        </div>
      </div>
    </Card>
  );
};

const AddressBar = ({
  currentTabUrl,
  currentTabUuid,
}: {
  currentTabUrl?: string;
  currentTabUuid?: string;
}) => {
  let displayUrl = currentTabUrl ?? '';
  if (currentTabUrl && !currentTabUrl.startsWith('palladium')) {
    try {
      displayUrl = new URL(currentTabUrl).hostname.replaceAll(/^www./g, '');
    } catch {
      displayUrl = currentTabUrl;
    }
  }

  return (
    <Card
      className="h-10 w-full cursor-pointer p-2 drop-shadow-md"
      onClick={() => openCommandBar(currentTabUuid)}
    >
      <div className="overflow-hidden px-1 text-sm text-ellipsis opacity-75 select-none focus:outline-none active:outline-none">
        {displayUrl}
      </div>
    </Card>
  );
};

const TabList = ({
  dragPreviews,
}: {
  dragPreviews: TabManagerIpc['neighbors'][number][] | null;
}) => {
  const tabMeta = useContext(TabMetaContext);
  const internalTabMeta = useContext(InternalTabMetaContext);

  useEffect(() => {
    return monitorForElements({
      onDrop({ location, source }) {
        const target = location.current.dropTargets[0];
        if (!target) return;

        const sourceData = source.data;
        const targetData = target.data;
        if (sourceData.type !== 'tab' || targetData.type !== 'tab') return;

        const startIndex = sourceData.index as number;
        const targetIndex = targetData.index as number;
        const edge = extractClosestEdge(targetData);
        const finishIndex = getReorderDestinationIndex({
          closestEdgeOfTarget: edge,
          startIndex,
          indexOfTarget: targetIndex,
          axis: 'vertical',
        });

        if (startIndex !== finishIndex) {
          window.electron.ipcRenderer.sendMessage('reorder-tab', {
            startIndex,
            finishIndex,
          });
        }
      },
    });
  }, []);

  const switchToTab = useCallback((uuid: string) => {
    window.electron.ipcRenderer.sendMessage('update-active-tab', {
      activeTabUuid: uuid,
    });
  }, []);

  if (!tabMeta) return null;
  const spaces = dragPreviews
    ? Array.from({ length: tabMeta.spaceCount }, (_, i) => i)
    : [tabMeta.activeSpace - 1, tabMeta.activeSpace, tabMeta.activeSpace + 1];
  return spaces.map((index) => {
    const offset = index - tabMeta.activeSpace;
    if (index < 0 || index >= tabMeta.spaceCount) return null;
    const neighbor = tabMeta.neighbors[index] ?? dragPreviews?.[index];
    const tabs = offset ? neighbor?.tabs : tabMeta.tabs;
    const selected = offset ? neighbor?.selected : tabMeta.currentTabUuid;
    return (
      <div
        key={index}
        inert={offset !== 0}
        aria-label={`Tabs in space ${index + 1}`}
        aria-current={offset === 0}
        data-space={index}
        className="mac-scrollbar flex w-[100cqw] shrink-0 flex-col gap-2 overflow-x-hidden overflow-y-auto px-2"
      >
        {tabs?.map((singleTabMeta, index) => (
          <BrowserTab
            key={singleTabMeta.uuid}
            uuid={singleTabMeta.uuid}
            url={singleTabMeta.url}
            index={index}
            data-tabUuid={singleTabMeta.uuid}
            isActive={selected === singleTabMeta.uuid}
            isPlayingAudio={singleTabMeta.isPlayingAudio}
            title={
              singleTabMeta.isInternal
                ? (internalTabMeta?.tabs[singleTabMeta.uuid]?.title ?? '')
                : singleTabMeta.title
            }
            favicon={singleTabMeta.faviconB64 ?? undefined}
            onClick={() => switchToTab(singleTabMeta.uuid)}
            isDevMode={singleTabMeta.isDevMode}
            isMuted={singleTabMeta.isMuted}
            isLoading={singleTabMeta.isLoading}
          />
        ))}
      </div>
    );
  });
};

const SidebarActions = () => {
  return (
    <div className="flex w-full gap-2">
      <div
        className="hover:bg-foreground/5 flex h-10 grow cursor-pointer items-center gap-2 overflow-hidden rounded-sm px-2 py-1 select-none"
        onClick={() => openCommandBar()}
      >
        <Plus size="18px" className="max-w-[18px] min-w-[18px]" />
        <div className="flex flex-col justify-center overflow-hidden text-ellipsis">
          <div className="truncate text-sm">New Tab</div>
        </div>
      </div>
      <button
        aria-label="Settings"
        className="hover:bg-foreground/5 flex h-10 w-10 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-sm px-2 py-1 select-none"
        onClick={() => window.electron.ipcRenderer.sendMessage('open-settings')}
      >
        <Cog size="18px" className="max-w-[18px] min-w-[18px]" />
      </button>
    </div>
  );
};

const NonNativeWindowControls = () => {
  return (
    <div className={cn('group flex items-center gap-1 pl-2')}>
      <Button
        variant="ghost"
        className={cn(
          'max-h-4 max-w-4 cursor-pointer rounded-full',
          'bg-red-500/75 hover:bg-red-500/75',
          'hover:bg-red-500/75 dark:hover:bg-red-500/75',
        )}
        size="icon-xs"
        onClick={() =>
          window.electron.ipcRenderer.sendMessage('window-action', {
            action: 'close',
          })
        }
      >
        <X
          strokeWidth={4}
          className={cn(
            'text-foreground dark:text-foreground scale-75 opacity-0 transition-all duration-200',
            'group-hover:text-black group-hover:opacity-50 group-hover:dark:text-black',
          )}
        />
      </Button>
      <Button
        variant="ghost"
        className={cn(
          'max-h-4 max-w-4 cursor-pointer rounded-full',
          'bg-amber-500/75 hover:bg-amber-500/75',
          'hover:bg-amber-500/75 dark:hover:bg-amber-500/75',
        )}
        size="icon-xs"
        onClick={() =>
          window.electron.ipcRenderer.sendMessage('window-action', {
            action: 'minimize',
          })
        }
      >
        <Minus
          strokeWidth={4}
          className={cn(
            'text-foreground dark:text-foreground scale-75 opacity-0 transition-all duration-200',
            'group-hover:text-black group-hover:opacity-50 group-hover:dark:text-black',
          )}
        />
      </Button>
      <Button
        variant="ghost"
        className={cn(
          'max-h-4 max-w-4 cursor-pointer rounded-full',
          'bg-green-500/75 hover:bg-green-500/75',
          'hover:bg-green-500/75 dark:hover:bg-green-500/75',
        )}
        size="icon-xs"
        onClick={() =>
          window.electron.ipcRenderer.sendMessage('window-action', {
            action: 'maximize',
          })
        }
      >
        <Maximize2
          strokeWidth={4}
          className={cn(
            'text-foreground dark:text-foreground scale-75 opacity-0 transition-all duration-200',
            'group-hover:text-black group-hover:opacity-50 group-hover:dark:text-black',
          )}
        />
      </Button>
    </div>
  );
};
