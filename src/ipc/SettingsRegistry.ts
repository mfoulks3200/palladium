import * as z from 'zod';
import { GetPathType, NestedKeysOf } from './Utility';
import { backgrounds } from '@/lib/backgrounds';

const settingsRegistryItem = z.registry<{
  introducedIn: string;
  description?: string;
}>();

export const settingsSchema = z.object({
  searchEngines: z
    .object({
      defaultEngines: z
        .object({
          google: z.boolean().default(true).register(settingsRegistryItem, {
            introducedIn: '0.0.5',
          }),
          bing: z.boolean().default(true).register(settingsRegistryItem, {
            introducedIn: '0.0.5',
          }),
          duckDuckGo: z.boolean().default(true).register(settingsRegistryItem, {
            introducedIn: '0.0.5',
          }),
        })
        .prefault({}),
      custom: z
        .array(
          z.object({
            name: z.string(),
            shortcut: z.string(),
            urlPattern: z.string(),
          }),
        )
        .default([])
        .register(settingsRegistryItem, {
          introducedIn: '0.0.5',
        }),
    })
    .prefault({}),
  analytics: z
    .object({
      enabled: z.boolean().default(true).register(settingsRegistryItem, {
        introducedIn: '0.0.6',
        description:
          'Send anonymous usage analytics to help improve Palladium. No URLs or personal information are ever collected.',
      }),
    })
    .prefault({}),
  personalization: z
    .object({
      userInterface: z
        .object({
          tintColor: z.hex().length(6).default('000000'),
          transparency: z.number().gt(0).lte(1).default(0.75),
          blur: z.number().gte(0).lte(50).default(8),
          backdropSaturation: z.number().gte(0).lte(500).default(200),
        })
        .prefault({}),
      background: z
        .discriminatedUnion('type', [
          z.object({
            type: z.literal('presetShader'),
            id: z.enum(
              Object.keys(
                backgrounds,
              ) as unknown as (keyof typeof backgrounds)[],
            ),
            speed: z.number().gt(-10).lt(10),
            maxFps: z.number().gte(0).lt(120),
          }),
        ])
        .default({
          type: 'presetShader',
          id: 'rainbow',
          speed: 0.1,
          maxFps: 10,
        }),
    })
    .prefault({}),
});

export type SettingSchema = z.infer<typeof settingsSchema>;

export type SettingsKeys = NestedKeysOf<SettingSchema>;

export type SettingKeyType<T extends SettingsKeys> = GetPathType<
  SettingSchema,
  T
>;

const getDefaults = <Schema extends z.ZodObject>(
  schema: Schema,
): SettingSchema => {
  return schema.parse({}) as SettingSchema;
};

export const settingsDefaults = getDefaults(settingsSchema);
