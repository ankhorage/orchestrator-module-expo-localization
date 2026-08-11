import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, test } from 'bun:test';

import {
  EXPO_LOCALIZATION_ADMIN_OPERATIONS,
  type ExpoLocalizationAdminHostContext,
  expoLocalizationAdminRuntime,
  type ExpoLocalizationAdminSnapshot,
} from '../src/host';
import { writeExpoLocalizationDictionary } from '../src/resources';

describe('localization admin authoring state', () => {
  test('derives fields, filters, and missing translations from package-owned domain APIs', async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), 'localization-admin-load-'));
    try {
      await writeExpoLocalizationDictionary({
        projectRoot,
        locale: 'en',
        dictionary: { 'home.title': 'Welcome' },
      });
      const context: ExpoLocalizationAdminHostContext = {
        projectRoot,
        readConfig: () => Promise.resolve({ defaultLocale: 'en', locales: ['en', 'de'] }),
        reconfigureConfig: () => Promise.reject(new Error('unexpected reconfigure')),
        readAuthoringContext: () => Promise.resolve(AUTHORING_CONTEXT),
        mutateManifestField: () => Promise.reject(new Error('unexpected mutation')),
      };

      const result = await expoLocalizationAdminRuntime.execute(context, {
        operation: EXPO_LOCALIZATION_ADMIN_OPERATIONS.load,
        input: { filter: 'missing-translations' },
      });
      if (!isAdminSnapshot(result)) throw new Error('expected localization admin snapshot');
      expect(result.fields.map(({ nodeId }) => nodeId)).toEqual(['title', 'subtitle']);
      expect(result.visibleFields.map(({ nodeId }) => nodeId)).toEqual(['title']);
      expect(result.missingTranslations).toEqual([
        { key: 'home.title', missingLocales: ['de'], fieldCount: 1 },
      ]);
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });
});

function isAdminSnapshot(value: unknown): value is ExpoLocalizationAdminSnapshot {
  return typeof value === 'object' && value !== null && 'fields' in value && 'visibleFields' in value;
}

const AUTHORING_CONTEXT = {
  screens: [
    {
      id: 'home',
      root: {
        id: 'root',
        type: 'Box',
        children: [
          { id: 'title', type: 'Text', props: { text: 'Welcome', i18nKey: 'home.title' } },
          { id: 'subtitle', type: 'Text', props: { text: 'Subheading' } },
        ],
      },
    },
  ],
  componentMeta: {
    Text: { i18n: { fields: [{ keyProp: 'i18nKey', defaultTextProp: 'text' }] } },
  },
} as const;
