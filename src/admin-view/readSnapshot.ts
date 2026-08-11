import type {
  ExpoLocalizationMissingTranslation,
  ExpoLocalizationTranslatableField,
} from '../authoring';
import type { ExpoLocalizationAdminSnapshot } from '../admin/types';
import { parseExpoLocalizationModuleConfig } from '../config';
import type { ExpoLocalizationDictionaries, ExpoLocalizationDictionary } from '../resources';

export function readExpoLocalizationAdminSnapshot(value: unknown): ExpoLocalizationAdminSnapshot {
  const record = requireRecord(value, 'Localization admin snapshot');
  return {
    config: parseExpoLocalizationModuleConfig(record.config),
    dictionaries: readDictionaries(record.dictionaries),
    fields: readFields(record.fields),
    visibleFields: readFields(record.visibleFields),
    missingTranslations: readMissingTranslations(record.missingTranslations),
  };
}

function readDictionaries(value: unknown): ExpoLocalizationDictionaries {
  const record = requireRecord(value, 'Localization dictionaries');
  const result: Record<string, ExpoLocalizationDictionary> = {};
  for (const [locale, dictionary] of Object.entries(record)) {
    result[locale] = readDictionary(dictionary, locale);
  }
  return result;
}

function readDictionary(value: unknown, locale: string): ExpoLocalizationDictionary {
  const record = requireRecord(value, `Dictionary '${locale}'`);
  const result: Record<string, string> = {};
  for (const [key, translation] of Object.entries(record)) {
    if (typeof translation !== 'string') throw new Error(`Dictionary '${locale}' is invalid.`);
    result[key] = translation;
  }
  return result;
}

function readFields(value: unknown): ExpoLocalizationTranslatableField[] {
  if (!Array.isArray(value) || !value.every(isTranslatableField)) {
    throw new Error('Localization translatable fields are invalid.');
  }
  return value;
}

function isTranslatableField(value: unknown): value is ExpoLocalizationTranslatableField {
  if (!isRecord(value)) return false;
  return ['screenId', 'nodeId', 'componentName', 'keyProp', 'defaultTextProp', 'currentKey', 'defaultText', 'path'].every(
    (key) => typeof value[key] === 'string',
  );
}

function readMissingTranslations(value: unknown): ExpoLocalizationMissingTranslation[] {
  if (!Array.isArray(value) || !value.every(isMissingTranslation)) {
    throw new Error('Localization missing-translation state is invalid.');
  }
  return value;
}

function isMissingTranslation(value: unknown): value is ExpoLocalizationMissingTranslation {
  return (
    isRecord(value) &&
    typeof value.key === 'string' &&
    typeof value.fieldCount === 'number' &&
    Array.isArray(value.missingLocales) &&
    value.missingLocales.every((locale) => typeof locale === 'string')
  );
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${label} is invalid.`);
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
