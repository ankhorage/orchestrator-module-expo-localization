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

Generic authoring hosts can opt into the package-owned metadata, layout integration, config
normalizer, and serializable admin schema without making the core module depend on Studio:

```ts
import { expoLocalizationHostContribution } from '@ankhorage/orchestrator-module-expo-localization/host';
```

## Why this exists

Standardizes localization setup across apps.
