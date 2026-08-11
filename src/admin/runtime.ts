import { expoLocalizationConfigAdminOperations } from './configOperations';
import { expoLocalizationDictionaryAdminOperations } from './dictionaryOperations';
import { linkExpoLocalizationTranslationKey } from './linkTranslationKey';
import { loadExpoLocalizationAdmin } from './load';
import type {
  ExpoLocalizationAdminHostContext,
  ExpoLocalizationAdminInvocation,
  ExpoLocalizationAdminLoadOptions,
  ExpoLocalizationLinkTranslationInput,
} from './types';

export const EXPO_LOCALIZATION_ADMIN_OPERATIONS = {
  load: 'load',
  addLocale: 'config.add-locale',
  removeLocale: 'config.remove-locale',
  setDefaultLocale: 'config.set-default-locale',
  setTranslation: 'dictionary.set-translation',
  deleteTranslation: 'dictionary.delete-translation',
  linkTranslationKey: 'link-translation-key',
} as const;

export const expoLocalizationAdminRuntime = {
  kind: 'module-admin-runtime',
  execute: executeExpoLocalizationAdminOperation,
} as const;

export async function executeExpoLocalizationAdminOperation(
  context: ExpoLocalizationAdminHostContext,
  invocation: ExpoLocalizationAdminInvocation,
): Promise<unknown> {
  switch (invocation.operation) {
    case EXPO_LOCALIZATION_ADMIN_OPERATIONS.load:
      return await loadExpoLocalizationAdmin(context, readLoadOptions(invocation.input));
    case EXPO_LOCALIZATION_ADMIN_OPERATIONS.addLocale:
      return await expoLocalizationConfigAdminOperations.addLocale(
        context,
        readRequiredString(invocation.input, 'locale'),
      );
    case EXPO_LOCALIZATION_ADMIN_OPERATIONS.removeLocale:
      return await expoLocalizationConfigAdminOperations.removeLocale(
        context,
        readRequiredString(invocation.input, 'locale'),
      );
    case EXPO_LOCALIZATION_ADMIN_OPERATIONS.setDefaultLocale:
      return await expoLocalizationConfigAdminOperations.setDefaultLocale(
        context,
        readRequiredString(invocation.input, 'locale'),
      );
    case EXPO_LOCALIZATION_ADMIN_OPERATIONS.setTranslation:
      return await expoLocalizationDictionaryAdminOperations.setTranslation(
        context,
        readSetTranslationInput(invocation.input),
      );
    case EXPO_LOCALIZATION_ADMIN_OPERATIONS.deleteTranslation:
      return await expoLocalizationDictionaryAdminOperations.deleteTranslation(
        context,
        readDeleteTranslationInput(invocation.input),
      );
    case EXPO_LOCALIZATION_ADMIN_OPERATIONS.linkTranslationKey:
      return await linkExpoLocalizationTranslationKey(context, readLinkInput(invocation.input));
    default:
      throw new Error(`Unsupported Localization admin operation '${invocation.operation}'.`);
  }
}

function readLoadOptions(input: unknown): ExpoLocalizationAdminLoadOptions {
  if (input === undefined) return {};
  const record = requireRecord(input);
  const searchQuery = readOptionalString(record.searchQuery, 'searchQuery');
  const filter = readFilter(record.filter);
  return {
    ...(searchQuery === undefined ? {} : { searchQuery }),
    ...(filter === undefined ? {} : { filter }),
  };
}

function readSetTranslationInput(input: unknown): {
  readonly locale: string;
  readonly key: string;
  readonly value: string;
} {
  const record = requireRecord(input);
  return {
    locale: readString(record.locale, 'locale'),
    key: readString(record.key, 'key'),
    value: readString(record.value, 'value'),
  };
}

function readDeleteTranslationInput(input: unknown): {
  readonly locale: string;
  readonly key: string;
} {
  const record = requireRecord(input);
  return {
    locale: readString(record.locale, 'locale'),
    key: readString(record.key, 'key'),
  };
}

function readLinkInput(input: unknown): ExpoLocalizationLinkTranslationInput {
  const record = requireRecord(input);
  const value = readOptionalString(record.value, 'value');
  return {
    screenId: readString(record.screenId, 'screenId'),
    nodeId: readString(record.nodeId, 'nodeId'),
    keyProp: readString(record.keyProp, 'keyProp'),
    key: readString(record.key, 'key'),
    ...(value === undefined ? {} : { value }),
  };
}

function readRequiredString(input: unknown, key: string): string {
  return readString(requireRecord(input)[key], key);
}

function requireRecord(value: unknown): Readonly<Record<string, unknown>> {
  if (!isRecord(value)) {
    throw new Error('Localization admin operation input must be an object.');
  }
  return value;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown, key: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Localization admin operation field '${key}' must be a string.`);
  }
  return value;
}

function readOptionalString(value: unknown, key: string): string | undefined {
  if (value === undefined) return undefined;
  return readString(value, key);
}

function readFilter(value: unknown): ExpoLocalizationAdminLoadOptions['filter'] {
  if (value === undefined) return undefined;
  if (
    value === 'all' ||
    value === 'unlinked' ||
    value === 'missing-translations' ||
    value === 'incomplete'
  ) {
    return value;
  }
  throw new Error("Localization admin operation field 'filter' is invalid.");
}

export type {
  ExpoLocalizationAdminAuthoringContext,
  ExpoLocalizationAdminHostContext,
  ExpoLocalizationAdminInvocation,
  ExpoLocalizationAdminLoadOptions,
  ExpoLocalizationAdminSnapshot,
  ExpoLocalizationLinkTranslationInput,
  ExpoLocalizationManifestFieldMutation,
} from './types';
