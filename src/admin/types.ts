import type {
  ExpoLocalizationComponentMetaRegistry,
  ExpoLocalizationManifestScreen,
  ExpoLocalizationMissingTranslation,
  ExpoLocalizationTranslatableField,
} from '../authoring';
import type { NormalizedExpoLocalizationModuleConfig } from '../config';
import type { ExpoLocalizationDictionaries } from '../resources';

export interface ExpoLocalizationAdminInvocation {
  readonly operation: string;
  readonly input?: unknown;
}

export interface ExpoLocalizationAdminAuthoringContext {
  readonly screens: readonly ExpoLocalizationManifestScreen[];
  readonly componentMeta: ExpoLocalizationComponentMetaRegistry;
}

export interface ExpoLocalizationManifestFieldMutation {
  readonly screenId: string;
  readonly nodeId: string;
  readonly prop: string;
  readonly value: string;
}

export interface ExpoLocalizationAdminHostContext {
  readonly projectRoot: string;
  readonly readConfig: () => Promise<unknown>;
  readonly reconfigureConfig: (config: unknown) => Promise<void>;
  readonly readAuthoringContext: () => Promise<ExpoLocalizationAdminAuthoringContext>;
  readonly mutateManifestField: (mutation: ExpoLocalizationManifestFieldMutation) => Promise<void>;
}

export interface ExpoLocalizationAdminSnapshot {
  readonly config: NormalizedExpoLocalizationModuleConfig;
  readonly dictionaries: ExpoLocalizationDictionaries;
  readonly fields: readonly ExpoLocalizationTranslatableField[];
  readonly visibleFields: readonly ExpoLocalizationTranslatableField[];
  readonly missingTranslations: readonly ExpoLocalizationMissingTranslation[];
}

export interface ExpoLocalizationAdminLoadOptions {
  readonly searchQuery?: string;
  readonly filter?: 'all' | 'unlinked' | 'missing-translations' | 'incomplete';
}

export interface ExpoLocalizationLinkTranslationInput {
  readonly screenId: string;
  readonly nodeId: string;
  readonly keyProp: string;
  readonly key: string;
  readonly value?: string;
}
