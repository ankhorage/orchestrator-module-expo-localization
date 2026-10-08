import { isCapability } from '@ankhorage/contracts/capabilities';
import { describe, expect, test } from 'bun:test';

import packageJson from '../package.json';
import { CAPABILITIES } from '../src/capabilities/index';

describe('CAPABILITIES', () => {
  test('publishes the canonical localization action target', () => {
    expect(CAPABILITIES).toEqual([
      {
        id: 'localization.setLanguage',
        owner: '@ankhorage/orchestrator-module-expo-localization',
        access: ['invoke'],
        binding: { kind: 'action', bindableAs: ['target'] },
        label: 'Set language',
        description: 'Change the active application language.',
        input: {
          schema: {
            type: 'object',
            required: ['locale'],
            properties: { locale: { type: 'string' } },
            additionalProperties: false,
          },
        },
      },
    ]);
    expect(CAPABILITIES.every(isCapability)).toBeTrue();
    expect(packageJson.ankh.capabilities).toEqual(CAPABILITIES);
    expect(packageJson.exports['./capabilities']).toEqual({
      types: './dist/capabilities/index.d.ts',
      default: './dist/capabilities/index.js',
    });
  });
});
