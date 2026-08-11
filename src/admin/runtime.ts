import { expoLocalizationConfigAdminOperations } from './configOperations';
import { expoLocalizationDictionaryAdminOperations } from './dictionaryOperations';
import { linkExpoLocalizationTranslationKey } from './linkTranslationKey';
import { loadExpoLocalizationAdmin } from './load';

export const expoLocalizationAdminRuntime = {
  kind: 'module-admin-runtime',
  load: loadExpoLocalizationAdmin,
  config: expoLocalizationConfigAdminOperations,
  dictionaries: expoLocalizationDictionaryAdminOperations,
  linkTranslationKey: linkExpoLocalizationTranslationKey,
} as const;

export type {
  ExpoLocalizationAdminAuthoringContext,
  ExpoLocalizationAdminHostContext,
  ExpoLocalizationAdminLoadOptions,
  ExpoLocalizationAdminSnapshot,
  ExpoLocalizationLinkTranslationInput,
  ExpoLocalizationManifestFieldMutation,
} from './types';
