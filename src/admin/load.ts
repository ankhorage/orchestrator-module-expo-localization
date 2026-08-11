import {
  collectExpoLocalizationTranslatableFields,
  filterExpoLocalizationTranslatableFields,
  findExpoLocalizationMissingTranslations,
} from '../authoring';
import { parseExpoLocalizationModuleConfig } from '../config';
import { readExpoLocalizationDictionaries } from '../resources';
import type {
  ExpoLocalizationAdminHostContext,
  ExpoLocalizationAdminLoadOptions,
  ExpoLocalizationAdminSnapshot,
} from './types';

export async function loadExpoLocalizationAdmin(
  context: ExpoLocalizationAdminHostContext,
  options: ExpoLocalizationAdminLoadOptions = {},
): Promise<ExpoLocalizationAdminSnapshot> {
  const config = parseExpoLocalizationModuleConfig(await context.readConfig());
  const [dictionaries, authoring] = await Promise.all([
    readExpoLocalizationDictionaries({ projectRoot: context.projectRoot, locales: config.locales }),
    context.readAuthoringContext(),
  ]);
  const fields = collectExpoLocalizationTranslatableFields(authoring);

  return {
    config,
    dictionaries,
    fields,
    missingTranslations: findExpoLocalizationMissingTranslations({
      fields,
      locales: config.locales,
      dictionaries,
    }),
    visibleFields: filterExpoLocalizationTranslatableFields({
      fields,
      locales: config.locales,
      dictionaries,
      ...options,
    }),
  };
}
