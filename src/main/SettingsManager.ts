import {
  settingsSchema,
  SettingKeyType,
  SettingSchema,
  SettingsKeys,
  settingsDefaults,
} from 'src/ipc/SettingsRegistry';
import { dialog } from 'electron';
import { typedWebContents, typedIpcMain } from './ipc';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { getDeepProp, setDeepProp } from 'src/ipc/Utility';
import { AnalyticsManager } from './AnalyticsManager';
import { rebindCommandBarShortcut } from './GlobalShortcuts';

const dataPath = path.join(os.homedir(), '.palladium', 'settings.json');
const dataDir = path.dirname(dataPath);

export class SettingsManager {
  private static instance: SettingsManager;
  private needsRecoveryCopy = false;
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

    typedIpcMain.on('settings-sync', (event, newSettings) => {
      const previousSettings = this.currentSettings;
      const prevAnalytics = this.getItem('analytics.enabled');
      const prevShortcut = this.getItem('shortcuts.commandBar');
      const candidate = settingsSchema.parse(newSettings);
      const shortcutRejected =
        prevShortcut !== candidate.shortcuts.commandBar &&
        !rebindCommandBarShortcut(candidate.shortcuts.commandBar);
      const requestedShortcut = candidate.shortcuts.commandBar;
      if (shortcutRejected) candidate.shortcuts.commandBar = prevShortcut;
      this.currentSettings = candidate;
      try {
        this.persist();
      } catch (error) {
        this.currentSettings = previousSettings;
        const shortcutRestored =
          shortcutRejected ||
          requestedShortcut === prevShortcut ||
          rebindCommandBarShortcut(prevShortcut);
        typedWebContents(event.sender).send('shortcut-rejected', {
          requested: requestedShortcut,
          actual: prevShortcut,
        });
        dialog.showErrorBox(
          'Settings could not be saved',
          shortcutRestored
            ? 'Your settings could not be saved. The previous shortcut has been kept.'
            : 'Your settings could not be saved, and the system could not restore the previous shortcut. Restart Palladium to retry.',
        );
        throw error;
      }
      if (shortcutRejected) {
        typedWebContents(event.sender).send('shortcut-rejected', {
          requested: requestedShortcut,
          actual: prevShortcut,
        });
        dialog.showErrorBox(
          'Shortcut unavailable',
          'The system could not register that shortcut. Your previous shortcut has been kept.',
        );
      }

      // Reflect analytics opt-in/out changes immediately so toggling the
      // setting in the UI takes effect without an app restart.
      const nextAnalytics = this.getItem('analytics.enabled');
      if (prevAnalytics !== nextAnalytics) {
        AnalyticsManager.getInstance().setEnabled(nextAnalytics);
      }
    });

    this.initializeAndLoadSettings();
  }

  private initializeAndLoadSettings() {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(dataPath)) {
      this.currentSettings = settingsSchema.parse({});
      this.persist();
    } else {
      try {
        const settings = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        this.deserializeSettings(settings);
      } catch (e) {
        console.error('Could not read or decode settings file: ', e);
        this.currentSettings = settingsSchema.parse({
          analytics: { enabled: false },
        });
        this.needsRecoveryCopy = true;
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
    const temporaryPath = `${dataPath}.${randomUUID()}.tmp`;
    try {
      fs.writeFileSync(
        temporaryPath,
        JSON.stringify(this.currentSettings, null, 2),
        { mode: 0o600, flag: 'wx' },
      );
      if (this.needsRecoveryCopy) {
        fs.copyFileSync(
          dataPath,
          `${dataPath}.unreadable-${Date.now()}`,
          fs.constants.COPYFILE_EXCL,
        );
        this.needsRecoveryCopy = false;
      }
      fs.renameSync(temporaryPath, dataPath);
    } catch (error) {
      try {
        fs.unlinkSync(temporaryPath);
      } catch {
        /* No temporary file to remove. */
      }
      throw error;
    }
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
