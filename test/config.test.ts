import { describe, expect, test } from 'bun:test';

import {
  addExpoLocalizationLocale,
  ExpoLocalizationConfigError,
  normalizeExpoLocalizationLocale,
  parseExpoLocalizationModuleConfig,
  removeExpoLocalizationLocale,
  setExpoLocalizationDefaultLocale,
} from '../src/config';

describe('expo localization config', () => {
  test('returns a valid default configuration for empty input', () => {
    expect(parseExpoLocalizationModuleConfig(undefined)).toEqual({
      defaultLocale: 'en',
      locales: ['en'],
    });
  });

  test('canonicalizes, deduplicates, and filters locales', () => {
    expect(
      parseExpoLocalizationModuleConfig({
        locales: [' pt_br ', 'pt-BR', 'de', '', 'not a locale'],
        defaultLocale: 'de',
      }),
    ).toEqual({ defaultLocale: 'de', locales: ['pt-BR', 'de'] });
  });

  test('always adds a valid default locale to the configured locale set', () => {
    expect(parseExpoLocalizationModuleConfig({ locales: ['en'], defaultLocale: 'de' })).toEqual({
      defaultLocale: 'de',
      locales: ['en', 'de'],
    });
  });

  test('ignores legacy translations instead of keeping a second writable config copy', () => {
    expect(
      parseExpoLocalizationModuleConfig({
        defaultLocale: 'en',
        locales: ['en'],
        translations: { en: { hello: 'Hello' } },
      }),
    ).toEqual({ defaultLocale: 'en', locales: ['en'] });
  });

  test('adds locales idempotently', () => {
    expect(addExpoLocalizationLocale({ locales: ['en'] }, ' DE ')).toEqual({
      defaultLocale: 'en',
      locales: ['en', 'de'],
    });
    expect(addExpoLocalizationLocale({ locales: ['en', 'de'] }, 'de')).toEqual({
      defaultLocale: 'en',
      locales: ['en', 'de'],
    });
  });

  test('removes locales and selects a deterministic replacement default', () => {
    expect(
      removeExpoLocalizationLocale({ defaultLocale: 'de', locales: ['en', 'de', 'fr'] }, 'de'),
    ).toEqual({ defaultLocale: 'en', locales: ['en', 'fr'] });
  });

  test('prevents removal of the final locale', () => {
    expect(() => removeExpoLocalizationLocale({ locales: ['en'] }, 'en')).toThrow(
      ExpoLocalizationConfigError,
    );
  });

  test('requires a configured default locale', () => {
    expect(setExpoLocalizationDefaultLocale({ locales: ['en', 'de'] }, 'de')).toEqual({
      defaultLocale: 'de',
      locales: ['en', 'de'],
    });
    expect(() => setExpoLocalizationDefaultLocale({ locales: ['en'] }, 'de')).toThrow(
      'Default locale "de" is not configured.',
    );
  });

  test('rejects invalid locale identifiers explicitly', () => {
    expect(() => normalizeExpoLocalizationLocale('../en')).toThrow(ExpoLocalizationConfigError);
  });
});
