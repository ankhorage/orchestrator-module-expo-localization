import { describe, expect, test } from 'bun:test';

import { parseExpoLocalizationModuleConfig } from '../src/config';

describe('parseExpoLocalizationModuleConfig', () => {
  test('returns defaults for empty input', () => {
    const result = parseExpoLocalizationModuleConfig(undefined);

    expect(result.defaultLocale).toBe('en');
    expect(result.locales).toEqual(['en']);
    expect(result.translations).toEqual({});
  });

  test('parses valid locales and defaultLocale', () => {
    const result = parseExpoLocalizationModuleConfig({
      locales: ['en', 'de'],
      defaultLocale: 'de',
    });

    expect(result.locales).toEqual(['en', 'de']);
    expect(result.defaultLocale).toBe('de');
  });

  test('parses translations', () => {
    const result = parseExpoLocalizationModuleConfig({
      locales: ['en', 'de'],
      defaultLocale: 'en',
      translations: {
        en: { hello: 'Hello', app_title: 'My App' },
        de: { hello: 'Hallo', app_title: 'Meine App' },
      },
    });

    expect(result.translations).toEqual({
      en: { hello: 'Hello', app_title: 'My App' },
      de: { hello: 'Hallo', app_title: 'Meine App' },
    });
  });

  test('falls back to empty translations for invalid translations value', () => {
    const result = parseExpoLocalizationModuleConfig({ translations: 'not-an-object' });

    expect(result.translations).toEqual({});
  });

  test('falls back to empty translations when a locale entry is not an object', () => {
    const result = parseExpoLocalizationModuleConfig({
      translations: { en: ['not', 'an', 'object'] },
    });

    expect(result.translations).toEqual({});
  });

  test('falls back to empty translations when a value is not a string', () => {
    const result = parseExpoLocalizationModuleConfig({
      translations: { en: { hello: 42 } },
    });

    expect(result.translations).toEqual({});
  });

  test('deduplicates and trims locales', () => {
    const result = parseExpoLocalizationModuleConfig({
      locales: [' en ', 'en', 'de', ''],
    });

    expect(result.locales).toEqual(['en', 'de']);
  });
});
