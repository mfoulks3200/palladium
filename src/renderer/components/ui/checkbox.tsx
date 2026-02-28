import * as React from 'react';
import { CheckIcon } from 'lucide-react';
import { Checkbox as CheckboxPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';
import { useSettings } from '@/lib/settings';
import chroma from 'chroma-js';

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  const [tint] = useSettings('personalization.userInterface.tintColor');
  const [opacity] = useSettings('personalization.userInterface.transparency');

  let baseBgColor = chroma(tint).alpha(opacity).desaturate(3);

  const lightMode =
    chroma.contrast(baseBgColor, 'white') >
    chroma.contrast(baseBgColor, 'black');

  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer dark:bg-input/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-[4px] transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
        'h-6 w-6 border-0 shadow-sm',
        className,
      )}
      style={{
        backgroundColor: lightMode
          ? 'rgba(0,0,0,0.1)'
          : 'rgba(255,255,255,0.2)',
        color: lightMode ? 'white' : 'black',
      }}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none"
      >
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
