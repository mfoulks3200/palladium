import { useSettings } from '@/lib/settings';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemWithDetail,
  ComboboxList,
} from '@/components/ui/combobox';
import { backgrounds } from '../../../../../ipc/backgrounds';
import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { SwatchBook } from 'lucide-react';
import { SettingsOption } from '../SettingComponents';
import { type ShaderBackground as ShaderBackgroundType } from '../../../../../ipc/backgrounds';
import { ReactShaderToy } from '@/components/agents-ui/react-shader-toy';

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
          getDisplayValue={(itemVal) => backgrounds[itemVal]?.name ?? ''}
        >
          <ComboboxInput placeholder="Select a shader" />
          <ComboboxContent>
            <ComboboxEmpty>No items found.</ComboboxEmpty>
            <ComboboxList>
              {(item: (typeof shaderPresets)[number]) => (
                <ComboboxItemWithDetail
                  key={item.id}
                  value={item.id}
                  detail={<ShaderPreview shader={item.id as any} />}
                >
                  {item.name}
                </ComboboxItemWithDetail>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </SettingsOption>
      <Card
        className={cn('flex flex-col gap-2 overflow-hidden p-4')}
        apperance="Hero"
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
        <Slider
          defaultValue={[speed]}
          min={-1}
          max={1}
          onValueChange={(newVal) => setSpeed(newVal[0])}
          step={0.01}
          className="mx-auto w-full max-w-xs"
          centerMarker={true}
          displayValue={(speed * 100).toFixed(0) + '%'}
        />
      </SettingsOption>
      <SettingsOption name={'Max FPS'} className={optionClassNames}>
        <Slider
          defaultValue={[maxFps]}
          min={0}
          max={120}
          onValueChange={(newVal) => setMaxFps(newVal[0])}
          step={1}
          className="mx-auto w-full max-w-xs"
          displayValue={maxFps}
        />
      </SettingsOption>
    </>
  );
};

const ShaderPreview = ({ shader }: { shader: keyof typeof backgrounds }) => {
  const shaderObj: ShaderBackgroundType = backgrounds[shader];
  return (
    <div className="aspect-video w-64 bg-black">
      <ReactShaderToy
        fs={shaderObj.fs}
        timeMultiplier={shaderObj.speed?.max ?? 1}
        maxFPS={30}
        precision="lowp"
      />
    </div>
  );
};
