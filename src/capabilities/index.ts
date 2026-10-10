import type { Capability } from '@ankhorage/contracts/capability';

/*** Publish the localization action executed by generated Expo applications. */
export const CAPABILITIES = [
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
        properties: {
          locale: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
  },
] as const satisfies readonly Capability[];
