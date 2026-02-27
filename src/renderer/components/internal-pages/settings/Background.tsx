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
  const shaderPresets = Object.entries(backgrounds).map(([id, shader]) => ({
    id,
    ...shader,
  }));

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
    </>
  );
};
