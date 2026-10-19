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
