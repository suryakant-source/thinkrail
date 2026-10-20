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
  - `SYSTEM_LOCALE` (`"system"`), `canonicalLocale(tag)`, `languageName(tag)` (own-language name via
    `Intl.DisplayNames`, first letter upper-cased), and `DESKTOP_MENU_KEYS` — the keys the desktop's native
    menu renders, one list for the desktop and the web that pushes their translations.
  - `localeTagFromFileName(name)` — `de.json` → `"de"`, canonicalized through `Intl.getCanonicalLocales`;
    `null` for a non-`.json`, dot-prefixed, or non-BCP-47 name.
  - `validateCatalog(raw)` — `{ ok: true, strings } | { ok: false, error: "not-object" }`. The value
    must be a JSON object. Dropped, silently: non-string and empty values (English shows instead); a string
    for a known key whose `{{placeholder}}` set or indexed-markup set (`<0>`, `</0>`, `<1/>`) differs from
    English's; any tag that is not a bare indexed marker (no attributes, no named tags — a catalog must not
    override a code-owned component's props such as a link's `href`). Unknown keys are kept as data (a file
    may be older or newer than the app); key lookups use own properties only, so `constructor` or
    `__proto__` are ordinary keys. The bundled English catalog passes this same validation.
  - `resolveLocale(preference, available, systemLanguages)` — `"system"` walks `systemLanguages` and
    takes the first exact available tag, else its base language; an explicit tag is used only when
    available; otherwise `"en"`.
  - `baseLanguage(tag)` and `fallbackChain(tag)` (`[tag, base, "en"]`, deduped).
- **`@thinkrail/locales/react`** (browser): the initialized i18next instance (`i18n`), `useT()` (typed
  `t` for components), `t` (the same function for pure modules, store actions and toasts — called at use
  time, never at module load), `<T>` (react-i18next `Trans` for strings carrying markup; it subscribes to
  language changes and escapes interpolated values before markup is parsed, unescaping text nodes after, so
  a value such as a branch named `feature/<b>x</b>` renders literally), `currentLocale()`
  for `Intl` formatting, and `applyLocale(tag, overlays)` which removes and re-adds `bundled ∪ overlay` for
  every chain member (so a deleted overlay's strings disappear) and switches language.

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

## Get right

- English output is the contract tests pin: a catalog edit that changes English wording is a product
  change, reviewed like one. Plural pairs carry real English singulars (`"1 group"`, never `"1 groups"`).
- Text resolved outside React (layout `reason`s, default tab and terminal titles, renderer labels via
  getters, `MCP_STATE_LABEL`) reads the language current at call time; the web client remounts its UI on a
  language change so cached render output never keeps the old language ([[submodule-web-i18n]]).
- Persisted or wire identifiers never carry translated text: built-in layout preset names translate only
  at render, a default terminal title is recognized in the current language and in English so numbering
  survives a switch, and markers matched on save (MCP's hidden-value placeholder) stay literal.

## Deferred

Bundled non-English catalogs (the `BUNDLED` map is the seam), RTL layout (`dir`), a first-paint locale
hint (until the host answers `locales.list`, a local language renders English for a moment), and
translating server error text (errors would move to codes the client renders).
