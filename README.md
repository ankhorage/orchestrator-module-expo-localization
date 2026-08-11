# orchestrator-module-expo-localization

Adds localization support to Expo apps.

## 🎯 What you get

- Localization setup instantly
- No boilerplate
- Fully reversible

## Usage

```ts
import { createOrchestrator } from '@ankhorage/orchestrator';
import { expoLocalizationModule } from '@ankhorage/orchestrator-module-expo-localization';

const orchestrator = createOrchestrator({
  modules: [expoLocalizationModule],
  projectRoot: '/path/to/project',
});

await orchestrator.installModule('expo-localization', { config: {} });
```

The Orchestrator ledger is the canonical lifecycle and configuration source. Updating an existing
installation uses `reconfigureModule()`, which also removes outputs recorded by an earlier module
version before generating the canonical `src/modules/localization` namespace.

The ledger configuration contains only lifecycle settings (`locales` and `defaultLocale`).
Translation dictionaries are module-owned domain resources at
`src/modules/localization/locales/{locale}.json`. These files are the single writable dictionary
source and are imported directly by the generated runtime; they are not mirrored into ledger config.
Use the package APIs for ordinary dictionary edits without reinstalling or reconfiguring the module:

```ts
import {
  readExpoLocalizationDictionaries,
  setExpoLocalizationTranslation,
} from '@ankhorage/orchestrator-module-expo-localization';

const dictionaries = await readExpoLocalizationDictionaries({
  projectRoot: '/path/to/project',
  locales: ['en', 'de'],
});

await setExpoLocalizationTranslation({
  projectRoot: '/path/to/project',
  locale: 'de',
  key: 'home.title',
  value: 'Startseite',
});
```

Missing locale resource files load as empty dictionaries. Invalid files fail explicitly. Writes are
atomic and keys are sorted so runtime and source-control output remain deterministic. Existing
`translations` ledger data is accepted only as a one-time seed when a canonical locale file does not
yet exist; normalized config never writes dictionaries back to the ledger.

Package-neutral helpers for locale rules and translatable-field discovery are also exported from the
root package. Discovery accepts manifest-shaped nodes and component metadata from the caller, so the
module has no Studio component-registry dependency.

Generic authoring hosts can opt into the package-owned metadata, layout integration, config
normalizer, and serializable admin schema without making the core module depend on Studio:

```ts
import { expoLocalizationHostContribution } from '@ankhorage/orchestrator-module-expo-localization/host';
```

## Why this exists

Standardizes localization setup across apps.
