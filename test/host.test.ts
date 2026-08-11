import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, test } from 'bun:test';

import { expoLocalizationHostContribution } from '../src/host';
import { EXPO_LOCALIZATION_MODULE_ID, expoLocalizationModule } from '../src/index';

describe('expo localization host contribution', () => {
  test('provides package-owned generic host and admin metadata', () => {
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
      'translations',
    ]);
  });

  test('keeps the root module standalone and exposes host data only through its subpath', async () => {
    const packageJson = JSON.parse(await readFile(join(process.cwd(), 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
      exports?: Record<string, unknown>;
    };

    expect(Object.keys(packageJson.exports ?? {})).toEqual(['.', './host']);
    expect(packageJson.dependencies?.['@ankhorage/orchestrator']).toBe('^0.3.0');
    expect(packageJson.dependencies?.['@ankhorage/studio']).toBeUndefined();
    expect(packageJson.dependencies?.['@ankhorage/zora']).toBeUndefined();
    expect(packageJson.dependencies?.react).toBeUndefined();
  });
});
