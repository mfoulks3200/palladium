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

import { useCallback, useContext, useEffect, useState } from 'react';
import { TabActionsIpc, TabManagerIpc } from '../../ipc';
import { OverlayPortal } from './PortalOverlay';
import { InternalTabMetaContext, TabMetaContext } from '@/windows/main-ui/App';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { getReorderDestinationIndex } from '@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index';

import styles from './Sidebar.module.css';
import { cn } from '@/lib/utils';
import { useSystemMeta } from '@/lib/system-meta';

export const Sidebar = () => {
  const tabMeta = useContext(TabMetaContext);
  const internalTabMeta = useContext(InternalTabMetaContext);
  const meta = useSystemMeta();

  useEffect(() => {
    return monitorForElements({
      onDrop({ location, source }) {
        const target = location.current.dropTargets[0];
        if (!target) {
          return;
        }

        const sourceData = source.data;
        const targetData = target.data;

        if (sourceData.type !== 'tab' || targetData.type !== 'tab') {
          return;
        }

        const startIndex = sourceData.index as number;
        const targetIndex = targetData.index as number;

        const edge = extractClosestEdge(targetData);
        const finishIndex = getReorderDestinationIndex({
          closestEdgeOfTarget: edge,
          startIndex,
          indexOfTarget: targetIndex,
          axis: 'vertical',
        });

        if (startIndex === finishIndex) {
          return;
        }

        window.electron.ipcRenderer.sendMessage('reorder-tab', {
          startIndex,
          finishIndex,
        });
      },
    });
  }, []);

  const switchToTab = useCallback((uuid: string) => {
    window.electron.ipcRenderer.sendMessage('update-active-tab', {
      activeTabUuid: uuid,
    });
  }, []);

  const sendTabAction = useCallback((action: TabActionsIpc['action']) => {
    window.electron.ipcRenderer.sendMessage('tab-actions', {
      action,
    } as TabActionsIpc);
  }, []);

  const currentTab =
    tabMeta?.tabs.find((t) => t.uuid === tabMeta.currentTabUuid) ?? null;

  let currentTabDisplayUrl = currentTab?.url ?? '';
  if (currentTab && !currentTab.url.startsWith('palladium')) {
    try {
      currentTabDisplayUrl = new URL(currentTab.url).hostname.replaceAll(
        /^www./g,
        '',
      );
    } catch (e) {
      currentTabDisplayUrl = currentTab.url;
    }
  }

  const openCommandBar = useCallback(
    (uuid?: string) => {
      window.electron.ipcRenderer.sendMessage('command-bar', {
        action: 'open',
        tabUuid: uuid,
      });
    },
    [currentTab],
  );

  return (
    <div className="flex h-full max-h-full flex-col gap-2">
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
      <Card
        className="h-10 w-full cursor-pointer p-2 drop-shadow-md"
        onClick={() => {
          openCommandBar(currentTab?.uuid);
        }}
      >
        <div className="overflow-hidden px-1 text-sm text-ellipsis opacity-75 select-none focus:outline-none active:outline-none">
          {currentTabDisplayUrl}
        </div>
      </Card>
      <Card className="max-h-full min-h-0 w-full grow p-2 drop-shadow-md">
        <div className="flex h-full max-h-full w-full flex-col gap-1">
          <div className="scrollbar-gutter-stable mac-scrollbar flex h-full max-h-full w-full flex-col gap-2 overflow-scroll">
            {tabMeta &&
              tabMeta.tabs &&
              tabMeta.tabs.map((singleTabMeta, index) => (
                <BrowserTab
                  key={singleTabMeta.uuid}
                  uuid={singleTabMeta.uuid}
                  url={singleTabMeta.url}
                  index={index}
                  data-tabUuid={singleTabMeta.uuid}
                  isActive={tabMeta.currentTabUuid === singleTabMeta.uuid}
                  isPlayingAudio={singleTabMeta.isPlayingAudio}
                  title={
                    singleTabMeta.isInternal
                      ? (internalTabMeta?.tabs[singleTabMeta.uuid]?.title ?? '')
                      : singleTabMeta.title
                  }
                  favicon={singleTabMeta.faviconB64 ?? undefined}
                  onClick={() => {
                    console.log('Switching to tab ', singleTabMeta.uuid);
                    switchToTab(singleTabMeta.uuid);
                  }}
                  isDevMode={singleTabMeta.isDevMode}
                  isMuted={singleTabMeta.isMuted}
                  isLoading={singleTabMeta.isLoading}
                />
              ))}

            {/* <BrowserTab isActive={true} title={'Electron JS'} />
          <BrowserTab
            isActive={false}
            title={'Example Tab'}
            subtitle="Subtitle Text"
          />
          <BrowserTab isActive={false} title={'Example Tab'} isDevMode={true} />
          <BrowserTab isActive={false} title={'Example Tab'} /> */}
          </div>
          <div className="grow" />
          <div className="flex w-full gap-2">
            <div
              className={
                'flex h-10 grow cursor-pointer items-center gap-2 overflow-hidden rounded-sm px-2 py-1 select-none hover:bg-white/5'
              }
              onClick={() => {
                openCommandBar();
              }}
            >
              <Plus size="18px" className="max-w-[18px] min-w-[18px]" />
              <div className="flex flex-col justify-center overflow-hidden text-ellipsis">
                <div className="truncate text-sm">New Tab</div>
              </div>
            </div>
            <div
              className={
                'flex h-10 w-10 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-sm px-2 py-1 select-none hover:bg-white/5'
              }
              onClick={() => {
                window.electron.ipcRenderer.sendMessage('open-settings');
              }}
            >
              <Cog size="18px" className="max-w-[18px] min-w-[18px]" />
            </div>
          </div>
        </div>
      </Card>
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
