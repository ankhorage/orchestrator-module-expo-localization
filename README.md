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
Use the package APIs for ordinary dictionary edits without reinstalling or reconfiguring the module.

Missing locale resource files load as empty dictionaries. Invalid files fail explicitly. Writes are
atomic and keys are sorted so runtime and source-control output remain deterministic. Existing
`translations` ledger data is accepted only as a one-time seed when a canonical locale file does not
yet exist; normalized config never writes dictionaries back to the ledger.

Package-neutral helpers for locale rules and translatable-field discovery are exported from the root
package. Discovery accepts manifest-shaped nodes and component metadata from the caller, so the
module has no Studio component-registry dependency.

## Authoring host contribution

Generic authoring hosts can import the package-owned contribution without adding Studio, ZORA, or
React to the module root:

```ts
import { expoLocalizationHostContribution } from '@ankhorage/orchestrator-module-expo-localization/host';
```

Its serializable `admin` schema continues to describe lifecycle configuration. The sibling
`adminRuntime` is server-side and conforms to the generic single-entry host contract:
`execute(context, { operation, input })`. The host treats the operation string, payload, validation,
and result as opaque module-owned data.

The package exports `EXPO_LOCALIZATION_ADMIN_OPERATIONS` as the canonical operation IDs. Locale and
default-locale operations use the injected lifecycle reconfiguration boundary. Dictionary operations
write canonical locale JSON directly, so ordinary translation edits never reinstall or reconfigure
the module. The load operation derives translatable fields, missing translations, search, and filters
from module-owned domain APIs. The link operation validates eligibility from injected component
metadata and uses the generic manifest mutation callback; new keys are seeded in the configured
default-locale dictionary without overwriting an existing translation.

## Why this exists

Standardizes localization setup across apps.
