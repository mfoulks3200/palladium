import * as React from 'react';

import { cn } from '@/lib/utils';
import { useSettings } from '@/lib/settings';
import chroma from 'chroma-js';

type CardApperances = 'Translucent' | 'Solid' | 'Hero';

interface CardProps {
  apperance?: CardApperances;
}

function Card({
  className,
  apperance = 'Translucent',
  ...props
}: React.ComponentProps<'div'> & CardProps) {
  const [tint] = useSettings('personalization.userInterface.tintColor');
  const [opacity] = useSettings('personalization.userInterface.transparency');
  const [blur] = useSettings('personalization.userInterface.blur');
  const [saturation] = useSettings(
    'personalization.userInterface.backdropSaturation',
  );

  let baseBgColor = chroma(tint).alpha(opacity).desaturate(3);

  switch (apperance) {
    case 'Hero':
      baseBgColor = baseBgColor.darken(0.75);
      break;
    case 'Solid':
      if (baseBgColor.luminance() < 0.3) {
        baseBgColor = baseBgColor.darken(2);
      } else {
        baseBgColor = baseBgColor.brighten(1);
      }
      break;
    case 'Translucent':
      //
      break;
  }

  const lightMode =
    chroma.contrast(baseBgColor, 'white') >
    chroma.contrast(baseBgColor, 'black');

  let topBorderColor = baseBgColor.alpha(0.5).brighten(lightMode ? 2 : 1.25);

  return (
    <div
      data-slot="card"
      className={cn(
        'text-card-foreground flex flex-col gap-6 rounded-[8px] border py-6 shadow-sm transition-[color]',
        {
          ['text-white']: lightMode,
          ['text-black']: !lightMode,
        },
        className,
      )}
      style={{
        backgroundColor: baseBgColor.css(),
        background: `linear-gradient(45deg, ${baseBgColor.darken(0.25)} 0%, ${baseBgColor.brighten(0.25)} 100%)`,
        backdropFilter: `blur(${blur}px) saturate(${saturation}%)`,
        borderTop: `1px solid ${topBorderColor.css()}`,
        borderLeft: `1px solid ${topBorderColor.darken(0.6).css()}`,
        borderRight: `1px solid ${topBorderColor.darken(0.6).css()}`,
        borderBottom: `1px solid ${topBorderColor.darken(0.9).css()}`,
      }}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6',
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn('leading-none font-semibold', className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-content"
      className={cn('px-6', className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center px-6 [.border-t]:pt-6', className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
