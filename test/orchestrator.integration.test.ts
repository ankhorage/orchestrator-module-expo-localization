import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createOrchestrator, defineModule, type ModuleAction } from '@ankhorage/orchestrator';
import { describe, expect, test } from 'bun:test';

import {
  readExpoLocalizationDictionary,
  resolveExpoLocalizationDictionaryPath,
  writeExpoLocalizationDictionary,
} from '../src/resources';

interface ResourceLifecycleConfig {
  readonly content: string;
  readonly fail?: boolean;
}

const MODULE_ID = 'localization-resource-rollback-regression';

describe('Orchestrator localization resource integration', () => {
  test('failed reconfiguration preserves the exact domain-edited dictionary pre-state', async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), 'expo-localization-orchestrator-'));
    const moduleDefinition = defineModule<ResourceLifecycleConfig>({
      id: MODULE_ID,
      plan: ({ config }) => buildLifecycleActions(config),
    });
    const orchestrator = createOrchestrator({ modules: [moduleDefinition], projectRoot });

    try {
      await orchestrator.installModule(MODULE_ID, {
        config: { content: '{\n  "title": "Installed"\n}\n' },
      });
      await writeExpoLocalizationDictionary({
        projectRoot,
        locale: 'en',
        dictionary: { title: 'Author edited' },
      });

      let failure: unknown;
      try {
        await orchestrator.reconfigureModule(MODULE_ID, {
          config: { content: '{\n  "title": "Next"\n}\n', fail: true },
        });
      } catch (error) {
        failure = error;
      }

      expect(failure).toBeInstanceOf(Error);
      expect(await readExpoLocalizationDictionary({ projectRoot, locale: 'en' })).toEqual({
        title: 'Author edited',
      });
      expect(
        await readFile(resolveExpoLocalizationDictionaryPath({ projectRoot, locale: 'en' }), 'utf8'),
      ).toBe('{\n  "title": "Author edited"\n}\n');
      const state = await orchestrator.getModule(MODULE_ID);
      expect(state?.installed ? state.installation.config : null).toEqual({
        content: '{\n  "title": "Installed"\n}\n',
      });
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });
});

function buildLifecycleActions(config: ResourceLifecycleConfig): ModuleAction[] {
  const actions: ModuleAction[] = [
    {
      type: 'write-files',
      files: [
        {
          path: 'src/modules/localization/locales/en.json',
          content: config.content,
          overwrite: true,
        },
      ],
    },
  ];
  if (config.fail) {
    actions.push({
      type: 'json-set',
      path: 'reconfigure-guard.json',
      jsonPath: 'guard',
      value: 'next',
      expected: 'must-already-exist',
    });
  }
  return actions;
}
