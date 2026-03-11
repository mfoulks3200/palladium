import { Button } from './ui/button';
import { Card } from './ui/card';
import { ExternalLink, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { Progress } from './ui/progress';
import { cn } from '@/lib/utils';

import img from '../../../assets/images/kalen-emsley-Bkci_8qcdvQ-unsplash.jpg';
import { useMediaStates } from '@/lib/media-state';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MediaState } from 'src/ipc';

export const MediaWidget = () => {
  const [selectedMediaState, setSelectedMediaState] = useState(0);
  const [currentProgress, setCurrentProgress] = useState(0);
  const mediaStates = useMediaStates();

  const currentMediaState = mediaStates[selectedMediaState] ?? null;
  const currentMediaStateRef = useRef(currentMediaState);
  currentMediaStateRef.current = currentMediaState;

  // Sync progress when media state updates from IPC
  useEffect(() => {
    if (currentMediaState) {
      setCurrentProgress(currentMediaState.progress ?? 0);
    }
  }, [currentMediaState?.progress, currentMediaState?.id]);

  const sendMediaControl = useCallback(
    (action: 'play' | 'pause' | 'next' | 'previous') => {
      const state = currentMediaStateRef.current;
      if (state) {
        window.electron.ipcRenderer.sendMessage('media-control', {
          mediaId: state.id,
          action,
        });
      }
    },
    [],
  );

  // Smooth progress interpolation — uses a ref so the interval is stable
  useEffect(() => {
    const intervalMs = 500;

    const update = setInterval(() => {
      const state = currentMediaStateRef.current;
      if (state && state.playing) {
        const seconds = intervalMs / 1000;
        setCurrentProgress((current) =>
          Math.min(current + seconds, state.duration ?? 0),
        );
      }
    }, intervalMs);

    return () => {
      clearInterval(update);
    };
  }, []);

  if (mediaState.length === 0 || !currentMediaState) {
    return <></>;
  }

  const progress = currentProgress / (currentMediaState.duration ?? 0.00001);

  const animationRules = 'transition-all delay-100 duration-200 transform-gpu';
  return (
    <Card
      apperance="Hero"
      className="group min-h-fit transform-gpu overflow-hidden bg-white bg-cover p-0"
      style={{ backgroundImage: `url('${currentMediaState.artworkUrl}')` }}
    >
      <div
        className={cn(
          'flex transform-gpu flex-col items-center justify-end',
          'gap-0 group-hover:gap-2',
          'py-1 group-hover:py-2 group-hover:pt-4',
          animationRules,
          'bg-primary-foreground/90 group-hover:bg-primary-foreground/75',
        )}
      >
        <div className="justify-left mb-2 flex w-full max-w-full min-w-0 items-center gap-2 px-4">
          <div
            className={cn(
              'aspect-square rounded-sm bg-white bg-cover',
              'h-8 group-hover:h-11',
              animationRules,
            )}
            style={{
              backgroundImage: `url('${currentMediaState.artworkUrl}')`,
            }}
          ></div>
          <div className="justify-left flex w-full max-w-full min-w-0 grow flex-col select-none">
            <span
              className={cn(
                'max-w-full min-w-0 truncate overflow-hidden text-sm group-hover:text-base',
                animationRules,
              )}
            >
              {currentMediaState.title}
            </span>
            <span
              className={cn(
                'text-xs opacity-50 group-hover:text-sm',
                animationRules,
              )}
            >
              {currentMediaState.artist}
            </span>
          </div>
        </div>
        <div
          className={cn('h-fit w-full px-0 group-hover:px-4', animationRules)}
        >
          <Progress
            className={cn(
              'max-h-0.5 duration-500 group-hover:max-h-2',
              animationRules,
            )}
            value={progress * 100}
          />
        </div>
        <div
          className={cn(
            'flex w-full items-center justify-center gap-2',
            animationRules,
            '-mb-10 rounded-none opacity-0 group-hover:mb-0 group-hover:opacity-100',
          )}
        >
          <Button
            className=""
            variant="ghost"
            onClick={() => sendMediaControl('previous')}
          >
            <SkipBack />
          </Button>
          <Button
            className=""
            variant="ghost"
            onClick={() =>
              sendMediaControl(currentMediaState.playing ? 'pause' : 'play')
            }
          >
            {currentMediaState.playing ? <Pause /> : <Play />}
          </Button>
          <Button
            className=""
            variant="ghost"
            onClick={() => sendMediaControl('next')}
          >
            <SkipForward />
          </Button>
          <Button
            className=""
            variant="ghost"
            onClick={() => {
              const tabUuid = currentMediaState.id.replace(/^audio-/, '');
              window.electron.ipcRenderer.sendMessage('update-active-tab', {
                activeTabUuid: tabUuid,
              });
            }}
          >
            <ExternalLink />
          </Button>
        </div>
      </div>
    </Card>
  );
};
