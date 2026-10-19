import { describe, expect, test } from "bun:test";
import {
	fallbackChain,
	languageName,
	localeTagFromFileName,
	resolveLocale,
	validateCatalog,
} from "./index";

describe("localeTagFromFileName", () => {
	test("canonicalizes BCP-47 file names", () => {
		expect(localeTagFromFileName("de.json")).toBe("de");
		expect(localeTagFromFileName("pt-br.json")).toBe("pt-BR");
		expect(localeTagFromFileName("zh-Hant-TW.json")).toBe("zh-Hant-TW");
	});

	test("rejects non-language names", () => {
		expect(localeTagFromFileName("notes.txt")).toBeNull();
		expect(localeTagFromFileName(".de.json")).toBeNull();
		expect(localeTagFromFileName("my translation.json")).toBeNull();
		expect(localeTagFromFileName("x.json")).toBeNull();
	});
});

describe("validateCatalog", () => {
	test("rejects a non-object root", () => {
		expect(validateCatalog([]).ok).toBe(false);
		expect(validateCatalog("hi").ok).toBe(false);
		expect(validateCatalog(null).ok).toBe(false);
	});

	test("keeps strings, drops non-strings, keeps unknown keys", () => {
		const result = validateCatalog({
			"desktop.menu.edit": "Bearbeiten",
			"desktop.menu.window": 3,
			"future.key": "Zukunft",
		});
		expect(result).toEqual({
			ok: true,
			strings: { "desktop.menu.edit": "Bearbeiten", "future.key": "Zukunft" },
		});
	});

	test("drops a known string whose placeholders differ from English", () => {
		const result = validateCatalog({ "desktop.menu.quit": "{{app}} beenden" });
		expect(result).toEqual({ ok: true, strings: {} });
	});
});

describe("resolveLocale", () => {
	const available = ["en", "de", "pt-BR"];

	test("system walks browser languages: exact, then base", () => {
		expect(resolveLocale("system", available, ["fr-FR", "pt-BR"])).toBe("pt-BR");
		expect(resolveLocale("system", available, ["de-AT"])).toBe("de");
		expect(resolveLocale("system", available, ["ja"])).toBe("en");
	});

	test("an explicit tag is used only when available", () => {
		expect(resolveLocale("de", available, ["ja"])).toBe("de");
		expect(resolveLocale("uk", available, ["de"])).toBe("en");
	});
});

test("fallbackChain dedupes tag, base, English", () => {
	expect(fallbackChain("pt-BR")).toEqual(["pt-BR", "pt", "en"]);
	expect(fallbackChain("en")).toEqual(["en"]);
});

test("languageName uses the language's own name", () => {
	expect(languageName("de")).toBe("Deutsch");
	expect(languageName("en")).toBe("English");
});
