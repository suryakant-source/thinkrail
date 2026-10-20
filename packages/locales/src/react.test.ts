import { afterEach, expect, test } from "bun:test";
import { applyLocale, currentLocale, t } from "./react";

afterEach(() => applyLocale("en", {}));

test("renders English synchronously with no setup", () => {
	expect(t("desktop.menu.edit")).toBe("Edit");
	expect(currentLocale()).toBe("en");
});

test("a local overlay wins and missing strings fall back to English", () => {
	applyLocale("de", { de: { "desktop.menu.edit": "Bearbeiten" } });
	expect(currentLocale()).toBe("de");
	expect(t("desktop.menu.edit")).toBe("Bearbeiten");
	expect(t("desktop.menu.window")).toBe("Window");
});

test("a regional tag falls back through its base language overlay", () => {
	applyLocale("de-AT", { "de-AT": {}, de: { "desktop.menu.window": "Fenster" } });
	expect(t("desktop.menu.window")).toBe("Fenster");
});

test("re-applying without an overlay removes its strings", () => {
	applyLocale("de", { de: { "desktop.menu.edit": "Bearbeiten" } });
	applyLocale("de", {});
	expect(t("desktop.menu.edit")).toBe("Edit");
});

test("an English overlay customizes the bundled catalog and can be removed", () => {
	applyLocale("en", { en: { "desktop.menu.edit": "Editing" } });
	expect(t("desktop.menu.edit")).toBe("Editing");
	applyLocale("en", {});
	expect(t("desktop.menu.edit")).toBe("Edit");
});

test("<T> renders interpolated values as literal text, never as markup", async () => {
	const { createElement } = await import("react");
	const { renderToStaticMarkup } = await import("react-dom/server");
	const { T } = await import("./react");
	applyLocale("de", { de: { "settings.language.add.steps": "Lade <0>en.json</0> von {{base}}" } });
	const markup = renderToStaticMarkup(
		createElement(T, {
			i18nKey: "settings.language.add.steps",
			values: { base: "feature/<strong>main</strong> & co" },
			components: [createElement("a", { key: "a", href: "https://github.com/" })],
		}),
	);
	expect(markup).toBe(
		'Lade <a href="https://github.com/">en.json</a> von feature/&lt;strong&gt;main&lt;/strong&gt; &amp; co',
	);
});

test("prototype-named overlay keys never pollute objects", () => {
	applyLocale("de", { de: JSON.parse('{"__proto__":{"polluted":"yes"},"constructor":"c"}') });
	expect(({} as Record<string, unknown>).polluted).toBeUndefined();
	expect(t("desktop.menu.edit")).toBe("Edit");
});
