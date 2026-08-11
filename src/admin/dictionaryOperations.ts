import {
  deleteExpoLocalizationTranslation,
  type ExpoLocalizationDictionary,
  setExpoLocalizationTranslation,
} from '../resources';
import type { ExpoLocalizationAdminHostContext } from './types';

export const expoLocalizationDictionaryAdminOperations = {
  async setTranslation(
    context: ExpoLocalizationAdminHostContext,
    input: { readonly locale: string; readonly key: string; readonly value: string },
  ): Promise<ExpoLocalizationDictionary> {
    return await setExpoLocalizationTranslation({ projectRoot: context.projectRoot, ...input });
  },
  async deleteTranslation(
    context: ExpoLocalizationAdminHostContext,
    input: { readonly locale: string; readonly key: string },
  ): Promise<ExpoLocalizationDictionary> {
    return await deleteExpoLocalizationTranslation({ projectRoot: context.projectRoot, ...input });
  },
} as const;
