import {
  addExpoLocalizationLocale,
  type NormalizedExpoLocalizationModuleConfig,
  parseExpoLocalizationModuleConfig,
  removeExpoLocalizationLocale,
  setExpoLocalizationDefaultLocale,
} from '../config';
import type { ExpoLocalizationAdminHostContext } from './types';

export const expoLocalizationConfigAdminOperations = {
  async addLocale(
    context: ExpoLocalizationAdminHostContext,
    locale: string,
  ): Promise<NormalizedExpoLocalizationModuleConfig> {
    return await reconfigure(context, addExpoLocalizationLocale, locale);
  },
  async removeLocale(
    context: ExpoLocalizationAdminHostContext,
    locale: string,
  ): Promise<NormalizedExpoLocalizationModuleConfig> {
    return await reconfigure(context, removeExpoLocalizationLocale, locale);
  },
  async setDefaultLocale(
    context: ExpoLocalizationAdminHostContext,
    locale: string,
  ): Promise<NormalizedExpoLocalizationModuleConfig> {
    return await reconfigure(context, setExpoLocalizationDefaultLocale, locale);
  },
} as const;

async function reconfigure(
  context: ExpoLocalizationAdminHostContext,
  mutate: (
    config: NormalizedExpoLocalizationModuleConfig,
    locale: string,
  ) => NormalizedExpoLocalizationModuleConfig,
  locale: string,
): Promise<NormalizedExpoLocalizationModuleConfig> {
  const current = parseExpoLocalizationModuleConfig(await context.readConfig());
  const next = mutate(current, locale);
  await context.reconfigureConfig(next);
  return next;
}
