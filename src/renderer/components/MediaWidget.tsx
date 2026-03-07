import { Button } from './ui/button';
import { Card } from './ui/card';
import { ExternalLink, Play, SkipBack, SkipForward } from 'lucide-react';
import { Progress } from './ui/progress';
import { cn } from '@/lib/utils';

import img from '../../../assets/images/kalen-emsley-Bkci_8qcdvQ-unsplash.jpg';

export const MediaWidget = () => {
  const animationRules = 'transition-all delay-100 duration-200 transform-gpu';
  return (
    <Card
      apperance="Hero"
      className="group min-h-fit transform-gpu overflow-hidden bg-white bg-cover p-0"
      style={{ backgroundImage: `url('${img}')` }}
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
        <div className="justify-left mb-2 flex w-full items-center gap-2 px-4">
          <div
            className={cn(
              'aspect-square rounded-sm bg-white bg-cover',
              'h-8 group-hover:h-11',
              animationRules,
            )}
            style={{ backgroundImage: `url('${img}')` }}
          ></div>
          <div className="justify-left flex grow flex-col select-none">
            <span
              className={cn('text-sm group-hover:text-base', animationRules)}
            >
              Track Name
            </span>
            <span
              className={cn(
                'text-xs opacity-50 group-hover:text-sm',
                animationRules,
              )}
            >
              Artist
            </span>
          </div>
        </div>
        <div
          className={cn('h-fit w-full px-0 group-hover:px-4', animationRules)}
        >
          <Progress
            className={cn('max-h-0.5 group-hover:max-h-2', animationRules)}
            value={33}
          />
        </div>
        <div
          className={cn(
            'flex w-full items-center justify-center gap-2',
            animationRules,
            '-mb-10 rounded-none opacity-0 group-hover:mb-0 group-hover:opacity-100',
          )}
        >
          <Button className="" variant="ghost">
            <SkipBack />
          </Button>
          <Button className="" variant="ghost">
            <Play />
          </Button>
          <Button className="" variant="ghost">
            <SkipForward />
          </Button>
          <Button className="" variant="ghost">
            <ExternalLink />
          </Button>
        </div>
      </div>
    </Card>
  );
};
