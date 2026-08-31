import type { ExpoLocalizationDictionaries } from './resources';

export interface ExpoLocalizationManifestNode {
  readonly id: string;
  readonly type: string;
  readonly alias?: string;
  readonly props?: Readonly<Record<string, unknown>>;
  readonly children?: readonly ExpoLocalizationManifestNode[];
}

export interface ExpoLocalizationManifestScreen {
  readonly id: string;
  readonly root: ExpoLocalizationManifestNode;
}

export interface ExpoLocalizationComponentMetaField {
  readonly keyProp: string;
  readonly defaultTextProp: string;
}

export interface ExpoLocalizationComponentMeta {
  readonly i18n?: {
    readonly fields?: readonly ExpoLocalizationComponentMetaField[];
  };
}

export type ExpoLocalizationComponentMetaRegistry = Readonly<
  Record<string, ExpoLocalizationComponentMeta | undefined>
>;

export interface ExpoLocalizationTranslatableField {
  readonly screenId: string;
  readonly nodeId: string;
  readonly componentName: string;
  readonly keyProp: string;
  readonly defaultTextProp: string;
  readonly currentKey: string;
  readonly defaultText: string;
  readonly path: string;
}

export interface ExpoLocalizationMissingTranslation {
  readonly key: string;
  readonly missingLocales: readonly string[];
  readonly fieldCount: number;
}

export type ExpoLocalizationFieldFilter =
  'all' | 'unlinked' | 'missing-translations' | 'incomplete';

export function collectExpoLocalizationTranslatableFields(args: {
  readonly screens: readonly ExpoLocalizationManifestScreen[];
  readonly componentMeta: ExpoLocalizationComponentMetaRegistry;
}): ExpoLocalizationTranslatableField[] {
  const refs: ExpoLocalizationTranslatableField[] = [];

  for (const screen of args.screens) {
    traverse(screen.root, screen.id, screen.id, args.componentMeta, refs);
  }

  return refs;
}

export function findExpoLocalizationMissingTranslations(args: {
  readonly fields: readonly ExpoLocalizationTranslatableField[];
  readonly locales: readonly string[];
  readonly dictionaries: ExpoLocalizationDictionaries;
}): ExpoLocalizationMissingTranslation[] {
  const fieldCounts = new Map<string, number>();
  for (const field of args.fields) {
    if (field.currentKey) {
      fieldCounts.set(field.currentKey, (fieldCounts.get(field.currentKey) ?? 0) + 1);
    }
  }

  return [...fieldCounts.entries()]
    .map(([key, fieldCount]) => ({
      key,
      fieldCount,
      missingLocales: args.locales.filter((locale) => !args.dictionaries[locale]?.[key]),
    }))
    .filter(({ missingLocales }) => missingLocales.length > 0)
    .sort(({ key: left }, { key: right }) => compareText(left, right));
}

export function filterExpoLocalizationTranslatableFields(args: {
  readonly fields: readonly ExpoLocalizationTranslatableField[];
  readonly searchQuery?: string;
  readonly filter?: ExpoLocalizationFieldFilter;
  readonly locales: readonly string[];
  readonly dictionaries: ExpoLocalizationDictionaries;
}): ExpoLocalizationTranslatableField[] {
  const query = args.searchQuery?.trim().toLowerCase() ?? '';
  const filter = args.filter ?? 'all';

  return args.fields.filter((field) => {
    const matchesSearch =
      !query ||
      [field.nodeId, field.componentName, field.currentKey, field.defaultText, field.path].some(
        (value) => value.toLowerCase().includes(query),
      );
    if (!matchesSearch) return false;

    const isUnlinked = !field.currentKey;
    const hasMissingTranslation =
      !isUnlinked && args.locales.some((locale) => !args.dictionaries[locale]?.[field.currentKey]);

    if (filter === 'unlinked') return isUnlinked;
    if (filter === 'missing-translations') return hasMissingTranslation;
    if (filter === 'incomplete') return isUnlinked || hasMissingTranslation;
    return true;
  });
}

export function createExpoLocalizationKeyFromText(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function traverse(
  node: ExpoLocalizationManifestNode,
  screenId: string,
  parentPath: string,
  componentMeta: ExpoLocalizationComponentMetaRegistry,
  refs: ExpoLocalizationTranslatableField[],
): void {
  const path = `${parentPath} > ${node.alias ?? node.type}`;
  for (const field of componentMeta[node.type]?.i18n?.fields ?? []) {
    refs.push({
      screenId,
      nodeId: node.id,
      componentName: node.type,
      keyProp: field.keyProp,
      defaultTextProp: field.defaultTextProp,
      currentKey: readString(node.props?.[field.keyProp]),
      defaultText: readString(node.props?.[field.defaultTextProp]),
      path,
    });
  }

  for (const child of node.children ?? []) {
    traverse(child, screenId, path, componentMeta, refs);
  }
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
