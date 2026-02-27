import { SettingsOption } from '.';
import { SettingsContext, useSettings } from '@/lib/settings';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';
import { backgrounds } from '@/lib/backgrounds';
import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { SwatchBook } from 'lucide-react';

export const Background = () => {
  const shaderPresets = ['Color', 'Shader'];
  const [backgroundType, setBackgroundType] = useState(shaderPresets[1]);

  const optionClassNames = 'justify-end';
  return (
    <>
      <SettingsOption name={'Background Type'} className={optionClassNames}>
        <Combobox
          items={shaderPresets}
          value={backgroundType}
          onValueChange={(newVal) =>
            setBackgroundType(newVal ?? shaderPresets[0])
          }
        >
          <ComboboxInput placeholder="Background Type" />
          <ComboboxContent>
            <ComboboxEmpty>No items found.</ComboboxEmpty>
            <ComboboxList>
              {(item: (typeof shaderPresets)[number]) => (
                <ComboboxItem key={item} value={item}>
                  {item}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </SettingsOption>
      {backgroundType === 'Shader' && <ShaderBackground />}
    </>
  );
};

export const ShaderBackground = () => {
  const [shaderPreset, setShaderPreset] = useSettings(
    'personalization.background.id',
  );
  const [maxFps, setMaxFps] = useSettings('personalization.background.maxFps');
  const [speed, setSpeed] = useSettings('personalization.background.speed');
  const shaderPresets = Object.entries(backgrounds).map(([id, shader]) => ({
    id,
    ...shader,
  }));

  const currentBg = backgrounds[
    shaderPreset
  ] as (typeof backgrounds)['bioscanner'];

  const optionClassNames = 'justify-end';
  return (
    <>
      <SettingsOption name={'Shader'} className={optionClassNames}>
        <Combobox
          items={shaderPresets}
          value={shaderPreset}
          onValueChange={(newVal) => {
            if (newVal) {
              setShaderPreset(newVal);
            }
          }}
        >
          <ComboboxInput placeholder="Select a shader" />
          <ComboboxContent>
            <ComboboxEmpty>No items found.</ComboboxEmpty>
            <ComboboxList>
              {(item: (typeof shaderPresets)[number]) => (
                <ComboboxItem key={item.id} value={item.id}>
                  {item.name}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </SettingsOption>
      <Card
        className={cn(
          'bg-linear-to-bl from-gray-900/35 to-gray-950',
          'drop-shadow-lg backdrop-blur-sm backdrop-saturate-200',
          'border-x-gray-600/35 border-t-gray-600/50 border-b-gray-600/20',
          'flex flex-col gap-2 overflow-hidden p-4',
        )}
      >
        <a href={currentBg.link ?? '#'} target="_blank" className="text-xl">
          {backgrounds[shaderPreset].name}
        </a>
        <div className="flex gap-4 text-xs">
          {currentBg.author && (
            <a href={currentBg.author.link ?? '#'} target="_blank">
              {currentBg.author.name}
            </a>
          )}
          {currentBg.license && <span>{currentBg.license}</span>}
        </div>
        <SwatchBook size={128} className="absolute -top-6 right-0 opacity-5" />
      </Card>
      <SettingsOption name={'Speed'} className={optionClassNames}>
        <div className="flex w-full gap-2">
          <div className="flex grow">
            <Slider
              defaultValue={[speed]}
              min={-1}
              max={1}
              onValueChange={(newVal) => setSpeed(newVal[0])}
              step={0.01}
              className="mx-auto w-full max-w-xs"
            />
            <div className="relative mr-[50%] -ml-[50%] h-full w-[1px] bg-white" />
          </div>
          <div className="w-14 text-right">{speed.toFixed(2)}</div>
        </div>
      </SettingsOption>
      <SettingsOption name={'Max FPS'} className={optionClassNames}>
        <div className="flex w-full gap-2">
          <Slider
            defaultValue={[maxFps]}
            min={0}
            max={120}
            onValueChange={(newVal) => setMaxFps(newVal[0])}
            step={1}
            className="mx-auto w-full max-w-xs"
          />
          <div className="w-14 text-right">{maxFps}</div>
        </div>
      </SettingsOption>
    </>
  );
};
