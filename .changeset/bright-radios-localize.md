---
'@ankhorage/orchestrator-module-expo-localization': minor
---

Derive the SDK 57 `expo-localization` requirement from the released `@ankhorage/expo-runtime/platform` contract, declare the platform owner as a required peer, generate native `supportedLocales` config from module locales, and remove the obsolete pre-`getLocales()` runtime fallback.
