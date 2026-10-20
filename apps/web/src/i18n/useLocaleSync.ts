import type { LocalLocalesSnapshot } from "@thinkrail/contracts";
import { fallbackChain } from "@thinkrail/locales";
import { applyLocale } from "@thinkrail/locales/react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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

export function localeSignature(tag: string, snapshot: LocalLocalesSnapshot | null): string {
	const overlays = localOverlays(snapshot);
	return JSON.stringify([tag, fallbackChain(tag).map((language) => overlays[language] ?? null)]);
}

const INITIAL_SIGNATURE = localeSignature("en", null);

export function useLocaleSync(): number {
	const preference = useAppStore((s) => s.locale);
	const snapshot = useAppStore((s) => s.localLocales);
	const systemLanguages = useSystemLanguages();
	const applied = useRef(INITIAL_SIGNATURE);
	const [revision, setRevision] = useState(0);
	useEffect(() => {
		const tag = effectiveLocale(preference, snapshot, systemLanguages.split(","));
		const signature = localeSignature(tag, snapshot);
		if (signature === applied.current) return;
		applied.current = signature;
		applyLocale(tag, localOverlays(snapshot));
		document.documentElement.lang = tag;
		pushNativeMenuLabels();
		setRevision((current) => current + 1);
	}, [preference, snapshot, systemLanguages]);
	return revision;
}
