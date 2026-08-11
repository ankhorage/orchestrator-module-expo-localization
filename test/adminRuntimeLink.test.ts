import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, test } from 'bun:test';

import {
  type ExpoLocalizationAdminHostContext,
  expoLocalizationAdminRuntime,
  type ExpoLocalizationManifestFieldMutation,
} from '../src/host';
import { readExpoLocalizationDictionary } from '../src/resources';

describe('localization admin translation linking', () => {
  test('links an eligible field and seeds only the canonical default-locale dictionary', async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), 'localization-admin-link-'));
    const mutations: ExpoLocalizationManifestFieldMutation[] = [];
    const context = createContext(projectRoot, (mutation) => {
      mutations.push(mutation);
      return Promise.resolve();
    });

    try {
      const result = await expoLocalizationAdminRuntime.linkTranslationKey(context, {
        screenId: 'home',
        nodeId: 'title',
        keyProp: 'i18nKey',
        key: ' home.title ',
      });
      expect(result).toEqual({ key: 'home.title', defaultLocale: 'en' });
      expect(mutations).toEqual([
        { screenId: 'home', nodeId: 'title', prop: 'i18nKey', value: 'home.title' },
      ]);
      expect(await readExpoLocalizationDictionary({ projectRoot, locale: 'en' })).toEqual({
        'home.title': 'Welcome',
      });
      expect(await readExpoLocalizationDictionary({ projectRoot, locale: 'de' })).toEqual({});
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });

  test('rejects unsupported fields before mutating the manifest or dictionaries', async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), 'localization-admin-link-'));
    let mutations = 0;
    const context = createContext(projectRoot, () => {
      mutations += 1;
      return Promise.resolve();
    });

    try {
      await expect(
        expoLocalizationAdminRuntime.linkTranslationKey(context, {
          screenId: 'home',
          nodeId: 'unknown',
          keyProp: 'i18nKey',
          key: 'home.unknown',
        }),
      ).rejects.toThrow('not translatable');
      expect(mutations).toBe(0);
      expect(await readExpoLocalizationDictionary({ projectRoot, locale: 'en' })).toEqual({});
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });
});

function createContext(
  projectRoot: string,
  mutateManifestField: ExpoLocalizationAdminHostContext['mutateManifestField'],
): ExpoLocalizationAdminHostContext {
  return {
    projectRoot,
    readConfig: () => Promise.resolve({ defaultLocale: 'en', locales: ['en', 'de'] }),
    reconfigureConfig: () => Promise.reject(new Error('unexpected reconfigure')),
    readAuthoringContext: () =>
      Promise.resolve({
        screens: [
          {
            id: 'home',
            root: {
              id: 'title',
              type: 'Text',
              props: { text: 'Welcome', i18nKey: '' },
            },
          },
        ],
        componentMeta: {
          Text: { i18n: { fields: [{ keyProp: 'i18nKey', defaultTextProp: 'text' }] } },
        },
      }),
    mutateManifestField,
  };
}
