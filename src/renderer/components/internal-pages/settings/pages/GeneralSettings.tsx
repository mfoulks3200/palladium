import { useContext } from 'react';
import { SettingsContext } from '@/hooks/settings';
import { Checkbox } from '@/components/ui/checkbox';
import { SettingsOption } from '../SettingComponents';

export const AnalyticsSettings = () => {
  const { useSetting } = useContext(SettingsContext);

  const [analyticsEnabled, setAnalyticsEnabled] =
    useSetting('analytics.enabled');

  const optionClassNames = 'justify-end';
  return (
    <>
      <SettingsOption
        name="Send Analytics"
        description="Send anonymous usage analytics to help improve Palladium. No URLs or personal information are ever collected."
        className={optionClassNames}
      >
        <Checkbox
          defaultChecked={analyticsEnabled}
          onCheckedChange={(checked) => setAnalyticsEnabled(!!checked)}
        />
      </SettingsOption>
    </>
  );
};
