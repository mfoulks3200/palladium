import { PostHog } from 'posthog-node';
import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { typedIpcMain, typedWebContents } from './ipc';
import { CaptureExceptionIpc, FeatureFlagsIpc } from '../ipc';

/**
 * PostHog project write-only ingestion token.
 * This key is safe to ship in the client bundle — it can only send events, not
 * read data. Override via POSTHOG_API_KEY environment variable if needed.
 */
const POSTHOG_API_KEY =
  process.env.POSTHOG_API_KEY ??
  'phc_XmGGv0hV2OkCQxC56D6tlOII9KOTYIxNGz2lCgaE71a';
const POSTHOG_HOST = 'https://us.i.posthog.com';

/** Path to the persistent anonymous identifier file. */
const distinctIdPath = path.join(os.homedir(), '.palladium', 'analytics_id');

/**
 * AnalyticsManager wraps the PostHog Node.js client and provides a simple
 * interface for capturing anonymous usage events throughout the app.
 *
 * Privacy notes:
 * - A random UUID is generated on first launch and reused across sessions.
 *   No OS-level identity (username, hostname, etc.) is ever collected.
 * - URLs and page titles are never sent to PostHog.
 * - Analytics can be disabled by the user via Settings → analytics.enabled.
 */
export class AnalyticsManager {
  private static instance: AnalyticsManager;

  private client: PostHog;

  private distinctId: string;

  private analyticsEnabled: boolean = true;

  private featureFlags: Record<string, string | boolean> = {};

  private flagPollTimer: ReturnType<typeof setInterval> | null = null;

  /** How often (ms) to re-fetch feature flags from PostHog. */
  private static FLAG_POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

  public static getInstance(): AnalyticsManager {
    if (!AnalyticsManager.instance) {
      AnalyticsManager.instance = new AnalyticsManager();
    }
    return AnalyticsManager.instance;
  }

  private constructor() {
    this.distinctId = AnalyticsManager.loadOrCreateDistinctId();
    // Skip PostHog initialization when no API key is configured.
    if (POSTHOG_API_KEY.length === 0) {
      this.analyticsEnabled = false;
      this.client = null as unknown as PostHog;
      return;
    }
    this.client = new PostHog(POSTHOG_API_KEY, {
      host: POSTHOG_HOST,
      flushAt: 20,
      flushInterval: 10000,
    });

    // Perform an initial feature flag fetch and start periodic polling.
    this.refreshFeatureFlags();
    this.flagPollTimer = setInterval(
      () => this.refreshFeatureFlags(),
      AnalyticsManager.FLAG_POLL_INTERVAL,
    );

    // When a renderer window requests the current flags (e.g. on load),
    // respond with the cached state immediately.
    typedIpcMain.handle('get-feature-flags', () => {
      return { flags: this.featureFlags } satisfies FeatureFlagsIpc;
    });

    // Allow any renderer to force a fresh fetch from PostHog.
    typedIpcMain.on('feature-flags-refresh', () => {
      this.refreshFeatureFlags();
    });

    // Forward renderer-side exceptions to PostHog.
    typedIpcMain.on(
      'capture-exception',
      (_event, data: CaptureExceptionIpc) => {
        this.captureException(
          {
            message: data.message,
            stack: data.stack,
            name: data.name,
          } as Error,
          { source: data.source },
        );
      },
    );
  }

  /** Load the persisted anonymous ID or create a new one. */
  private static loadOrCreateDistinctId(): string {
    const dir = path.dirname(distinctIdPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(distinctIdPath)) {
      const existing = fs.readFileSync(distinctIdPath, 'utf8').trim();
      if (existing.length > 0) {
        return existing;
      }
    }
    const id = randomUUID();
    fs.writeFileSync(distinctIdPath, id, 'utf8');
    return id;
  }

  /**
   * Enable or disable analytics at runtime (called by SettingsManager when
   * the analytics.enabled setting changes).
   */
  public setEnabled(enabled: boolean): void {
    this.analyticsEnabled = enabled;
    if (!this.client) return;
    if (!enabled) {
      this.client.optOut();
    } else {
      this.client.optIn();
    }
  }

  /**
   * Capture an anonymous event.
   *
   * @param event      - A snake_case event name (e.g. "app_launched").
   * @param properties - Optional additional properties. Never include URLs or
   *                     personal information.
   */
  public capture(
    event: string,
    properties?: Record<string, string | number | boolean | null>,
  ): void {
    if (!this.analyticsEnabled) return;
    this.client.capture({
      distinctId: this.distinctId,
      event,
      properties: {
        app_version: app.getVersion(),
        platform: process.platform,
        ...properties,
      },
    });
  }

  /**
   * Capture an exception event.
   *
   * @param error  - The Error (or Error-like) object.
   * @param extra  - Optional extra properties (e.g. `{ source: 'main' }`).
   */
  public captureException(error: Error, extra?: Record<string, string>): void {
    this.capture('exception', {
      error_name: error.name,
      error_message: error.message,
      error_stack: error.stack ?? '',
      ...extra,
    });
  }

  // ---------------------------------------------------------------------------
  // Feature Flags
  // ---------------------------------------------------------------------------

  /**
   * Fetch all feature flags for the current distinct ID from PostHog and
   * broadcast them to every open renderer window.
   */
  public async refreshFeatureFlags(): Promise<void> {
    if (!this.client || !this.analyticsEnabled) return;
    try {
      const flags = await this.client.getAllFlags(this.distinctId);
      this.featureFlags = flags;
      this.broadcastFlags();
    } catch (err) {
      console.error('[AnalyticsManager] Failed to fetch feature flags:', err);
    }
  }

  /**
   * Return the current locally-cached value of a single feature flag.
   * Returns `undefined` when the flag has not been fetched yet.
   */
  public getFeatureFlag(key: string): string | boolean | undefined {
    return this.featureFlags[key];
  }

  /** Return all locally-cached feature flags. */
  public getAllFlags(): Record<string, string | boolean> {
    return { ...this.featureFlags };
  }

  /** Send the current flag state to every BrowserWindow's renderer. */
  private broadcastFlags(): void {
    const payload: FeatureFlagsIpc = { flags: this.featureFlags };
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        typedWebContents(win.webContents).send('feature-flags-sync', payload);
      }
    }
  }

  /** Flush pending events and shut down the PostHog client gracefully. */
  public async shutdown(): Promise<void> {
    if (this.flagPollTimer) {
      clearInterval(this.flagPollTimer);
      this.flagPollTimer = null;
    }
    if (this.client) {
      await this.client.shutdown();
    }
  }
}
