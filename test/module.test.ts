import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { EXPO_PLATFORM } from '@ankhorage/expo-runtime/platform';
import type { ModuleAction, WriteFilesAction } from '@ankhorage/orchestrator';
import { describe, expect, test } from 'bun:test';

import { EXPO_LOCALIZATION_MODULE_ID } from '../src/id';
import { expoLocalizationModule } from '../src/module';
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
});

describe('expoLocalizationModule plan', () => {
  test('returns only supported orchestrator actions', async () => {
    const actions = await planModuleAsync({});

    assertActionSequence(actions);
    assertGeneratedFiles(actions);
    assertPackageRequirements(actions);
    assertProjectPatches(actions);
  });

  test('projects every configured locale into the native localization plugin', async () => {
    const actions = await planModuleAsync({ defaultLocale: 'de', locales: ['en', 'de-CH'] });
    const [, , , , pluginAction] = actions;
    if (pluginAction?.type !== 'patch-text-block') throw new Error('expected plugin action');

    expect(pluginAction.path).toBe('app.config.ts');
    expect(pluginAction.content).toContain('supportedLocales: ["en","de-CH","de"],');
  });
});

describe('expoLocalizationModule legacy resource migration', () => {
  test('migrates legacy ledger translations into canonical resource files', async () => {
    const legacyConfig = {
      defaultLocale: 'de',
      locales: ['en', 'de'],
      translations: {
        en: { hello: 'Hello there' },
        de: { hello: 'Hallo dort' },
      },
    };
    const actions = await Promise.resolve(
      expoLocalizationModule.plan({
        projectRoot: '/virtual/project',
        moduleId: EXPO_LOCALIZATION_MODULE_ID,
        config: legacyConfig,
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
});

describe('expoLocalizationModule canonical resources', () => {
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

function assertActionSequence(actions: readonly ModuleAction[]): void {
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
}

function assertGeneratedFiles(actions: readonly ModuleAction[]): void {
  const writeFilesAction = requireWriteFilesAction(actions);
  expect(writeFilesAction.files.map((file) => file.path)).toEqual([
    'src/modules/localization/i18n.ts',
    'src/modules/localization/useT.ts',
    'src/modules/localization/runtimeLocalization.ts',
    'src/modules/localization/LocalizationProvider.tsx',
    'src/modules/localization/index.ts',
    'src/modules/localization/locales/en.json',
  ]);

  const provider = requireGeneratedFile(writeFilesAction, 'LocalizationProvider.tsx');
  const runtime = requireGeneratedFile(writeFilesAction, 'runtimeLocalization.ts');
  expect(provider).toContain('import * as ExpoLocalization from "expo-localization";');
  expect(provider).toContain('ExpoLocalization.getLocales()[0].languageTag');
  expect(provider).not.toContain('ExpoLocalization as');
  expect(provider).toContain('@ankhorage/runtime');
  expect(provider).not.toContain('@ankh/runtime');
  expect(runtime).toContain('@ankhorage/runtime');
  expect(runtime).not.toContain('@ankh/runtime');
  expect(provider).toContain('RuntimeRendererConfigProvider');
  expect(provider).not.toContain('@ankhorage/surface');
  expect(provider).toContain('"en": { translation: require("./locales/en.json") }');
  expect(provider).toContain('LocalizationModuleProvider');
  expect(provider).not.toContain('PluginProvider');
}

function assertPackageRequirements(actions: readonly ModuleAction[]): void {
  expect(actions[0]).toEqual({
    type: 'ensure-packages',
    add: [
      { name: 'i18next', version: '^25.8.10' },
      { name: 'react-i18next', version: '^16.5.4' },
      EXPO_PLATFORM.packages.localization,
    ],
  });
}

function assertProjectPatches(actions: readonly ModuleAction[]): void {
  expect(actions[2]).toMatchObject({
    type: 'patch-text-block',
    path: 'src/app/_layout.tsx',
    blockId: 'expo-localization:root-layout-import',
  });
  expect(actions[3]).toMatchObject({
    type: 'patch-text-block',
    path: 'src/app/_layout.tsx',
    blockId: 'expo-localization:root-layout-provider',
  });
  expect(actions[4]).toMatchObject({
    type: 'patch-text-block',
    path: 'app.config.ts',
    blockId: 'expo-localization:expo-plugin',
  });
  expect(actions[5]).toEqual({
    type: 'json-set',
    path: 'ankh.config.json',
    jsonPath: 'settings.localization',
    value: { defaultLocale: 'en', locales: ['en'] },
  });
}

async function planModuleAsync(config: unknown): Promise<ModuleAction[]> {
  return await expoLocalizationModule.plan({
    projectRoot: '/virtual/project',
    moduleId: EXPO_LOCALIZATION_MODULE_ID,
    config,
  });
}

function requireGeneratedFile(action: WriteFilesAction, basename: string): string {
  const file = action.files.find((candidate) => candidate.path.endsWith(`/${basename}`));
  if (!file) throw new Error(`expected generated ${basename}`);
  return file.content;
}

function requireWriteFilesAction(actions: readonly ModuleAction[]): WriteFilesAction {
  const action = actions.find(
    (candidate): candidate is WriteFilesAction => candidate.type === 'write-files',
  );
  if (!action) throw new Error('expected write-files action');
  return action;
}
