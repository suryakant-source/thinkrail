import { afterEach, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { renderReachViolations } from "./i18nRenderReach";

const roots: string[] = [];

afterEach(() => {
	for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture(app: string): string {
	const root = mkdtempSync(join(tmpdir(), "thinkrail-render-reach-"));
	roots.push(root);
	const write = (path: string, content: string) => {
		mkdirSync(dirname(join(root, path)), { recursive: true });
		writeFileSync(join(root, path), content);
	};
	write(
		"packages/locales/src/react.tsx",
		"export const t = (key: string) => key;\nexport function currentLocale() { return 'en'; }\nexport type Translator = (key: string) => string;\nexport function useT(): Translator { return t; }\n",
	);
	write(
		"app/tsconfig.json",
		JSON.stringify({
			compilerOptions: { jsx: "preserve", strict: true, noEmit: true },
			include: ["src"],
		}),
	);
	write("app/src/app.tsx", app);
	return root;
}

const texts = (app: string) =>
	renderReachViolations(fixture(app), ["app/tsconfig.json"]).map((v) => `${v.line}:${v.text}`);

test("flags render-time global reads, translating helpers, selectors and getters", () => {
	const app = [
		'import { t, currentLocale, useT, type Translator } from "../../packages/locales/src/react";',
		"declare function useAppStore<T>(selector: (state: number) => T): T;",
		"function label(kind: string) { return t(kind); }",
		"function wrapped(kind: string) { return label(kind); }",
		"function select(state: number) { return t(String(state)); }",
		"export const LABELS = { get one() { return t('one'); } };",
		"function ok(translate: Translator, kind: string) { return translate(kind); }",
		"export function Row({ kind }: { kind: string }) {",
		"  const translate = useT();",
		"  const a = wrapped(kind);",
		"  const b = useAppStore(select);",
		"  const c = [kind].map((k) => t(k));",
		"  const d = new Date().toLocaleString(currentLocale());",
		"  const e = ok(translate, kind);",
		"  const onClick = () => alert(t('later'));",
		"  return [a, b, c, d, e, onClick];",
		"}",
	].join("\n");
	expect(texts(app)).toEqual([
		"6:translating getter",
		"10:wrapped",
		"11:select",
		"12:t",
		"13:currentLocale",
	]);
});
