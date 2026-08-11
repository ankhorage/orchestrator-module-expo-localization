export interface ExpoLocalizationModuleConfig {
  defaultLocale?: string;
  locales?: readonly string[];
}

export interface NormalizedExpoLocalizationModuleConfig {
  defaultLocale: string;
  locales: string[];
}

export class ExpoLocalizationConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExpoLocalizationConfigError';
  }
}

export function parseExpoLocalizationModuleConfig(
  input: unknown,
): NormalizedExpoLocalizationModuleConfig {
  const record = isRecord(input) ? input : {};
  const parsedDefaultLocale = parseLocale(record.defaultLocale);
  const locales = Array.isArray(record.locales)
    ? uniqueLocales(record.locales.map(parseLocale).filter(isDefined))
    : [];
  const defaultLocale = parsedDefaultLocale ?? locales[0] ?? 'en';

  if (!locales.includes(defaultLocale)) {
    locales.push(defaultLocale);
  }

  return { defaultLocale, locales };
}

export function normalizeExpoLocalizationLocale(input: string): string {
  const locale = parseLocale(input);
  if (!locale) {
    throw new ExpoLocalizationConfigError(`Invalid locale: ${JSON.stringify(input)}.`);
  }
  return locale;
}

export function addExpoLocalizationLocale(
  config: ExpoLocalizationModuleConfig,
  localeInput: string,
): NormalizedExpoLocalizationModuleConfig {
  const normalized = parseExpoLocalizationModuleConfig(config);
  const locale = normalizeExpoLocalizationLocale(localeInput);
  if (!normalized.locales.includes(locale)) {
    normalized.locales.push(locale);
  }
  return normalized;
}

export function removeExpoLocalizationLocale(
  config: ExpoLocalizationModuleConfig,
  localeInput: string,
): NormalizedExpoLocalizationModuleConfig {
  const normalized = parseExpoLocalizationModuleConfig(config);
  const locale = normalizeExpoLocalizationLocale(localeInput);
  if (!normalized.locales.includes(locale)) {
    return normalized;
  }
  if (normalized.locales.length === 1) {
    throw new ExpoLocalizationConfigError('The final configured locale cannot be removed.');
  }

  const locales = normalized.locales.filter((candidate) => candidate !== locale);
  return {
    locales,
    defaultLocale:
      normalized.defaultLocale === locale
        ? (locales[0] ?? normalized.defaultLocale)
        : normalized.defaultLocale,
  };
}

export function setExpoLocalizationDefaultLocale(
  config: ExpoLocalizationModuleConfig,
  localeInput: string,
): NormalizedExpoLocalizationModuleConfig {
  const normalized = parseExpoLocalizationModuleConfig(config);
  const defaultLocale = normalizeExpoLocalizationLocale(localeInput);
  if (!normalized.locales.includes(defaultLocale)) {
    throw new ExpoLocalizationConfigError(
      `Default locale ${JSON.stringify(defaultLocale)} is not configured.`,
    );
  }
  return { ...normalized, defaultLocale };
}

function parseLocale(input: unknown): string | undefined {
  if (typeof input !== 'string') return undefined;
  const candidate = input.trim().replaceAll('_', '-');
  if (!candidate) return undefined;

  try {
    return Intl.getCanonicalLocales(candidate)[0];
  } catch {
    return undefined;
  }
}

function uniqueLocales(locales: readonly string[]): string[] {
  return [...new Set(locales)];
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
