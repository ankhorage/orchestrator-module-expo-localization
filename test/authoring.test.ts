import { describe, expect, test } from 'bun:test';

import {
  collectExpoLocalizationTranslatableFields,
  createExpoLocalizationKeyFromText,
  type ExpoLocalizationManifestScreen,
  filterExpoLocalizationTranslatableFields,
  findExpoLocalizationMissingTranslations,
} from '../src/authoring';

const SCREENS: ExpoLocalizationManifestScreen[] = [
  {
    id: 'home',
    root: {
      id: 'root',
      type: 'Box',
      alias: 'Root',
      children: [
        {
          id: 'title',
          type: 'LocalizedText',
          props: { i18nKey: 'home.title', text: 'Welcome Home' },
        },
        {
          id: 'subtitle',
          type: 'LocalizedText',
          props: { text: 'Build something' },
        },
        {
          id: 'ignored',
          type: 'UnregisteredComponent',
          props: { i18nKey: 'must.not.be.guessed', text: 'Ignored' },
        },
      ],
    },
  },
];

const COMPONENT_META = {
  LocalizedText: {
    i18n: { fields: [{ keyProp: 'i18nKey', defaultTextProp: 'text' }] },
  },
};

describe('expo localization authoring model', () => {
  test('discovers fields from injected metadata without component-name knowledge', () => {
    expect(
      collectExpoLocalizationTranslatableFields({
        screens: SCREENS,
        componentMeta: COMPONENT_META,
      }),
    ).toEqual([
      {
        screenId: 'home',
        nodeId: 'title',
        componentName: 'LocalizedText',
        keyProp: 'i18nKey',
        defaultTextProp: 'text',
        currentKey: 'home.title',
        defaultText: 'Welcome Home',
        path: 'home > Root > LocalizedText',
      },
      {
        screenId: 'home',
        nodeId: 'subtitle',
        componentName: 'LocalizedText',
        keyProp: 'i18nKey',
        defaultTextProp: 'text',
        currentKey: '',
        defaultText: 'Build something',
        path: 'home > Root > LocalizedText',
      },
    ]);
  });

  test('derives missing translations across every configured locale', () => {
    const fields = collectExpoLocalizationTranslatableFields({
      screens: SCREENS,
      componentMeta: COMPONENT_META,
    });
    expect(
      findExpoLocalizationMissingTranslations({
        fields,
        locales: ['en', 'de', 'fr'],
        dictionaries: {
          en: { 'home.title': 'Welcome' },
          de: { 'home.title': 'Willkommen' },
          fr: {},
        },
      }),
    ).toEqual([{ key: 'home.title', missingLocales: ['fr'], fieldCount: 1 }]);
  });

  test('searches and filters unlinked and missing fields deterministically', () => {
    const fields = collectExpoLocalizationTranslatableFields({
      screens: SCREENS,
      componentMeta: COMPONENT_META,
    });
    const dictionaries = { en: { 'home.title': 'Welcome' }, de: {} };

    expect(
      filterExpoLocalizationTranslatableFields({
        fields,
        searchQuery: 'welcome',
        filter: 'missing-translations',
        locales: ['en', 'de'],
        dictionaries,
      }).map(({ nodeId }) => nodeId),
    ).toEqual(['title']);
    expect(
      filterExpoLocalizationTranslatableFields({
        fields,
        filter: 'unlinked',
        locales: ['en', 'de'],
        dictionaries,
      }).map(({ nodeId }) => nodeId),
    ).toEqual(['subtitle']);
  });

  test('creates stable keys from default text', () => {
    expect(createExpoLocalizationKeyFromText('  Déjà Vu!  ')).toBe('deja_vu');
    expect(createExpoLocalizationKeyFromText('CTA - Primary')).toBe('cta_-_primary');
  });
});
