import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, test } from 'bun:test';

import { type ExpoLocalizationAdminHostContext, expoLocalizationAdminRuntime } from '../src/host';
import { readExpoLocalizationDictionary } from '../src/resources';

describe('localization admin dictionary operations', () => {
  test('edits canonical dictionaries without lifecycle reconfiguration', async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), 'localization-admin-resources-'));
    let reconfigureCount = 0;
    const context: ExpoLocalizationAdminHostContext = {
      projectRoot,
      readConfig: () => Promise.resolve({ defaultLocale: 'en', locales: ['en'] }),
      reconfigureConfig: () => {
        reconfigureCount += 1;
        return Promise.resolve();
      },
      readAuthoringContext: () => Promise.resolve({ screens: [], componentMeta: {} }),
      mutateManifestField: () => Promise.resolve(),
    };

    try {
      await expoLocalizationAdminRuntime.dictionaries.setTranslation(context, {
        locale: 'en',
        key: 'home.title',
        value: 'Welcome',
      });
      expect(await readExpoLocalizationDictionary({ projectRoot, locale: 'en' })).toEqual({
        'home.title': 'Welcome',
      });
      await expoLocalizationAdminRuntime.dictionaries.deleteTranslation(context, {
        locale: 'en',
        key: 'home.title',
      });
      expect(await readExpoLocalizationDictionary({ projectRoot, locale: 'en' })).toEqual({});
      expect(reconfigureCount).toBe(0);
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });
});
