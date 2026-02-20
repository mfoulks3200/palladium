import {
  settingsSchema,
  SettingKeyType,
  SettingSchema,
  SettingsKeys,
  settingsDefaults,
} from 'src/ipc/SettingsRegistry';
import { typedIpcMain, typedWebContents } from './ipc';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { diffObjects, getDeepProp, setDeepProp } from 'src/ipc/Utility';

import * as z from 'zod';

const dataPath = path.join(os.homedir(), '.palladium', 'settings.json');
const dataDir = path.dirname(dataPath);

export class SettingsManager {
  private static instance: SettingsManager;
  private currentSettings: Partial<SettingSchema> = {} as const;

  public static getInstance() {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  private constructor() {
    typedIpcMain.on('settings-sync', (_event, newSettings) => {
      if (!newSettings) {
        typedWebContents(_event.sender).send(
          'settings-sync',
          settingsSchema.parse(this.currentSettings),
        );
      } else {
        this.currentSettings = diffObjects(settingsDefaults, newSettings);

        this.persist();
      }
    });

    this.initializeAndLoadSettings();

    this.persist();
  }

  private initializeAndLoadSettings() {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(dataPath)) {
      fs.writeFileSync(dataPath, '{}');
    } else {
      try {
        const settings = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        this.deserializeSettings(settings);
      } catch (e) {
        console.error('Could not read or decode settings file: ', e);
      }
    }
  }

  private serializeSettings() {
    return this.currentSettings;
  }

  private deserializeSettings(serializedSettings: Partial<SettingSchema>) {
    this.currentSettings = settingsSchema.parse(serializedSettings, {});
  }

  public persist() {
    const dataPath = path.join(os.homedir(), '.palladium', 'settings.json');
    fs.writeFileSync(dataPath, JSON.stringify(this.currentSettings, null, 2));
  }

  public setItem<T extends SettingsKeys>(
    key: T,
    value: SettingKeyType<T>,
  ): void {
    this.currentSettings = setDeepProp(
      this.currentSettings as Required<SettingSchema>,
      key,
      value,
    ) as Partial<SettingSchema>;
    this.persist();
  }

  public getItem<T extends SettingsKeys>(key: T): SettingKeyType<T> {
    let prop = getDeepProp(this.currentSettings as SettingSchema, key);
    return prop ?? getDeepProp(settingsDefaults, key)!;
  }
}
