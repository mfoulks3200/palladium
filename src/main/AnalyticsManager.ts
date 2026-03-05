import { PostHog } from 'posthog-node';
import { app } from 'electron';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';

/**
 * PostHog project write-only ingestion token.
 * This key is safe to ship in the client bundle — it can only send events, not
 * read data. Override via POSTHOG_API_KEY environment variable if needed.
 */
const POSTHOG_API_KEY =
  process.env.POSTHOG_API_KEY ?? 'phc_XmGGv0hV2OkCQxC56D6tlOII9KOTYIxNGz2lCgaE71a';
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

  /** Flush pending events and shut down the PostHog client gracefully. */
  public async shutdown(): Promise<void> {
    if (this.client) {
      await this.client.shutdown();
    }
  }
}
