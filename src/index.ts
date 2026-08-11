export {
  collectExpoLocalizationTranslatableFields,
  createExpoLocalizationKeyFromText,
  type ExpoLocalizationComponentMeta,
  type ExpoLocalizationComponentMetaField,
  type ExpoLocalizationComponentMetaRegistry,
  type ExpoLocalizationFieldFilter,
  type ExpoLocalizationManifestNode,
  type ExpoLocalizationManifestScreen,
  type ExpoLocalizationMissingTranslation,
  type ExpoLocalizationTranslatableField,
  filterExpoLocalizationTranslatableFields,
  findExpoLocalizationMissingTranslations,
} from './authoring';
export {
  addExpoLocalizationLocale,
  ExpoLocalizationConfigError,
  type ExpoLocalizationModuleConfig,
  type NormalizedExpoLocalizationModuleConfig,
  normalizeExpoLocalizationLocale,
  parseExpoLocalizationModuleConfig,
  removeExpoLocalizationLocale,
  setExpoLocalizationDefaultLocale,
} from './config';
export { EXPO_LOCALIZATION_MODULE_ID, expoLocalizationModule } from './module';
export {
  deleteExpoLocalizationTranslation,
  EXPO_LOCALIZATION_RESOURCE_DIRECTORY,
  type ExpoLocalizationDictionaries,
  type ExpoLocalizationDictionary,
  ExpoLocalizationResourceError,
  readExpoLocalizationDictionaries,
  readExpoLocalizationDictionary,
  resolveExpoLocalizationDictionaryPath,
  setExpoLocalizationTranslation,
  writeExpoLocalizationDictionary,
} from './resources';
