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

- **Hydration:** `transport` reads `locales.list` after each welcome from a v86+ host and again on every
  `locales.changed` nudge, installing the snapshot with `installLocalLocales` (an older host installs
  `null`, so only bundled languages exist). This module only derives from the store.
- **Owns:** the `languageOptions` derivation (System + every available tag with its own-language name via
  `Intl.DisplayNames` and its source: `builtin`, `local`, `builtin+local`, or a broken/missing entry),
  the effective-tag derivation (`resolveLocale` over the browser's `navigator.languages`, re-read on
  `languagechange`), and the one apply effect — install overlays, switch language, set `<html lang>`,
  push desktop menu labels through the optional `__THINKRAIL_NATIVE_MENU__` bridge (`pushNativeMenuLabels`).
- **Public surface (barrel):** `LocaleBoundary` (mounted once by `main.tsx` around the whole app),
  `useSystemLanguages()`, `localeSignature`, and the pure `languageOptions`, `effectiveLocale`,
  `availableLocales`, `localOverlays`.
- **Allowed deps:** `store`, `@thinkrail/locales`, `@thinkrail/contracts` (types).
- **Forbidden:** rendering UI (the Language page lives in `panels`), reading files, a second i18next
  instance.

## Get right

- **A language or catalog change remounts the app subtree.** `LocaleBoundary` keys its children by a
  revision that advances when the effective tag or the strings of its fallback chain change
  (`localeSignature`; an unrelated file's edit does not count). The store, transport socket and host state
  live outside React and survive; component-local state (an editor's cursor, a terminal's attachment) is
  rebuilt the way StrictMode already exercises. Reason: the React Compiler caches render output by each
  expression's own inputs, so text produced by `t` inside render helpers, getters (`MCP_STATE_LABEL`,
  renderer `label`s) or memoized subtrees would otherwise stay in the old language. Rejected: threading the
  hook's `t` through every render helper — dozens of modules with no tool to prove none was missed.

- English is installed synchronously before first paint, so nothing renders keys while the host
  connects; local strings arrive later and re-render in place.
- A selected local tag that disappears (file deleted, now broken, or a host without
  `LOCALES_PROTOCOL_VERSION`) renders English while the preference stays untouched, and returns when the
  file does.
- Dates and numbers use `currentLocale()`, never a hardcoded `"en-US"` or the bare browser default.
