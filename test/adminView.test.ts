import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, test } from 'bun:test';

import { expoLocalizationAdminViewContribution } from '../src/admin-view';
import { readExpoLocalizationAdminSnapshot } from '../src/admin-view/readSnapshot';
import { EXPO_LOCALIZATION_MODULE_ID } from '../src/index';

describe('localization admin view', () => {
  test('registers a package-owned view without Studio knowledge', async () => {
    expect(expoLocalizationAdminViewContribution.id).toBe(EXPO_LOCALIZATION_MODULE_ID);
    expect(typeof expoLocalizationAdminViewContribution.View).toBe('function');

    const files = await Promise.all(
      ['ExpoLocalizationAdminView.tsx', 'useLocalizationAdmin.ts', 'types.ts'].map((file) =>
        readFile(join(process.cwd(), 'src/admin-view', file), 'utf8'),
      ),
    );
    expect(files.join('\n')).not.toContain('@ankhorage/studio');
  });

  test('validates opaque runtime snapshots before rendering them', () => {
    const snapshot = readExpoLocalizationAdminSnapshot({
      config: { defaultLocale: 'en', locales: ['en', 'de'] },
      dictionaries: { en: { title: 'Title' }, de: {} },
      fields: [],
      visibleFields: [],
      missingTranslations: [{ key: 'title', missingLocales: ['de'], fieldCount: 1 }],
    });
    expect(snapshot.config).toEqual({ defaultLocale: 'en', locales: ['en', 'de'] });
    expect(snapshot.missingTranslations[0]?.missingLocales).toEqual(['de']);
  });

  test('rejects malformed runtime snapshots', () => {
    expect(() =>
      readExpoLocalizationAdminSnapshot({
        config: { defaultLocale: 'en', locales: ['en'] },
        dictionaries: { en: { title: 42 } },
        fields: [],
        visibleFields: [],
        missingTranslations: [],
      }),
    ).toThrow("Dictionary 'en' is invalid.");
  });
});
