import { defineModule, type ModuleAction, type ModuleDefinition } from '@ankhorage/orchestrator';

import { type ExpoLocalizationModuleConfig, parseExpoLocalizationModuleConfig } from './config';
import { buildLocalizationWriteFiles } from './templateFiles';

export const EXPO_LOCALIZATION_MODULE_ID = 'expo-localization';

export const expoLocalizationModule: ModuleDefinition<ExpoLocalizationModuleConfig> =
  defineModule<ExpoLocalizationModuleConfig>({
    id: EXPO_LOCALIZATION_MODULE_ID,
    plan(context): ModuleAction[] {
      const config = parseExpoLocalizationModuleConfig(context.config);

      return [
        {
          type: 'ensure-packages',
          add: [
            { name: 'i18next', version: '^25.8.10' },
            { name: 'react-i18next', version: '^16.5.4' },
            { name: 'expo-localization', version: '~17.0.8' },
          ],
        },
        {
          type: 'write-files',
          files: buildLocalizationWriteFiles({
            defaultLocale: config.defaultLocale,
            locales: config.locales,
            translations: config.translations,
          }),
        },
        {
          type: 'patch-text-block',
          path: 'src/app/_layout.tsx',
          blockId: `${EXPO_LOCALIZATION_MODULE_ID}:root-layout-import`,
          content: 'import { LocalizationPluginProvider } from "@/plugins/localization";',
          anchor: {
            find: "import ankhConfig from '@root/ankh.config.json';",
            position: 'before',
          },
        },
        {
          type: 'patch-text-block',
          path: 'src/app/_layout.tsx',
          blockId: `${EXPO_LOCALIZATION_MODULE_ID}:root-layout-provider`,
          content: '  output = <LocalizationPluginProvider>{output}</LocalizationPluginProvider>;',
          anchor: {
            find: '  return (',
            position: 'before',
          },
        },
        {
          type: 'patch-text-block',
          path: 'app.config.ts',
          blockId: `${EXPO_LOCALIZATION_MODULE_ID}:expo-plugin`,
          content: '    "expo-localization",',
          anchor: {
            find: 'plugins: [',
            position: 'after',
          },
        },
        {
          type: 'json-set',
          path: 'ankh.config.json',
          jsonPath: 'settings.localization',
          value: {
            defaultLocale: config.defaultLocale,
            locales: config.locales,
          },
        },
      ];
    },
  });
