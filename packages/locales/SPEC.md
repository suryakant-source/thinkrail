---
id: module-locales
type: module-design
status: draft
title: locales — UI string catalogs and the shared i18next instance
parent: architecture
references: [submodule-server-locales, submodule-web-i18n]
tags: [i18n]
---

## Responsibility

The single owner of ThinkRail's UI strings and of the rules every locale source obeys
([[architecture]] Decision 22). It ships the bundled catalogs — `en.json` is the English source of truth
and the file translators start from — and the pure functions that validate a catalog, name a file's
language, and pick the language to render. Its `./react` entry holds the **one** i18next instance every
browser surface (`apps/web`, `packages/ui`, extension web halves) renders through, so they cannot drift
onto separate instances.

## Public surface

- **Root `@thinkrail/locales`** (pure, browser- and server-safe, no React):
  - `EN` — the English catalog; `MessageKey` — its key union (plural suffixes `_one`/`_other`/… fold
    into the base key).
  - `BUNDLED_LOCALES` — the tags shipped with this build (`["en"]` today) and `bundledCatalog(tag)`.
  - `localeTagFromFileName(name)` — `de.json` → `"de"`, canonicalized through `Intl.getCanonicalLocales`;
    `null` for a non-`.json`, dot-prefixed, or non-BCP-47 name.
  - `validateCatalog(raw)` — `{ ok: true, strings } | { ok: false, error }`. The value must be a JSON
    object (else a file-level error). Non-string values are dropped; a string for a known key whose
    `{{placeholder}}` set differs from English's is dropped; unknown keys are kept (a file may be older or
    newer than the app). Dropping is silent.
  - `resolveLocale(preference, available, systemLanguages)` — `"system"` walks `systemLanguages` and
    takes the first exact available tag, else its base language; an explicit tag is used only when
    available; otherwise `"en"`.
  - `baseLanguage(tag)` and `fallbackChain(tag)` (`[tag, base, "en"]`, deduped).
- **`@thinkrail/locales/react`** (browser): the initialized i18next instance (`i18n`), `useT()` (typed
  `t`), `<T>` (react-i18next `Trans` for strings carrying markup), `currentLocale()` for `Intl`
  formatting, and `applyLocale(tag, overlays)` which installs `bundled[tag] ∪ overlays[tag]` per chain
  member and switches language.

## Format

Flat i18next JSON v4: one level of `"dotted.named.key": "text"`; `{{name}}` interpolation;
`key_one`/`key_other` (and other CLDR categories) plurals resolved through `Intl.PluralRules`; `<0>…</0>`
indexed markup only for `<T>` strings. No metadata block. The instance runs with `keySeparator: false`,
`nsSeparator: false`, `escapeValue: false` (React escapes), and `bindI18nStore: "added"` so a live file edit
re-renders. It initializes **synchronously with English at import**, so any surface — including tests with
no setup — renders English.

Keys are named by surface (`settings.language.title`, `chat.composer.placeholder`), never English text: a
wording fix must not orphan translations. `en.json` stays sorted.

## Boundary

- **Allowed deps:** none in the workspace; external `i18next`, `react-i18next` (`./react` only), `react`
  (peer).
- **Consumers:** `apps/web`, `packages/ui`, `thinkrail-extensions/*/web` (both entries);
  `packages/server` and `apps/desktop` (root only).
- **Forbidden:** wire types, transport, stores, file-system access (the host reads files), any
  knowledge of where local files live.
