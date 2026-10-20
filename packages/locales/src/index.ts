import en from "../en.json";

export type Catalog = Readonly<Record<string, string>>;
export type EnglishCatalog = typeof en;

const PLURAL_SUFFIX = /_(?:zero|one|two|few|many|other)$/;

export type MessageKey = keyof EnglishCatalog extends infer K
	? K extends `${infer Base}_${"zero" | "one" | "two" | "few" | "many" | "other"}`
		? Base
		: K
	: never;

export const EN: Catalog = en;

export const SYSTEM_LOCALE = "system";

/** Keys the desktop app renders in its native menu; the web pushes their translations to it. */
export const DESKTOP_MENU_KEYS = [
	"desktop.menu.edit",
	"desktop.menu.settings",
	"desktop.menu.quit",
	"desktop.menu.window",
	"desktop.menu.close",
] as const satisfies readonly (keyof EnglishCatalog)[];

const BUNDLED: Readonly<Record<string, Catalog>> = { en: EN };

export const BUNDLED_LOCALES: readonly string[] = Object.keys(BUNDLED);

export function bundledCatalog(tag: string): Catalog | undefined {
	return BUNDLED[tag];
}

export function canonicalLocale(tag: string): string | null {
	try {
		return Intl.getCanonicalLocales(tag)[0] ?? null;
	} catch {
		return null;
	}
}

export function localeTagFromFileName(name: string): string | null {
	if (name.startsWith(".") || !name.endsWith(".json")) return null;
	const stem = name.slice(0, -".json".length);
	if (!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(stem)) return null;
	return canonicalLocale(stem);
}

export function baseLanguage(tag: string): string {
	return tag.split("-")[0]?.toLowerCase() ?? tag;
}

export function fallbackChain(tag: string): string[] {
	return [...new Set([tag, baseLanguage(tag), "en"])];
}

export function languageName(tag: string): string {
	let name: string | undefined;
	try {
		name = new Intl.DisplayNames([tag], { type: "language" }).of(tag);
	} catch {
		name = undefined;
	}
	if (!name) return tag;
	return name.charAt(0).toLocaleUpperCase(tag) + name.slice(1);
}

function placeholders(text: string): string {
	const names = new Set<string>();
	for (const match of text.matchAll(/\{\{\s*([^\s,}]+)[^}]*\}\}/g)) {
		if (match[1]) names.add(match[1]);
	}
	if (/\{\{(?![^{}]*\}\})/.test(text)) names.add("{{");
	return [...names].sort().join("\u0000");
}

function englishReference(key: string): string | undefined {
	const exact = EN[key];
	if (exact !== undefined) return exact;
	if (!PLURAL_SUFFIX.test(key)) return undefined;
	const base = key.replace(PLURAL_SUFFIX, "");
	return EN[`${base}_other`] ?? EN[base];
}

export type CatalogValidation = { ok: true; strings: Catalog } | { ok: false; error: "not-object" };

export function validateCatalog(raw: unknown): CatalogValidation {
	if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
		return { ok: false, error: "not-object" };
	}
	const strings: Record<string, string> = {};
	for (const [key, value] of Object.entries(raw)) {
		if (typeof value !== "string") continue;
		const reference = englishReference(key);
		if (reference !== undefined && placeholders(reference) !== placeholders(value)) continue;
		strings[key] = value;
	}
	return { ok: true, strings };
}

function matchAvailable(tag: string, available: readonly string[]): string | undefined {
	const lower = tag.toLowerCase();
	const exact = available.find((candidate) => candidate.toLowerCase() === lower);
	if (exact) return exact;
	const base = baseLanguage(tag);
	return available.find((candidate) => candidate.toLowerCase() === base);
}

export function resolveLocale(
	preference: string,
	available: readonly string[],
	systemLanguages: readonly string[],
): string {
	if (preference !== SYSTEM_LOCALE) {
		const lower = preference.toLowerCase();
		return available.find((candidate) => candidate.toLowerCase() === lower) ?? "en";
	}
	for (const language of systemLanguages) {
		const match = matchAvailable(language, available);
		if (match) return match;
	}
	return "en";
}
