---
id: submodule-web-i18n
type: submodule-design
status: draft
title: i18n — active language and local catalogs in the web client
parent: module-web
depends-on: [module-locales, module-contracts]
tags: [i18n]
---

## Responsibility

Turns the synced `AppConfig.locale` preference, the browser's languages, the bundled catalogs, and the
host's local files ([[submodule-server-locales]]) into the one active language of the shared i18next
instance ([[module-locales]] `./react`). Components never do this themselves: they call `useT()`.

## Boundary

- **Owns:** the `languageOptions` derivation (System + every available tag with its own-language name via
  `Intl.DisplayNames` and its source: `builtin`, `local`, `builtin+local`, or a broken/missing entry),
  the effective-tag derivation (`resolveLocale`), and the one apply effect — install overlays, switch
  language, set `<html lang>`, push desktop menu labels through the optional native bridge.
- **Public surface (barrel):** `useLocaleSync()` (mounted once by the shell), `selectLanguageOptions`,
  `selectEffectiveLocale`.
- **Allowed deps:** `store`, `transport`, `@thinkrail/locales`, `@thinkrail/contracts`.
- **Forbidden:** rendering UI (the Language page lives in `panels`), reading files, a second i18next
  instance.

## Get right

- English is installed synchronously before first paint, so nothing renders keys while the host
  connects; local strings arrive later and re-render in place.
- A selected local tag that disappears (file deleted, now broken, or a host without
  `LOCALES_PROTOCOL_VERSION`) renders English while the preference stays untouched, and returns when the
  file does.
- Dates and numbers use `currentLocale()`, never a hardcoded `"en-US"` or the bare browser default.
