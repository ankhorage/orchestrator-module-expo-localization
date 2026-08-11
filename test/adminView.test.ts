import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, test } from 'bun:test';

import { readExpoLocalizationAdminSnapshot } from '../src/admin-view/readSnapshot';

describe('localization admin view', () => {
  test('registers a package-owned view without Studio knowledge', async () => {
    const entrypoint = await readFile(join(process.cwd(), 'src/admin-view/index.ts'), 'utf8');
    const files = await Promise.all(
      ['ExpoLocalizationAdminView.tsx', 'useLocalizationAdmin.ts', 'types.ts'].map((file) =>
        readFile(join(process.cwd(), 'src/admin-view', file), 'utf8'),
      ),
    );

    expect(entrypoint).toContain('id: EXPO_LOCALIZATION_MODULE_ID');
    expect(entrypoint).toContain('View: ExpoLocalizationAdminView');
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
