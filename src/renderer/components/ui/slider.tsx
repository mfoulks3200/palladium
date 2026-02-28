import * as React from 'react';
import { Slider as SliderPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';
import { useSettings } from '@/lib/settings';
import chroma from 'chroma-js';

interface SliderProps {
  centerMarker?: boolean;
  displayValue?: string | number;
}

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  centerMarker,
  displayValue,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root> & SliderProps) {
  const [tint] = useSettings('personalization.userInterface.tintColor');
  const [opacity] = useSettings('personalization.userInterface.transparency');

  let baseBgColor = chroma(tint).alpha(opacity).desaturate(3);

  const lightMode =
    chroma.contrast(baseBgColor, 'white') >
    chroma.contrast(baseBgColor, 'black');

  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max],
  );

  return (
    <div className="flex w-full gap-2">
      <div className="flex grow">
        <SliderPrimitive.Root
          data-slot="slider"
          defaultValue={defaultValue}
          value={value}
          min={min}
          max={max}
          className={cn(
            'relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col',
            className,
          )}
          {...props}
        >
          <SliderPrimitive.Track
            data-slot="slider-track"
            className={cn(
              'relative grow overflow-hidden rounded-full data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5',
            )}
            style={{
              backgroundColor: lightMode
                ? 'rgba(0,0,0,0.1)'
                : 'rgba(255,255,255,0.2)',
            }}
          >
            <SliderPrimitive.Range
              data-slot="slider-range"
              className={cn(
                'absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full',
              )}
              style={{
                backgroundColor: chroma(lightMode ? 'white' : 'black')
                  .darken(opacity * 4)
                  .alpha(0.5)
                  .css(),
              }}
            />
          </SliderPrimitive.Track>
          {Array.from({ length: _values.length }, (_, index) => (
            <SliderPrimitive.Thumb
              data-slot="slider-thumb"
              key={index}
              className="border-primary ring-ring/50 block size-4 shrink-0 rounded-full border bg-white shadow-sm transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50"
            />
          ))}
        </SliderPrimitive.Root>
        {centerMarker && (
          <div
            className="relative -z-10 mr-[50%] -ml-[50%] h-full w-[1px]"
            style={{
              backgroundColor: chroma(lightMode ? 'white' : 'black')
                .darken(opacity * 4)
                .alpha(0.5)
                .css(),
            }}
          />
        )}
      </div>
      {displayValue && (
        <div
          className="w-14 rounded-sm bg-red-600 px-2 py-1 text-right font-mono text-sm"
          style={{
            backgroundColor: lightMode
              ? 'rgba(0,0,0,0.1)'
              : 'rgba(255,255,255,0.2)',
            color: lightMode ? 'white' : 'black',
          }}
        >
          {displayValue}
        </div>
      )}
    </div>
  );
}

export { Slider };
