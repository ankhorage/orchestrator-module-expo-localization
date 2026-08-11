import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { WriteFilesAction } from '@ankhorage/orchestrator';
import { describe, expect, test } from 'bun:test';

import type { ExpoLocalizationModuleConfig } from '../src/config';
import { EXPO_LOCALIZATION_MODULE_ID, expoLocalizationModule } from '../src/module';
import { writeExpoLocalizationDictionary } from '../src/resources';

describe('expoLocalizationModule', () => {
  test('keeps module-owned templates in the repo', () => {
    const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

    expect(Bun.file(path.join(repoRoot, 'templates/i18n.ts.tpl')).size).toBeGreaterThan(0);
    expect(Bun.file(path.join(repoRoot, 'templates/useT.ts.tpl')).size).toBeGreaterThan(0);
    expect(
      Bun.file(path.join(repoRoot, 'templates/LocalizationProvider.tsx.tpl')).size,
    ).toBeGreaterThan(0);
    expect(
      Bun.file(path.join(repoRoot, 'templates/runtimeLocalization.ts.tpl')).size,
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
    expect(JSON.stringify(actions)).not.toContain('src/plugins/');
    expect(JSON.stringify(actions)).not.toContain('LocalizationPluginProvider');

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
      'src/modules/localization/i18n.ts',
      'src/modules/localization/useT.ts',
      'src/modules/localization/runtimeLocalization.ts',
      'src/modules/localization/LocalizationProvider.tsx',
      'src/modules/localization/index.ts',
      'src/modules/localization/locales/en.json',
    ]);
    const providerFile = writeFilesAction.files.find(
      (file) => file.path === 'src/modules/localization/LocalizationProvider.tsx',
    );
    if (!providerFile) {
      throw new Error('expected LocalizationProvider.tsx file');
    }
    const runtimeFile = writeFilesAction.files.find(
      (file) => file.path === 'src/modules/localization/runtimeLocalization.ts',
    );
    if (!runtimeFile) {
      throw new Error('expected runtimeLocalization.ts file');
    }

    expect(providerFile.content).toContain(
      'import * as ExpoLocalization from "expo-localization";',
    );
    expect(providerFile.content).toContain('@ankhorage/runtime');
    expect(providerFile.content).not.toContain('@ankh/runtime');
    expect(runtimeFile.content).toContain('@ankhorage/runtime');
    expect(runtimeFile.content).not.toContain('@ankh/runtime');
    expect(providerFile.content).toContain('RuntimeRendererConfigProvider');
    expect(providerFile.content).not.toContain('@ankhorage/surface');
    expect(providerFile.content).toContain(
      '      "en": { translation: require("./locales/en.json") },',
    );
    expect(providerFile.content).toContain('LocalizationModuleProvider');
    expect(providerFile.content).not.toContain('PluginProvider');

    expect(actions[2]).toEqual({
      type: 'patch-text-block',
      path: 'src/app/_layout.tsx',
      blockId: 'expo-localization:root-layout-import',
      content: 'import { LocalizationModuleProvider } from "@/modules/localization";',
      anchor: {
        find: "import ankhConfig from '@root/ankh.config.json';",
        position: 'before',
      },
    });

    expect(actions[3]).toEqual({
      type: 'patch-text-block',
      path: 'src/app/_layout.tsx',
      blockId: 'expo-localization:root-layout-provider',
      content: '  output = <LocalizationModuleProvider>{output}</LocalizationModuleProvider>;',
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

  test('migrates legacy ledger translations into canonical resource files', async () => {
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
        } as ExpoLocalizationModuleConfig & {
          translations: Record<string, Record<string, string>>;
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
      'src/modules/localization/locales/de.json',
    );
    expect(writeFilesAction.files[0]?.content).toContain('fallbackLng: "de"');
    const providerFile = writeFilesAction.files.find(
      (file) => file.path === 'src/modules/localization/LocalizationProvider.tsx',
    );
    if (!providerFile) {
      throw new Error('expected LocalizationProvider.tsx file');
    }

    expect(providerFile.content).toContain(
      '      "de": { translation: require("./locales/de.json") },',
    );
    expect(
      writeFilesAction.files.find(
        (file) => file.path === 'src/modules/localization/locales/de.json',
      ),
    ).toEqual({
      path: 'src/modules/localization/locales/de.json',
      content: '{\n  "hello": "Hallo dort"\n}\n',
    });
  });

  test('uses the canonical dictionary resource directly for generated runtime consumption', async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), 'expo-localization-module-'));
    try {
      await writeExpoLocalizationDictionary({
        projectRoot,
        locale: 'de',
        dictionary: { hello: 'Canonical Hallo' },
      });

      const actions = await Promise.resolve(
        expoLocalizationModule.plan({
          projectRoot,
          moduleId: EXPO_LOCALIZATION_MODULE_ID,
          config: { defaultLocale: 'de', locales: ['de'] },
        }),
      );
      const writeFilesAction = actions.find(
        (action): action is WriteFilesAction => action.type === 'write-files',
      );
      expect(
        writeFilesAction?.files.find(
          (file) => file.path === 'src/modules/localization/locales/de.json',
        )?.content,
      ).toBe('{\n  "hello": "Canonical Hallo"\n}\n');
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });
});
