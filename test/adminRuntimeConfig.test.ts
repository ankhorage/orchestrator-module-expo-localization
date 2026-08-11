import { describe, expect, test } from 'bun:test';

import {
  EXPO_LOCALIZATION_ADMIN_OPERATIONS,
  type ExpoLocalizationAdminHostContext,
  expoLocalizationAdminRuntime,
} from '../src/host';

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

    await execute(context, EXPO_LOCALIZATION_ADMIN_OPERATIONS.addLocale, { locale: 'de' });
    await execute(context, EXPO_LOCALIZATION_ADMIN_OPERATIONS.setDefaultLocale, { locale: 'de' });
    const finalConfig = await execute(context, EXPO_LOCALIZATION_ADMIN_OPERATIONS.removeLocale, {
      locale: 'en',
    });

    expect(finalConfig).toEqual({ defaultLocale: 'de', locales: ['de'] });
    expect(reconfigureCount).toBe(3);
  });
});

function execute(
  context: ExpoLocalizationAdminHostContext,
  operation: string,
  input: unknown,
): Promise<unknown> {
  return expoLocalizationAdminRuntime.execute(context, { operation, input });
}

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
