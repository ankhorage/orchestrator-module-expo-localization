---
'@ankhorage/orchestrator-module-expo-localization': minor
---

Own locale validation, canonical dictionary resources, and metadata-driven translatable-field discovery in the localization module. Translation dictionaries now live only in runtime-consumed locale JSON resources and can be edited without module reconfiguration. Require Orchestrator 0.3.1 so failed lifecycle reconfiguration preserves the exact domain-edited resource pre-state.
