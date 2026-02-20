import { useContext } from 'react';
import { SettingsOption } from '.';
import { SettingsContext } from '@/lib/settings';
import { Checkbox } from '@/components/ui/checkbox';

export const DefaultSearchEngines = () => {
  const { useSetting } = useContext(SettingsContext);

  const [enableGoogle, setEnableGoogle] = useSetting(
    'searchEngines.defaultEngines.google',
  );
  const [enableBing, setEnableBing] = useSetting(
    'searchEngines.defaultEngines.bing',
  );
  const [enableDdg, setEnableDdg] = useSetting(
    'searchEngines.defaultEngines.duckDuckGo',
  );

  const optionClassNames = 'justify-end';
  return (
    <>
      <SettingsOption name={'Google'} className={optionClassNames}>
        <Checkbox
          defaultChecked={enableGoogle}
          onCheckedChange={(checked) => setEnableGoogle(!!checked)}
        />
      </SettingsOption>
      <SettingsOption name={'Bing'} className={optionClassNames}>
        <Checkbox
          defaultChecked={enableBing}
          onCheckedChange={(checked) => setEnableBing(!!checked)}
        />
      </SettingsOption>
      <SettingsOption name={'DuckDuckGo'} className={optionClassNames}>
        <Checkbox
          defaultChecked={enableDdg}
          onCheckedChange={(checked) => setEnableDdg(!!checked)}
        />
      </SettingsOption>
    </>
  );
};
