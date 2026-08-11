import { describe, expect, test } from 'bun:test';

import {
  EXPO_LOCALIZATION_ADMIN_OPERATIONS,
  type ExpoLocalizationAdminHostContext,
  expoLocalizationAdminRuntime,
} from '../src/host';

describe('localization admin runtime contract', () => {
  test('exposes only the generic single-entry runtime shape', () => {
    expect(Object.keys(expoLocalizationAdminRuntime).sort()).toEqual(['execute', 'kind']);
    expect(expoLocalizationAdminRuntime.kind).toBe('module-admin-runtime');
  });

  test('rejects unknown operations and malformed opaque input explicitly', async () => {
    const context = createContext();

    await expectFailure(
      expoLocalizationAdminRuntime.execute(context, { operation: 'unknown.operation' }),
      'Unsupported Localization admin operation',
    );
    await expectFailure(
      expoLocalizationAdminRuntime.execute(context, {
        operation: EXPO_LOCALIZATION_ADMIN_OPERATIONS.addLocale,
        input: ['de'],
      }),
      'input must be an object',
    );
  });
});

async function expectFailure(promise: Promise<unknown>, message: string): Promise<void> {
  let failure: unknown;
  try {
    await promise;
  } catch (error) {
    failure = error;
  }
  expect(failure).toBeInstanceOf(Error);
  expect(failure instanceof Error ? failure.message : '').toContain(message);
}

function createContext(): ExpoLocalizationAdminHostContext {
  return {
    projectRoot: '/virtual/project',
    readConfig: () => Promise.resolve({ defaultLocale: 'en', locales: ['en'] }),
    reconfigureConfig: () => Promise.resolve(),
    readAuthoringContext: () => Promise.resolve({ screens: [], componentMeta: {} }),
    mutateManifestField: () => Promise.resolve(),
  };
}
