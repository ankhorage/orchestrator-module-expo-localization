export interface ExpoLocalizationModuleConfig {
  defaultLocale?: string;
  locales?: string[];
  translations?: Record<string, Record<string, string>>;
}

export function parseExpoLocalizationModuleConfig(
  input: unknown,
): Required<ExpoLocalizationModuleConfig> {
  const fallback: Required<ExpoLocalizationModuleConfig> = {
    defaultLocale: 'en',
    locales: ['en'],
    translations: {},
  };

  if (!isRecord(input)) {
    return fallback;
  }

  const defaultLocale =
    typeof input.defaultLocale === 'string' && input.defaultLocale.trim().length > 0
      ? input.defaultLocale.trim()
      : fallback.defaultLocale;

  const locales =
    Array.isArray(input.locales) && input.locales.every((value) => typeof value === 'string')
      ? Array.from(new Set(input.locales.map((value) => value.trim()).filter(Boolean)))
      : fallback.locales;

  const translations =
    isRecord(input.translations) &&
    Object.values(input.translations).every(
      (value) =>
        isRecord(value) && Object.values(value).every((entry) => typeof entry === 'string'),
    )
      ? (input.translations as Record<string, Record<string, string>>)
      : fallback.translations;

  return {
    defaultLocale,
    locales: locales.length > 0 ? locales : fallback.locales,
    translations,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
