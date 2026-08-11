import { mkdirSync, writeFileSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, test } from 'bun:test';

import {
  deleteExpoLocalizationTranslation,
  ExpoLocalizationResourceError,
  readExpoLocalizationDictionaries,
  readExpoLocalizationDictionary,
  readExpoLocalizationResourceSeeds,
  resolveExpoLocalizationDictionaryPath,
  setExpoLocalizationTranslation,
  writeExpoLocalizationDictionary,
} from '../src/resources';

describe('expo localization dictionary resources', () => {
  test('treats a missing locale resource as an empty dictionary', async () => {
    await withProject(async (projectRoot) => {
      expect(await readExpoLocalizationDictionary({ projectRoot, locale: 'en' })).toEqual({});
    });
  });

  test('creates, updates, sorts, and deletes translation entries atomically', async () => {
    await withProject(async (projectRoot) => {
      await writeExpoLocalizationDictionary({
        projectRoot,
        locale: 'en',
        dictionary: { zebra: 'Zebra', alpha: 'Alpha' },
      });
      expect(
        await readFile(
          resolveExpoLocalizationDictionaryPath({ projectRoot, locale: 'en' }),
          'utf8',
        ),
      ).toBe('{\n  "alpha": "Alpha",\n  "zebra": "Zebra"\n}\n');

      expect(
        await setExpoLocalizationTranslation({
          projectRoot,
          locale: 'en',
          key: ' welcome.title ',
          value: 'Welcome',
        }),
      ).toEqual({ alpha: 'Alpha', 'welcome.title': 'Welcome', zebra: 'Zebra' });

      expect(
        await deleteExpoLocalizationTranslation({
          projectRoot,
          locale: 'en',
          key: 'zebra',
        }),
      ).toEqual({ alpha: 'Alpha', 'welcome.title': 'Welcome' });
    });
  });

  test('loads all configured dictionaries and fills missing resources deterministically', async () => {
    await withProject(async (projectRoot) => {
      await writeExpoLocalizationDictionary({
        projectRoot,
        locale: 'de',
        dictionary: { hello: 'Hallo' },
      });
      expect(
        await readExpoLocalizationDictionaries({ projectRoot, locales: ['en', 'de'] }),
      ).toEqual({ en: {}, de: { hello: 'Hallo' } });
    });
  });

  test('rejects invalid dictionary resources instead of guessing', async () => {
    await withProject(async (projectRoot) => {
      const dictionaryPath = resolveExpoLocalizationDictionaryPath({ projectRoot, locale: 'en' });
      await writeExpoLocalizationDictionary({ projectRoot, locale: 'en', dictionary: {} });
      writeFileSync(dictionaryPath, '{"hello": 42}\n', 'utf8');
      let error: unknown;
      try {
        await readExpoLocalizationDictionary({ projectRoot, locale: 'en' });
      } catch (caught) {
        error = caught;
      }
      expect(error).toBeInstanceOf(ExpoLocalizationResourceError);
    });
  });

  test('prefers canonical resource files and uses ledger translations only as migration seeds', async () => {
    await withProject(async (projectRoot) => {
      await writeExpoLocalizationDictionary({
        projectRoot,
        locale: 'en',
        dictionary: { hello: 'Canonical' },
      });
      expect(
        await readExpoLocalizationResourceSeeds({
          projectRoot,
          locales: ['en', 'de'],
          legacyTranslations: {
            en: { hello: 'Legacy' },
            de: { hello: 'Hallo' },
          },
        }),
      ).toEqual({ en: { hello: 'Canonical' }, de: { hello: 'Hallo' } });
    });
  });

  test('reads underscore locale files during canonical BCP-47 migration', async () => {
    await withProject(async (projectRoot) => {
      const dictionaryPath = path.join(projectRoot, 'src/modules/localization/locales/pt_BR.json');
      mkdirSync(path.dirname(dictionaryPath), { recursive: true });
      writeFileSync(dictionaryPath, '{"hello":"Olá"}\n', 'utf8');

      expect(await readExpoLocalizationResourceSeeds({ projectRoot, locales: ['pt-BR'] })).toEqual({
        'pt-BR': { hello: 'Olá' },
      });
    });
  });

  test('cannot resolve a traversal locale outside the module resource directory', async () => {
    await withProject((projectRoot) => {
      expect(() =>
        resolveExpoLocalizationDictionaryPath({ projectRoot, locale: '../../secret' }),
      ).toThrow();
      return Promise.resolve();
    });
  });
});

async function withProject(run: (projectRoot: string) => Promise<void>): Promise<void> {
  const projectRoot = await mkdtemp(path.join(tmpdir(), 'expo-localization-resources-'));
  try {
    await run(projectRoot);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
}
