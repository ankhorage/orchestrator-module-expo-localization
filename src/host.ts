import { parseExpoLocalizationModuleConfig } from './config';
import { EXPO_LOCALIZATION_MODULE_ID, expoLocalizationModule } from './module';

/**
 * Optional package-owned data consumed by generic authoring hosts.
 * The core module remains independently usable from the package root.
 */
export const expoLocalizationHostContribution = {
  id: EXPO_LOCALIZATION_MODULE_ID,
  name: 'Localization (Expo)',
  description: 'Multi-language support powered by expo-localization and i18next.',
  definition: expoLocalizationModule,
  normalizeConfig: parseExpoLocalizationModuleConfig,
  layout: {
    imports: ['import { LocalizationModuleProvider } from "@/modules/localization";'],
    hooks: [],
    providerStart: ['<LocalizationModuleProvider>'],
    providerEnd: ['</LocalizationModuleProvider>'],
  },
  admin: {
    kind: 'config-schema',
    title: 'Localization',
    description: 'Configure supported locales and the default locale.',
    fields: [
      {
        key: 'defaultLocale',
        label: 'Default locale',
        control: 'text',
        required: true,
      },
      {
        key: 'locales',
        label: 'Locales',
        control: 'string-list',
        required: true,
      },
    ],
  },
} as const;
