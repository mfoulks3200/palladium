import { z } from 'zod';
import { settingsSchema } from './SettingsRegistry';

const tabId = z.string().min(1).max(128);
const index = z.number().int().nonnegative();
const coordinate = z.number().nonnegative().max(100000);
const dimension = z.number().nonnegative().max(100000);
export const overlayOptionsSchema = z.object({
  position: z.object({
    x: coordinate,
    y: coordinate,
    width: dimension,
    height: dimension,
  }),
});
const navigationUrl = z
  .string()
  .min(1)
  .max(32768)
  .refine((value) => {
    try {
      return ['http:', 'https:', 'file:', 'about:', 'palladium:'].includes(
        new URL(value).protocol,
      );
    } catch {
      return false;
    }
  }, 'Unsupported navigation URL');
export const tabActionsSchema = z.object({
  action: z.enum([
    'back',
    'forward',
    'refresh',
    'hard-refresh',
    'mute',
    'unmute',
  ]),
});
export const commandBarSchema = z.object({
  action: z.enum(['open', 'close']),
  tabUuid: tabId.optional(),
});
export const commandInputSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('suggestions'),
    provider: z.string().optional(),
    input: z.string(),
  }),
  z.object({
    mode: z.literal('execute'),
    provider: z.string().optional(),
    input: z.string(),
    command: z.string(),
    tabUuid: tabId.optional(),
  }),
]);
export const captureExceptionSchema = z.object({
  message: z.string(),
  stack: z.string(),
  name: z.string(),
  source: z.string(),
});
export const windowActionSchema = z.object({
  action: z.enum(['close', 'minimize', 'maximize']),
});
export const mediaControlSchema = z.object({
  mediaId: z.string().min(1),
  action: z.enum(['play', 'pause', 'next', 'previous']),
});

// Tuple schemas validate argument counts as well as payloads. Both the types
// and preload allowlists are derived from these registries.
export const rendererEventSchemas = {
  'request-tab-meta': z.tuple([]),
  'update-active-tab': z.tuple([z.object({ activeTabUuid: tabId })]),
  'update-tab-url': z.tuple([z.object({ newUrl: navigationUrl })]),
  'open-new-tab': z.tuple([z.object({ newUrl: navigationUrl })]),
  'close-tab': z.tuple([z.object({ uuid: tabId })]),
  'tab-actions': z.tuple([tabActionsSchema]),
  'reorder-tab': z.tuple([z.object({ startIndex: index, finishIndex: index })]),
  'tab-context-menu': z.tuple([z.object({ uuid: tabId })]),
  'app-resize': z.tuple([z.object({ width: dimension, height: dimension })]),
  'browser-layout-change': z.tuple([overlayOptionsSchema]),
  'devtools-layout-change': z.tuple([overlayOptionsSchema]),
  'command-bar': z.tuple([commandBarSchema]),
  'settings-sync': z.tuple([settingsSchema]),
  'clear-history': z.tuple([]),
  'feature-flags-refresh': z.tuple([]),
  'capture-exception': z.tuple([captureExceptionSchema]),
  'window-action': z.tuple([windowActionSchema]),
  'open-settings': z.tuple([]),
  'media-control': z.tuple([mediaControlSchema]),
};
export const extensionAction = z.discriminatedUnion('action', [
  z.object({ action: z.literal('list') }),
  z.object({ action: z.literal('install') }),
  z.object({ action: z.enum(['enable', 'disable', 'remove']), id: z.uuid() }),
]);

export const rendererInvocationSchemas = {
  'manage-extensions': z.tuple([extensionAction]),
  'get-history': z.tuple([
    z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
  ]),
  'get-system-meta': z.tuple([]),
  'get-settings': z.tuple([]),
  'get-feature-flags': z.tuple([]),
  'command-input': z.tuple([commandInputSchema]),
};
export type RendererToMainEvents = {
  [K in keyof typeof rendererEventSchemas]: z.output<
    (typeof rendererEventSchemas)[K]
  >;
};
export type RendererInvocationArgs = {
  [K in keyof typeof rendererInvocationSchemas]: z.output<
    (typeof rendererInvocationSchemas)[K]
  >;
};
export type OverlayOptions = z.output<typeof overlayOptionsSchema>;
export type TabActionsIpc = z.output<typeof tabActionsSchema>;
export type CommandBarIpc = z.output<typeof commandBarSchema>;
export type CommandInputIpc = z.output<typeof commandInputSchema>;
export type CaptureExceptionIpc = z.output<typeof captureExceptionSchema>;
export type WindowActionIpc = z.output<typeof windowActionSchema>;
export type MediaControlIpc = z.output<typeof mediaControlSchema>;
