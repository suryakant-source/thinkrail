import { type FSWatcher, mkdirSync, readdirSync, readFileSync, statSync, watch } from "node:fs";
import { join } from "node:path";
import type {
	LocalLocaleFile,
	LocalLocaleFileErrorCode,
	LocalLocalesSnapshot,
} from "@thinkrail/contracts";
import { localeTagFromFileName, validateCatalog } from "@thinkrail/locales";
import { logger } from "../log";
import { dataDir } from "../persistence";

const log = logger("locales");

export const MAX_LOCALE_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_LOCALE_FILES = 64;
const DEBOUNCE_MS = 150;
const RETRY_MS = 1_000;

export function localesDir(root: string = dataDir()): string {
	return join(root, "locales");
}

function failure(
	fileName: string,
	tag: string | null,
	error: LocalLocaleFileErrorCode,
	detail?: string,
): LocalLocaleFile {
	return { fileName, tag, ok: false, error, ...(detail ? { detail } : {}) };
}

function describe(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function readLocaleFile(dir: string, fileName: string): LocalLocaleFile {
	const tag = localeTagFromFileName(fileName);
	if (!tag) return failure(fileName, null, "invalid-name");
	const path = join(dir, fileName);
	let text: string;
	try {
		if (statSync(path).size > MAX_LOCALE_FILE_BYTES) return failure(fileName, tag, "too-large");
		text = readFileSync(path, "utf8");
	} catch (error) {
		return failure(fileName, tag, "unreadable", describe(error));
	}
	let raw: unknown;
	try {
		raw = JSON.parse(text);
	} catch (error) {
		return failure(fileName, tag, "invalid-json", describe(error));
	}
	const result = validateCatalog(raw);
	if (!result.ok) return failure(fileName, tag, result.error);
	return { fileName, tag, ok: true, strings: { ...result.strings } };
}

export function readLocalLocales(dir: string = localesDir()): LocalLocalesSnapshot {
	let names: string[];
	try {
		names = readdirSync(dir)
			.filter((name) => name.endsWith(".json") && !name.startsWith("."))
			.sort();
	} catch {
		names = [];
	}
	const seen = new Set<string>();
	const files = names.map((fileName, index) => {
		if (index >= MAX_LOCALE_FILES) {
			return failure(fileName, localeTagFromFileName(fileName), "too-many");
		}
		const file = readLocaleFile(dir, fileName);
		if (file.tag === null) return file;
		const key = file.tag.toLowerCase();
		if (seen.has(key)) return failure(fileName, file.tag, "duplicate");
		seen.add(key);
		return file;
	});
	return { dir, files };
}

export interface LocalesWatchOptions {
	dir?: string;
	onChange: () => void;
}

export function watchLocalLocales({
	dir = localesDir(),
	onChange,
}: LocalesWatchOptions): () => void {
	let watcher: FSWatcher | undefined;
	let debounce: ReturnType<typeof setTimeout> | undefined;
	let retry: ReturnType<typeof setTimeout> | undefined;
	let stopped = false;
	const restart = () => {
		watcher?.close();
		watcher = undefined;
		if (stopped || retry !== undefined) return;
		retry = setTimeout(() => {
			retry = undefined;
			start();
		}, RETRY_MS);
	};
	const nudge = () => {
		clearTimeout(debounce);
		debounce = setTimeout(onChange, DEBOUNCE_MS);
	};
	const start = () => {
		if (stopped) return;
		try {
			mkdirSync(dir, { recursive: true });
			watcher = watch(dir, { persistent: false }, nudge);
			watcher.on("error", () => {
				log.warn(`locale folder watcher failed for ${dir}`);
				nudge();
				restart();
			});
		} catch {
			log.warn(`could not watch locale folder ${dir}`);
			restart();
		}
	};
	start();
	return () => {
		stopped = true;
		clearTimeout(debounce);
		clearTimeout(retry);
		watcher?.close();
	};
}
