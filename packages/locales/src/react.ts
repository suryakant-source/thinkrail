import i18next from "i18next";
import { initReactI18next, Trans, useTranslation } from "react-i18next";
import { bundledCatalog, type Catalog, EN, type EnglishCatalog, fallbackChain } from "./index";

declare module "i18next" {
	interface CustomTypeOptions {
		defaultNS: "translation";
		resources: { translation: EnglishCatalog };
		keySeparator: false;
		nsSeparator: false;
		returnEmptyString: false;
	}
}

const NAMESPACE = "translation";

export const i18n = i18next.createInstance();

void i18n.use(initReactI18next).init({
	lng: "en",
	fallbackLng: (code: string) => fallbackChain(code).slice(1),
	resources: { en: { [NAMESPACE]: EN } },
	initAsync: false,
	keySeparator: false,
	nsSeparator: false,
	returnEmptyString: false,
	interpolation: { escapeValue: false },
	react: { bindI18nStore: "added removed", useSuspense: false },
});

export const t = i18n.t.bind(i18n);

export function useT() {
	return useTranslation().t;
}

export const T = Trans;

export function currentLocale(): string {
	return i18n.language || "en";
}

export type LocaleOverlays = Readonly<Record<string, Catalog>>;

let touched = new Set<string>(["en"]);

export function applyLocale(tag: string, overlays: LocaleOverlays): void {
	const chain = fallbackChain(tag);
	const languages = new Set([...touched, ...chain, ...Object.keys(overlays)]);
	for (const language of languages) {
		const bundled = bundledCatalog(language);
		const overlay = overlays[language];
		i18n.removeResourceBundle(language, NAMESPACE);
		if (bundled || overlay) {
			i18n.addResourceBundle(language, NAMESPACE, { ...bundled, ...overlay }, false, true);
		}
	}
	touched = languages;
	if (i18n.language !== tag) void i18n.changeLanguage(tag);
}
