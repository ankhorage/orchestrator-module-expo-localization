import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { normalizeExpoLocalizationLocale } from './config';

export type ExpoLocalizationDictionary = Record<string, string>;
export type ExpoLocalizationDictionaries = Record<string, ExpoLocalizationDictionary>;

export const EXPO_LOCALIZATION_RESOURCE_DIRECTORY = 'src/modules/localization/locales';

export class ExpoLocalizationResourceError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ExpoLocalizationResourceError';
  }
}

export function resolveExpoLocalizationDictionaryPath(args: {
  readonly projectRoot: string;
  readonly locale: string;
}): string {
  const locale = normalizeExpoLocalizationLocale(args.locale);
  return path.resolve(args.projectRoot, EXPO_LOCALIZATION_RESOURCE_DIRECTORY, `${locale}.json`);
}

export async function readExpoLocalizationDictionary(args: {
  readonly projectRoot: string;
  readonly locale: string;
}): Promise<ExpoLocalizationDictionary> {
  return (await readDictionaryIfPresent(args)) ?? {};
}

export async function readExpoLocalizationDictionaries(args: {
  readonly projectRoot: string;
  readonly locales: readonly string[];
}): Promise<ExpoLocalizationDictionaries> {
  const dictionaries: ExpoLocalizationDictionaries = {};
  for (const localeInput of args.locales) {
    const locale = normalizeExpoLocalizationLocale(localeInput);
    dictionaries[locale] = await readExpoLocalizationDictionary({
      projectRoot: args.projectRoot,
      locale,
    });
  }
  return dictionaries;
}

export async function writeExpoLocalizationDictionary(args: {
  readonly projectRoot: string;
  readonly locale: string;
  readonly dictionary: Readonly<Record<string, string>>;
}): Promise<ExpoLocalizationDictionary> {
  const dictionary = normalizeDictionary(args.dictionary);
  const dictionaryPath = resolveExpoLocalizationDictionaryPath(args);
  const temporaryPath = `${dictionaryPath}.${process.pid}.${crypto.randomUUID()}.tmp`;
  await mkdir(path.dirname(dictionaryPath), { recursive: true });

  try {
    await writeFile(temporaryPath, `${JSON.stringify(dictionary, null, 2)}\n`, 'utf8');
    await rename(temporaryPath, dictionaryPath);
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
    throw new ExpoLocalizationResourceError(
      `Could not persist the ${JSON.stringify(normalizeExpoLocalizationLocale(args.locale))} localization dictionary.`,
      { cause: error },
    );
  }

  return dictionary;
}

export async function setExpoLocalizationTranslation(args: {
  readonly projectRoot: string;
  readonly locale: string;
  readonly key: string;
  readonly value: string;
}): Promise<ExpoLocalizationDictionary> {
  const key = normalizeTranslationKey(args.key);
  const dictionary = await readExpoLocalizationDictionary(args);
  return await writeExpoLocalizationDictionary({
    ...args,
    dictionary: { ...dictionary, [key]: args.value },
  });
}

export async function deleteExpoLocalizationTranslation(args: {
  readonly projectRoot: string;
  readonly locale: string;
  readonly key: string;
}): Promise<ExpoLocalizationDictionary> {
  const key = normalizeTranslationKey(args.key);
  const dictionary = await readExpoLocalizationDictionary(args);
  delete dictionary[key];
  return await writeExpoLocalizationDictionary({ ...args, dictionary });
}

export async function readExpoLocalizationResourceSeeds(args: {
  readonly projectRoot: string;
  readonly locales: readonly string[];
  readonly legacyTranslations?: unknown;
}): Promise<ExpoLocalizationDictionaries> {
  const legacyTranslations = parseDictionaries(args.legacyTranslations);
  const dictionaries: ExpoLocalizationDictionaries = {};

  for (const localeInput of args.locales) {
    const locale = normalizeExpoLocalizationLocale(localeInput);
    const existing = await readDictionaryIfPresent({ projectRoot: args.projectRoot, locale });
    if (existing) {
      dictionaries[locale] = existing;
      continue;
    }
    if (legacyTranslations[locale]) {
      dictionaries[locale] = legacyTranslations[locale];
    }
  }

  return dictionaries;
}

function normalizeTranslationKey(input: string): string {
  const key = input.trim();
  if (!key) {
    throw new ExpoLocalizationResourceError('Translation keys cannot be empty.');
  }
  return key;
}

function normalizeDictionary(input: Readonly<Record<string, string>>): ExpoLocalizationDictionary {
  if (!isStringRecord(input)) {
    throw new ExpoLocalizationResourceError(
      'Localization dictionaries must contain string values.',
    );
  }
  return Object.fromEntries(
    Object.entries(input)
      .map(([key, value]) => [normalizeTranslationKey(key), value] as const)
      .sort(([left], [right]) => compareText(left, right)),
  );
}

async function readDictionaryIfPresent(args: {
  readonly projectRoot: string;
  readonly locale: string;
}): Promise<ExpoLocalizationDictionary | null> {
  const locale = normalizeExpoLocalizationLocale(args.locale);
  let dictionaryPath: string | null;
  try {
    dictionaryPath = await resolveExistingDictionaryPath({ ...args, locale });
  } catch (error) {
    throw new ExpoLocalizationResourceError(
      `Could not read the ${JSON.stringify(locale)} localization dictionary.`,
      { cause: error },
    );
  }
  if (!dictionaryPath) return null;
  let content: string;
  try {
    content = await readFile(dictionaryPath, 'utf8');
  } catch (error) {
    if (isNotFoundError(error)) return null;
    throw new ExpoLocalizationResourceError(
      `Could not read the ${JSON.stringify(locale)} localization dictionary.`,
      { cause: error },
    );
  }

  try {
    const parsed: unknown = JSON.parse(content);
    if (!isStringRecord(parsed)) throw new Error('Dictionary values must be strings.');
    return normalizeDictionary(parsed);
  } catch (error) {
    throw new ExpoLocalizationResourceError(
      `Invalid localization dictionary for locale ${JSON.stringify(locale)}.`,
      { cause: error },
    );
  }
}

async function resolveExistingDictionaryPath(args: {
  readonly projectRoot: string;
  readonly locale: string;
}): Promise<string | null> {
  const canonicalPath = resolveExpoLocalizationDictionaryPath(args);
  try {
    await readFile(canonicalPath, 'utf8');
    return canonicalPath;
  } catch (error) {
    if (!isNotFoundError(error)) throw error;
  }

  const resourceDirectory = path.resolve(args.projectRoot, EXPO_LOCALIZATION_RESOURCE_DIRECTORY);
  let entries: string[];
  try {
    entries = await readdir(resourceDirectory);
  } catch (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }

  const locale = normalizeExpoLocalizationLocale(args.locale);
  const legacyFile = entries
    .filter((entry) => entry.endsWith('.json'))
    .sort(compareText)
    .find((entry) => tryNormalizeLocale(entry.slice(0, -'.json'.length)) === locale);
  return legacyFile ? path.resolve(resourceDirectory, legacyFile) : null;
}

function parseDictionaries(input: unknown): ExpoLocalizationDictionaries {
  if (!isRecord(input)) return {};
  const dictionaries: ExpoLocalizationDictionaries = {};
  for (const [localeInput, dictionary] of Object.entries(input)) {
    if (!isStringRecord(dictionary)) continue;
    try {
      dictionaries[normalizeExpoLocalizationLocale(localeInput)] = normalizeDictionary(dictionary);
    } catch {
      continue;
    }
  }
  return dictionaries;
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((entry) => typeof entry === 'string');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNotFoundError(error: unknown): boolean {
  return isRecord(error) && error.code === 'ENOENT';
}

function tryNormalizeLocale(locale: string): string | undefined {
  try {
    return normalizeExpoLocalizationLocale(locale);
  } catch {
    return undefined;
  }
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
