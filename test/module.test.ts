import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { WriteFilesAction } from '@ankhorage/orchestrator';
import { describe, expect, test } from 'bun:test';

import { EXPO_LOCALIZATION_MODULE_ID, expoLocalizationModule } from '../src/module';

describe('expoLocalizationModule', () => {
  test('keeps module-owned templates in the repo', () => {
    const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

    expect(Bun.file(path.join(repoRoot, 'templates/i18n.ts.tpl')).size).toBeGreaterThan(0);
    expect(Bun.file(path.join(repoRoot, 'templates/useT.ts.tpl')).size).toBeGreaterThan(0);
    expect(
      Bun.file(path.join(repoRoot, 'templates/LocalizationProvider.tsx.tpl')).size,
    ).toBeGreaterThan(0);
    expect(Bun.file(path.join(repoRoot, 'templates/index.ts.tpl')).size).toBeGreaterThan(0);
  });

  test('uses the expected module id', () => {
    expect(expoLocalizationModule.id).toBe(EXPO_LOCALIZATION_MODULE_ID);
  });

  test('returns only supported orchestrator actions', async () => {
    const actions = await Promise.resolve(
      expoLocalizationModule.plan({
        projectRoot: '/virtual/project',
        moduleId: EXPO_LOCALIZATION_MODULE_ID,
        config: {},
      }),
    );

    expect(actions).toHaveLength(6);
    expect(actions.map((action) => action.type)).toEqual([
      'ensure-packages',
      'write-files',
      'patch-text-block',
      'patch-text-block',
      'patch-text-block',
      'json-set',
    ]);

    expect(actions[0]).toEqual({
      type: 'ensure-packages',
      add: [
        { name: 'i18next', version: '^25.8.10' },
        { name: 'react-i18next', version: '^16.5.4' },
        { name: 'expo-localization', version: '~17.0.8' },
      ],
    });

    const writeFilesAction = actions.find(
      (action): action is WriteFilesAction => action.type === 'write-files',
    );
    if (!writeFilesAction) {
      throw new Error('expected write-files action');
    }

    expect(writeFilesAction.files.map((file) => file.path)).toEqual([
      'src/plugins/localization/i18n.ts',
      'src/plugins/localization/useT.ts',
      'src/plugins/localization/LocalizationProvider.tsx',
      'src/plugins/localization/index.ts',
      'src/plugins/localization/locales/en.json',
    ]);
    expect(writeFilesAction.files[2]?.content).toContain(
      'import * as ExpoLocalization from "expo-localization";',
    );
    expect(writeFilesAction.files[2]?.content).toContain(
      '      "en": { translation: require("./locales/en.json") },',
    );

    expect(actions[2]).toEqual({
      type: 'patch-text-block',
      path: 'src/app/_layout.tsx',
      blockId: 'expo-localization:root-layout-import',
      content: 'import { LocalizationPluginProvider } from "@/plugins/localization";',
      anchor: {
        find: "import ankhConfig from '@root/ankh.config.json';",
        position: 'before',
      },
    });

    expect(actions[3]).toEqual({
      type: 'patch-text-block',
      path: 'src/app/_layout.tsx',
      blockId: 'expo-localization:root-layout-provider',
      content: '  output = <LocalizationPluginProvider>{output}</LocalizationPluginProvider>;',
      anchor: {
        find: '  return (',
        position: 'before',
      },
    });

    expect(actions[4]).toEqual({
      type: 'patch-text-block',
      path: 'app.config.ts',
      blockId: 'expo-localization:expo-plugin',
      content: '    "expo-localization",',
      anchor: {
        find: 'plugins: [',
        position: 'after',
      },
    });

    expect(actions[5]).toEqual({
      type: 'json-set',
      path: 'ankh.config.json',
      jsonPath: 'settings.localization',
      value: {
        defaultLocale: 'en',
        locales: ['en'],
      },
    });
  });

  test('uses custom locales and translations when planning files', async () => {
    const actions = await Promise.resolve(
      expoLocalizationModule.plan({
        projectRoot: '/virtual/project',
        moduleId: EXPO_LOCALIZATION_MODULE_ID,
        config: {
          defaultLocale: 'de',
          locales: ['en', 'de'],
          translations: {
            en: { hello: 'Hello there' },
            de: { hello: 'Hallo dort' },
          },
        },
      }),
    );

    const writeFilesAction = actions.find(
      (action): action is WriteFilesAction => action.type === 'write-files',
    );
    if (!writeFilesAction) {
      throw new Error('expected write-files action');
    }

    expect(writeFilesAction.files.map((file) => file.path)).toContain(
      'src/plugins/localization/locales/de.json',
    );
    expect(writeFilesAction.files[0]?.content).toContain('fallbackLng: "de"');
    expect(writeFilesAction.files[2]?.content).toContain(
      '      "de": { translation: require("./locales/de.json") },',
    );
    expect(writeFilesAction.files[5]).toEqual({
      path: 'src/plugins/localization/locales/de.json',
      content: '{\n  "hello": "Hallo dort"\n}\n',
    });
  });
});
