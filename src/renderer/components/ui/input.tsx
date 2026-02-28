import * as React from 'react';
import { useSettings } from '@/lib/settings';
import chroma from 'chroma-js';

import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  const [tint] = useSettings('personalization.userInterface.tintColor');
  const [opacity] = useSettings('personalization.userInterface.transparency');

  let baseBgColor = chroma(tint).alpha(opacity).desaturate(3);

  const lightMode =
    chroma.contrast(baseBgColor, 'white') >
    chroma.contrast(baseBgColor, 'black');

  const inputBg = lightMode ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.2)';

  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 h-9 w-full min-w-0 rounded-md bg-transparent px-3 py-1 text-base transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
        'shadow-sm',
        `bg-[${inputBg}]`,
        className,
      )}
      style={{
        // backgroundColor: lightMode
        //   ? 'rgba(0,0,0,0.25)'
        //   : 'rgba(255,255,255,0.2)',
        background: 'transparent',
        color: lightMode ? 'white' : 'black',
      }}
      {...props}
    />
  );
}

export { Input };
