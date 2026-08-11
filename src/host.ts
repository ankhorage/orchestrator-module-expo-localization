import { expoLocalizationAdminRuntime } from './admin/runtime';
import { parseExpoLocalizationModuleConfig } from './config';
import { EXPO_LOCALIZATION_MODULE_ID, expoLocalizationModule } from './module';

export {
  type ExpoLocalizationAdminAuthoringContext,
  type ExpoLocalizationAdminHostContext,
  type ExpoLocalizationAdminLoadOptions,
  expoLocalizationAdminRuntime,
  type ExpoLocalizationAdminSnapshot,
  type ExpoLocalizationLinkTranslationInput,
  type ExpoLocalizationManifestFieldMutation,
} from './admin/runtime';

/** Optional package-owned data consumed by generic authoring hosts. */
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
      { key: 'defaultLocale', label: 'Default locale', control: 'text', required: true },
      { key: 'locales', label: 'Locales', control: 'string-list', required: true },
    ],
  },
  adminRuntime: expoLocalizationAdminRuntime,
} as const;
