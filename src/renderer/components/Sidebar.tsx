import { ChevronLeft, ChevronRight, Plus, RotateCw } from 'lucide-react';
import { BrowserTab } from './BrowserTab';
import { Button } from './ui/button';
import { Card } from './ui/card';

import { useCallback, useContext, useEffect, useState } from 'react';
import { TabActionsIpc, TabManagerIpc } from 'src/ipc/Tabs';
import { OverlayPortal } from './PortalOverlay';
import { CommandBarContext, TabMetaContext } from '@/App';

export const Sidebar = () => {
  const commandBar = useContext(CommandBarContext);
  const tabMeta = useContext(TabMetaContext);

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

  let currentTabDisplayUrl = '';
  if (currentTab) {
    try {
      currentTabDisplayUrl = new URL(currentTab.url).hostname.replaceAll(
        /^www./g,
        '',
      );
    } catch (e) {
      currentTabDisplayUrl = currentTab.url;
    }
  }

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex h-8 w-full items-center gap-2">
        <div className="grow"></div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => sendTabAction('back')}
        >
          <ChevronLeft />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => sendTabAction('forward')}
        >
          <ChevronRight />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => sendTabAction('refresh')}
        >
          <RotateCw />
        </Button>
      </div>
      <Card
        className="h-10 w-full cursor-pointer bg-black/75 p-2 drop-shadow-md backdrop-blur-sm backdrop-saturate-200"
        onClick={() => {
          commandBar(tabMeta?.currentTabUuid ?? 'new', currentTab?.url);
        }}
      >
        <div className="overflow-hidden px-1 text-sm text-ellipsis opacity-75 select-none focus:outline-none active:outline-none">
          {currentTabDisplayUrl}
        </div>
      </Card>
      <Card className="w-full grow bg-black/75 p-2 drop-shadow-md backdrop-blur-sm backdrop-saturate-200">
        <div className="flex h-full w-full flex-col gap-2">
          {tabMeta &&
            tabMeta.tabs &&
            tabMeta.tabs.map((singleTabMeta) => (
              <BrowserTab
                key={singleTabMeta.uuid}
                uuid={singleTabMeta.uuid}
                data-tabUuid={singleTabMeta.uuid}
                isActive={tabMeta.currentTabUuid === singleTabMeta.uuid}
                isPlayingAudio={singleTabMeta.isPlayingAudio}
                title={singleTabMeta.title}
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
          <div className="grow" />
          <div
            className={
              'flex h-10 cursor-pointer items-center gap-2 overflow-hidden rounded-sm px-2 py-1 select-none hover:bg-white/5'
            }
            onClick={() => {
              commandBar('new', '');
            }}
          >
            <Plus size="18px" className="max-w-[18px] min-w-[18px]" />
            <div className="flex flex-col justify-center overflow-hidden text-ellipsis">
              <div className="truncate text-sm">New Tab</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
