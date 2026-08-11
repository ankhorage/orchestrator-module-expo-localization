import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, test } from 'bun:test';

import { readExpoLocalizationAdminSnapshot } from '../src/admin-view/readSnapshot';

describe('localization admin view', () => {
  test('registers a package-owned view without Studio knowledge', async () => {
    const entrypoint = await readFile(join(process.cwd(), 'src/admin-view/index.ts'), 'utf8');
    const files = await readAdminViewSources();

    expect(entrypoint).toContain('id: EXPO_LOCALIZATION_MODULE_ID');
    expect(entrypoint).toContain('View: ExpoLocalizationAdminView');
    expect(files).not.toContain('@ankhorage/studio');
  });

  test('keeps browser UI imports out of server dependency graphs', async () => {
    const entrypoint = await readFile(join(process.cwd(), 'src/admin-view/index.ts'), 'utf8');
    const files = await readAdminViewSources();
    const operations = await readFile(join(process.cwd(), 'src/admin/operations.ts'), 'utf8');
    const id = await readFile(join(process.cwd(), 'src/id.ts'), 'utf8');
    const moduleSource = await readFile(join(process.cwd(), 'src/module.ts'), 'utf8');

    expect(files).not.toContain('../admin/runtime');
    expect(files).toContain('../admin/operations');
    expect(entrypoint).not.toContain('../module');
    expect(entrypoint).toContain('../id');
    expect(operations).not.toContain('node:');
    expect(operations).not.toContain('./dictionaryOperations');
    expect(operations).not.toContain('./configOperations');
    expect(operations).not.toContain('./load');
    expect(id).not.toContain('node:');
    expect(id).not.toContain('resources');
    expect(moduleSource).toContain("from './id'");
    expect(moduleSource).not.toContain('export const EXPO_LOCALIZATION_MODULE_ID');
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

async function readAdminViewSources(): Promise<string> {
  const names = [
    'DictionaryEditorCard.tsx',
    'ExpoLocalizationAdminView.tsx',
    'LocaleManagementCard.tsx',
    'MissingTranslationsCard.tsx',
    'TranslatableFieldRow.tsx',
    'TranslatableFieldsCard.tsx',
    'readSnapshot.ts',
    'types.ts',
    'useLocalizationAdmin.ts',
  ];
  return (
    await Promise.all(
      names.map((file) => readFile(join(process.cwd(), 'src/admin-view', file), 'utf8')),
    )
  ).join('\n');
}
