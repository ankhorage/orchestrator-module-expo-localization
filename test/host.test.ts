import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, test } from 'bun:test';

import { expoLocalizationHostContribution } from '../src/host';
import { EXPO_LOCALIZATION_MODULE_ID, expoLocalizationModule } from '../src/index';

describe('expo localization host contribution', () => {
  test('provides package-owned generic host and administration metadata', () => {
    expect(expoLocalizationHostContribution.id).toBe(EXPO_LOCALIZATION_MODULE_ID);
    expect(expoLocalizationHostContribution.definition).toBe(expoLocalizationModule);
    expect(expoLocalizationHostContribution.layout).toEqual({
      imports: ['import { LocalizationModuleProvider } from "@/modules/localization";'],
      hooks: [],
      providerStart: ['<LocalizationModuleProvider>'],
      providerEnd: ['</LocalizationModuleProvider>'],
    });
    expect(expoLocalizationHostContribution.admin.kind).toBe('config-schema');
    expect(expoLocalizationHostContribution.admin.fields.map((field) => field.key)).toEqual([
      'defaultLocale',
      'locales',
    ]);
    expect(expoLocalizationHostContribution.adminRuntime.kind).toBe('module-admin-runtime');
    expect(Object.keys(expoLocalizationHostContribution.adminRuntime).sort()).toEqual([
      'execute',
      'kind',
    ]);
  });

  test('keeps root standalone and host runtime free of Studio, ZORA, React, and ledger internals', async () => {
    const packageJson: unknown = JSON.parse(
      await readFile(join(process.cwd(), 'package.json'), 'utf8'),
    );
    if (!isPackageJson(packageJson)) throw new Error('invalid package.json');
    const adminSources = await Promise.all(
      [
        'types.ts',
        'load.ts',
        'configOperations.ts',
        'dictionaryOperations.ts',
        'linkTranslationKey.ts',
        'runtime.ts',
      ].map((file) => readFile(join(process.cwd(), 'src/admin', file), 'utf8')),
    );
    const source = adminSources.join('\n');

    expect(Object.keys(packageJson.exports ?? {})).toEqual(['.', './host']);
    expect(packageJson.dependencies?.['@ankhorage/orchestrator']).toBe('^0.3.1');
    expect(packageJson.dependencies?.['@ankhorage/studio']).toBeUndefined();
    expect(packageJson.dependencies?.['@ankhorage/zora']).toBeUndefined();
    expect(packageJson.dependencies?.react).toBeUndefined();
    expect(source).not.toContain('@ankhorage/studio');
    expect(source).not.toContain('@ankhorage/zora');
    expect(source).not.toContain('StudioProvider');
    expect(source).not.toContain('.ankh/ledger');
    expect(source).not.toContain('ledgerPath');
  });
});

function isPackageJson(value: unknown): value is {
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly exports?: Readonly<Record<string, unknown>>;
} {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
