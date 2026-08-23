---
'@ankhorage/orchestrator-module-expo-localization': minor
---

Derive the SDK 57 `expo-localization` requirement from the released `@ankhorage/expo-runtime/platform` contract, consume Expo Runtime 3 as the module's direct platform-contract dependency, generate native `supportedLocales` config from module locales, and remove the obsolete pre-`getLocales()` runtime fallback.
