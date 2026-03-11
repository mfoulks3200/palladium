import {
  settingsSchema,
  SettingKeyType,
  SettingSchema,
  SettingsKeys,
  settingsDefaults,
} from 'src/ipc/SettingsRegistry';
import { typedIpcMain } from './ipc';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { getDeepProp, setDeepProp } from 'src/ipc/Utility';
import { AnalyticsManager } from './AnalyticsManager';
import { rebindCommandBarShortcut } from './GlobalShortcuts';

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
    typedIpcMain.handle('get-settings', () => {
      return settingsSchema.parse(this.currentSettings);
    });

    typedIpcMain.on('settings-sync', (_event, newSettings) => {
      const prevAnalytics = this.getItem('analytics.enabled');
      const prevShortcut = this.getItem('shortcuts.commandBar');
      this.currentSettings = settingsSchema.parse(newSettings);
      this.persist();

      // Reflect analytics opt-in/out changes immediately so toggling the
      // setting in the UI takes effect without an app restart.
      const nextAnalytics = this.getItem('analytics.enabled');
      if (prevAnalytics !== nextAnalytics) {
        AnalyticsManager.getInstance().setEnabled(nextAnalytics);
      }

      // Rebind the global shortcut if it changed.
      const nextShortcut = this.getItem('shortcuts.commandBar');
      if (prevShortcut !== nextShortcut) {
        rebindCommandBarShortcut(nextShortcut);
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
        this.currentSettings = settingsSchema.parse({});
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
    // Reflect analytics opt-in/out changes immediately. Skip the
    // settings_changed event for this key to avoid capturing after opt-out.
    if (key === 'analytics.enabled') {
      AnalyticsManager.getInstance().setEnabled(value as boolean);
    } else {
      AnalyticsManager.getInstance().capture('settings_changed', {
        setting_key: key,
      });
    }
    this.persist();
  }

  public getItem<T extends SettingsKeys>(key: T): SettingKeyType<T> {
    let prop = getDeepProp(this.currentSettings as SettingSchema, key);
    return prop ?? getDeepProp(settingsDefaults, key)!;
  }
}
