import { describe, expect, test } from 'bun:test';

import { type ExpoLocalizationAdminHostContext, expoLocalizationAdminRuntime } from '../src/host';

describe('localization admin lifecycle configuration', () => {
  test('routes locale mutations through the injected lifecycle reconfigure boundary', async () => {
    let config: unknown = { defaultLocale: 'en', locales: ['en'] };
    let reconfigureCount = 0;
    const context = createContext(
      () => Promise.resolve(config),
      (next) => {
        config = next;
        reconfigureCount += 1;
        return Promise.resolve();
      },
    );

    await expoLocalizationAdminRuntime.config.addLocale(context, 'de');
    await expoLocalizationAdminRuntime.config.setDefaultLocale(context, 'de');
    const finalConfig = await expoLocalizationAdminRuntime.config.removeLocale(context, 'en');

    expect(finalConfig).toEqual({ defaultLocale: 'de', locales: ['de'] });
    expect(reconfigureCount).toBe(3);
  });
});

function createContext(
  readConfig: ExpoLocalizationAdminHostContext['readConfig'],
  reconfigureConfig: ExpoLocalizationAdminHostContext['reconfigureConfig'],
): ExpoLocalizationAdminHostContext {
  return {
    projectRoot: '/virtual/project',
    readConfig,
    reconfigureConfig,
    readAuthoringContext: () => Promise.resolve({ screens: [], componentMeta: {} }),
    mutateManifestField: () => Promise.resolve(),
  };
}
