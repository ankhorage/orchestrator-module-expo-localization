# @ankhorage/orchestrator-module-expo-localization

## 0.6.0

### Minor Changes

- 48e480e: Derive the SDK 57 `expo-localization` requirement from the released `@ankhorage/expo-runtime/platform` contract, consume Expo Runtime 3 as the module's direct platform-contract dependency, generate native `supportedLocales` config from module locales, and remove the obsolete pre-`getLocales()` runtime fallback.

## 0.5.2

### Patch Changes

- 7c05e2e: Keep the optional Localization admin view browser-safe by separating its module identifier from the server-side module definition dependency graph.

## 0.5.1

### Patch Changes

- 0ea3011: Keep the optional Localization admin view browser-safe by separating shared operation identifiers from the server-side admin runtime dependency graph.

## 0.5.0

### Minor Changes

- ba14722: Add the optional package-owned React/ZORA Localization administration view for locale management, canonical dictionary editing, metadata-driven field linking, and missing-translation authoring through the opaque module admin runtime contract.

## 0.4.0

### Minor Changes

- 27d81c9: Add the package-owned Localization administration runtime for lifecycle configuration, canonical dictionary editing, metadata-driven authoring state, and translation-key linking through injected generic host context.

## 0.3.0

### Minor Changes

- 9bd52ad: Own locale validation, canonical dictionary resources, and metadata-driven translatable-field discovery in the localization module. Translation dictionaries now live only in runtime-consumed locale JSON resources and can be edited without module reconfiguration. Require Orchestrator 0.3.1 so failed lifecycle reconfiguration preserves the exact domain-edited resource pre-state.

## 0.2.0

### Minor Changes

- ef56e0d: Generate localization runtime files under the canonical `src/modules/localization` namespace and rename the generated provider to `LocalizationModuleProvider`. Add an optional package-owned host contribution with generic metadata, layout integration, config normalization, and a serializable admin schema while keeping the root Orchestrator module standalone.

## 0.1.5

### Patch Changes

- 2b1866c: Generate localization runtime files with direct `@ankhorage/runtime` imports and reject the retired `@ankh/runtime` workspace alias in regression coverage.

## 0.1.4

### Patch Changes

- ee45f8e: Update packages

## 0.1.3

### Patch Changes

- 35a8eab: Generate localization wiring through `@ankh/runtime` renderer config (prop resolver + `setLanguage` action handler) instead of Surface translation context.

## 0.1.2

### Patch Changes

- Refresh the README copy so the published module overview and install usage stay aligned with the current messaging.

## 0.1.1

### Patch Changes

- Align the module repo with the agreed standard by shipping module-owned template files, adding knip verification, and tightening CI checks.

## 0.1.0

### Minor Changes

- Add the first publishable expo-localization module for `@ankhorage/orchestrator`.
