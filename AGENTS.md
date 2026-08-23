# Repository guidance

This repository follows the standalone Ankhorage package structure: keep cross-package imports on published public APIs, preserve module-owned source and templates here, and keep generic reusable behavior in its owning package.

The narrow rules in `eslint.local.config.mjs` cover existing object-indexing security warnings and oversized legacy test callbacks exposed by the Devtools 1.6 migration. New or materially changed code must satisfy the canonical Devtools rules; do not expand those file lists, and remove each exception when its listed legacy file is structurally cleaned up.
