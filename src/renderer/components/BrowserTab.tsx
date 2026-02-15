import { cn } from '@/lib/utils';
import { Apple, LoaderCircle, Volume2, VolumeOff, X } from 'lucide-react';
import { ReactElement, useCallback, useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import {
  draggable,
  dropTargetForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import {
  attachClosestEdge,
  extractClosestEdge,
  type Edge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { DropIndicator } from '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box';

interface BrowserTabProps {
  isActive: boolean;
  uuid: string;
  title: string;
  index: number;
  favicon?: string;
  subtitle?: string;
  onClick?: () => void;
  isDevMode: boolean;
  isPlayingAudio: boolean;
  isMuted: boolean;
  isLoading: boolean;
}

export const BrowserTab = (props: BrowserTabProps) => {
  const [afterIcon, setAfterIcon] = useState<ReactElement | null>(null);
  const [showAfterIcon, setShowAfterIcon] = useState<boolean>(false);
  const tabRef = useRef<HTMLDivElement>(null);

  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  useEffect(() => {
    const el = tabRef.current;
    if (!el) return;

    return combine(
      draggable({
        element: el,
        getInitialData: () => ({
          uuid: props.uuid,
          index: props.index,
          type: 'tab',
        }),
        onDragStart: () => setIsDragging(true),
        onDrop: () => setIsDragging(false),
      }),
      dropTargetForElements({
        element: el,
        getData: ({ input }) => {
          return attachClosestEdge(
            { uuid: props.uuid, index: props.index, type: 'tab' },
            {
              element: el,
              input,
              allowedEdges: ['top', 'bottom'],
            },
          );
        },
        onDragEnter: ({ self }) => {
          setClosestEdge(extractClosestEdge(self.data));
        },
        onDrag: ({ self }) => {
          setClosestEdge(extractClosestEdge(self.data));
        },
        onDragLeave: () => {
          setClosestEdge(null);
        },
        onDrop: () => {
          setClosestEdge(null);
        },
      }),
    );
  }, [props.uuid, props.index]);

  let favicon = (
    <LoaderCircle className="max-w-[18px] min-w-[18px] animate-spin" />
  );

  if (!props.isLoading) {
    if (props.favicon) {
      favicon = <img height="18px" width="18px" src={props.favicon} />;
    } else {
      favicon = <Apple size="18px" className="max-w-[18px] min-w-[18px]" />;
    }
  }

  useEffect(() => {
    if (!props.isMuted && props.isPlayingAudio) {
      setAfterIcon(
        <Volume2
          size="18px"
          className={cn('mr-[-28px] min-w-[18px] opacity-0 transition-all', {
            ['mr-0 opacity-100']: props.isPlayingAudio,
          })}
        />,
      );
      setShowAfterIcon(true);
    } else if (props.isMuted) {
      setAfterIcon(<VolumeOff size="18px" />);
      setShowAfterIcon(true);
    } else {
      setShowAfterIcon(false);
    }
  }, [props.isMuted, props.isPlayingAudio]);

  const closeTab = useCallback((uuid: string) => {
    window.electron.ipcRenderer.sendMessage('close-tab', {
      uuid: uuid,
    });
  }, []);

  useEffect(() => {
    const onContextMenu = (event: { preventDefault: () => void }) => {
      event.preventDefault();
      window.electron.ipcRenderer.sendMessage('tab-context-menu', {
        uuid: props.uuid,
      });
    };
    if (tabRef.current) {
      tabRef.current.addEventListener('contextmenu', onContextMenu);
    }

    return () => {
      if (tabRef.current) {
        tabRef.current.removeEventListener('contextmenu', onContextMenu);
      }
    };
  }, []);

  return (
    <div className="relative">
      <div
        className={cn(
          'group flex h-10 cursor-pointer items-center gap-2 overflow-hidden rounded-sm px-2 py-1 select-none',
          {
            ['hover:bg-white/5']: !props.isActive,
            ['bg-white/10 shadow-md']: props.isActive,
            ['border-2 border-dashed border-amber-500/25']: props.isDevMode,
            ['opacity-50']: isDragging,
          },
        )}
        onClick={props?.onClick}
        ref={tabRef}
      >
        {favicon}
        <div
          className={cn(
            'flex flex-col justify-center overflow-hidden text-ellipsis',
            {
              ['group-hover:pr-6']: !showAfterIcon,
            },
          )}
        >
          <div className="truncate text-sm">{props.title}</div>
          {props.subtitle && (
            <div className="truncate text-xs opacity-25">{props.subtitle}</div>
          )}
        </div>
        <div
          className={cn(
            'mr-[-28px] max-w-[18px] min-w-[18px] opacity-0 transition-all duration-300 ease-in-out',
            {
              ['mr-0 opacity-100']: showAfterIcon,
            },
          )}
        >
          <div className="h-[18px] w-[18px] opacity-100 transition-opacity group-hover:opacity-0">
            {afterIcon}
          </div>
        </div>
        <div className="absolute right-3 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            size={'icon-sm'}
            className="h-6 w-6"
            variant={'ghost'}
            onClick={(e) => {
              e.stopPropagation();
              console.log('Closing tab ' + props.uuid);
              closeTab(props.uuid);
            }}
          >
            <X size={18} />
          </Button>
        </div>
      </div>
      {closestEdge && <DropIndicator edge={closestEdge} gap={'8px'} />}
    </div>
  );
};
