import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  settingsSchema,
  SettingKeyType,
  SettingsKeys,
  SettingSchema,
  settingsDefaults,
} from 'src/ipc/SettingsRegistry';
import { getDeepProp, setDeepProp } from 'src/ipc/Utility';
import * as z from 'zod';

type SettingStateFunction = <T extends SettingsKeys>(
  settingKey: T,
) => [SettingKeyType<T>, (newValue: SettingKeyType<T>) => void];

interface SettingsContextState {
  useSetting: SettingStateFunction;
}

export const SettingsContext = createContext<SettingsContextState>({} as any);

export const SettingsProvider = ({ children }: PropsWithChildren) => {
  const [settingsValues, setSettingsValues] =
    useState<SettingSchema>(settingsDefaults);

  useEffect(() => {
    window.electron.ipcRenderer.on('settings-sync', (response) => {
      console.log(response);
      setSettingsValues(response as SettingSchema);
    });

    window.electron.ipcRenderer.sendMessage('settings-sync', null as any);
  }, []);

  const setNewSettingItemValue = <T extends SettingsKeys>(
    settingKey: T,
    value: SettingKeyType<T>,
  ) => {
    setSettingsValues((_oldSettings) => {
      console.log(`Set setting "${settingKey}" to: ${value}`);

      const oldSettings = structuredClone(_oldSettings);

      const newSettings = setDeepProp(
        oldSettings,
        settingKey,
        value,
      ) as SettingSchema;
      window.electron.ipcRenderer.sendMessage('settings-sync', newSettings);
      return newSettings;
    });
  };

  const useSetting = useCallback(
    <T extends SettingsKeys>(
      settingKey: T,
    ): [SettingKeyType<T>, (newValue: SettingKeyType<T>) => void] => {
      const value = getDeepProp(settingsValues, settingKey)!;

      return [
        value,
        (newValue: SettingKeyType<T>) =>
          setNewSettingItemValue(settingKey, newValue),
      ];
    },
    [settingsValues],
  );

  return (
    <SettingsContext.Provider value={{ useSetting }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = <T extends SettingsKeys>(
  settingKey: T,
): [SettingKeyType<T>, (newValue: SettingKeyType<T>) => void] => {
  const Settings = useContext(SettingsContext);
  const settingsHook = Settings.useSetting(settingKey);

  return settingsHook;
};
