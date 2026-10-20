import { applyLocale } from "@thinkrail/locales/react";
import { useEffect, useSyncExternalStore } from "react";
import { useAppStore } from "../store";
import { effectiveLocale, localOverlays } from "./languages";
import { pushNativeMenuLabels } from "./nativeMenu";

function subscribeLanguages(onChange: () => void): () => void {
	window.addEventListener("languagechange", onChange);
	return () => window.removeEventListener("languagechange", onChange);
}

function readLanguages(): string {
	return typeof navigator === "undefined" ? "" : (navigator.languages ?? []).join(",");
}

export function useSystemLanguages(): string {
	return useSyncExternalStore(subscribeLanguages, readLanguages, readLanguages);
}

export function useLocaleSync(): void {
	const preference = useAppStore((s) => s.locale);
	const snapshot = useAppStore((s) => s.localLocales);
	const systemLanguages = useSystemLanguages();
	useEffect(() => {
		const tag = effectiveLocale(preference, snapshot, systemLanguages.split(","));
		applyLocale(tag, localOverlays(snapshot));
		document.documentElement.lang = tag;
		pushNativeMenuLabels();
	}, [preference, snapshot, systemLanguages]);
}
