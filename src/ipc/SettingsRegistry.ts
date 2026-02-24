import * as z from 'zod';
import { GetPathType, NestedKeysOf } from './Utility';

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
