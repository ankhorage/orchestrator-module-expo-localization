import { collectExpoLocalizationTranslatableFields } from '../authoring';
import { parseExpoLocalizationModuleConfig } from '../config';
import { readExpoLocalizationDictionary, setExpoLocalizationTranslation } from '../resources';
import type {
  ExpoLocalizationAdminHostContext,
  ExpoLocalizationLinkTranslationInput,
  ExpoLocalizationManifestFieldMutation,
} from './types';

export async function linkExpoLocalizationTranslationKey(
  context: ExpoLocalizationAdminHostContext,
  input: ExpoLocalizationLinkTranslationInput,
): Promise<{ readonly key: string; readonly defaultLocale: string }> {
  const [rawConfig, authoring] = await Promise.all([
    context.readConfig(),
    context.readAuthoringContext(),
  ]);
  const config = parseExpoLocalizationModuleConfig(rawConfig);
  const fields = collectExpoLocalizationTranslatableFields(authoring);
  const field = fields.find(
    (candidate) =>
      candidate.screenId === input.screenId &&
      candidate.nodeId === input.nodeId &&
      candidate.keyProp === input.keyProp,
  );
  if (!field) {
    throw new Error(
      'The requested manifest field is not translatable according to component metadata.',
    );
  }

  const key = input.key.trim();
  if (!key) throw new Error('Translation keys cannot be empty.');
  const dictionary = await readExpoLocalizationDictionary({
    projectRoot: context.projectRoot,
    locale: config.defaultLocale,
  });
  const needsSeed = !Object.prototype.hasOwnProperty.call(dictionary, key);
  const seedValue = input.value ?? field.defaultText;
  if (needsSeed && !seedValue.trim()) {
    throw new Error('A new translation key requires a non-empty default-locale value.');
  }

  const mutation: ExpoLocalizationManifestFieldMutation = {
    screenId: field.screenId,
    nodeId: field.nodeId,
    prop: field.keyProp,
    value: key,
  };
  await context.mutateManifestField(mutation);

  if (needsSeed) {
    await persistSeedOrRestoreManifest(
      context,
      mutation,
      field.currentKey,
      config.defaultLocale,
      seedValue,
    );
  }
  return { key, defaultLocale: config.defaultLocale };
}

async function persistSeedOrRestoreManifest(
  context: ExpoLocalizationAdminHostContext,
  mutation: ExpoLocalizationManifestFieldMutation,
  previousKey: string,
  locale: string,
  value: string,
): Promise<void> {
  try {
    await setExpoLocalizationTranslation({
      projectRoot: context.projectRoot,
      locale,
      key: mutation.value,
      value,
    });
  } catch (error) {
    try {
      await context.mutateManifestField({ ...mutation, value: previousKey });
    } catch (rollbackError) {
      throw new AggregateError(
        [error, rollbackError],
        'Translation linking failed and the manifest field could not be restored.',
        { cause: rollbackError },
      );
    }
    throw error;
  }
}
