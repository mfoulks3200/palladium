import { useSettings } from '@/hooks/settings';
import { ColorPicker } from '@/components/ui/color-picker';
import { SettingsOption } from '../SettingComponents';
import { Slider } from '@/components/ui/slider';

export const UserInterface = () => {
  const [tint, setTint] = useSettings(
    'personalization.userInterface.tintColor',
  );
  const [opacity, setOpacity] = useSettings(
    'personalization.userInterface.transparency',
  );
  const [saturation, setSaturation] = useSettings(
    'personalization.userInterface.backdropSaturation',
  );
  const [blur, setBlur] = useSettings('personalization.userInterface.blur');

  const optionClassNames = 'justify-end';
  return (
    <>
      <SettingsOption name={'Color Tint'} className={optionClassNames}>
        <div className="flex h-full grow items-center justify-center">
          <ColorPicker
            onChange={(v) => {
              setTint((v as unknown as string).substring(1));
            }}
            value={`#${tint}`}
          />
        </div>
      </SettingsOption>
      <SettingsOption name={'Opacity'} className={optionClassNames}>
        <Slider
          defaultValue={[opacity]}
          min={0.25}
          max={1}
          onValueChange={(newVal) => setOpacity(newVal[0])}
          step={0.01}
          className="mx-auto w-full max-w-xs"
          displayValue={(opacity * 100).toFixed(0) + '%'}
        />
      </SettingsOption>
      <SettingsOption name={'Blur'} className={optionClassNames}>
        <Slider
          defaultValue={[blur]}
          min={0}
          max={50}
          onValueChange={(newVal) => setBlur(newVal[0])}
          step={1}
          className="mx-auto w-full max-w-xs"
          displayValue={blur.toFixed(0)}
        />
      </SettingsOption>
      <SettingsOption name={'Saturation'} className={optionClassNames}>
        <Slider
          defaultValue={[saturation]}
          min={0}
          max={500}
          onValueChange={(newVal) => setSaturation(newVal[0])}
          step={1}
          className="mx-auto w-full max-w-xs"
          displayValue={saturation.toFixed(0) + '%'}
        />
      </SettingsOption>
    </>
  );
};
