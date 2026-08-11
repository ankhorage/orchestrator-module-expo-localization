import { EXPO_LOCALIZATION_MODULE_ID } from '../id';
import { ExpoLocalizationAdminView } from './ExpoLocalizationAdminView';

export { ExpoLocalizationAdminView } from './ExpoLocalizationAdminView';
export type { ExpoLocalizationAdminExecutor, ExpoLocalizationAdminViewProps } from './types';

export const expoLocalizationAdminViewContribution = {
  id: EXPO_LOCALIZATION_MODULE_ID,
  View: ExpoLocalizationAdminView,
} as const;
