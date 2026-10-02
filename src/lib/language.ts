import { useSyncExternalStore } from "react";

export type AppLanguage = "en" | "id";

export const LANGUAGE_STORAGE_KEY = "mb:language";
export const MAP_LANGUAGE_KEY_PREFIX = "mb:map-language:";

export const LANGUAGE_NAME: Record<AppLanguage, string> = {
  en: "English",
  id: "Bahasa Indonesia",
};

export const LANGUAGE_SHORT: Record<AppLanguage, string> = {
  en: "EN",
  id: "ID",
};

export function parseLanguage(value: unknown): AppLanguage {
  return value === "id" ? "id" : "en";
}

/* ------------------------------------------------------------------ *
 * Shared subscription
 *
 * Every hook instance in the tab listens to the same emitter, so a
 * language change in one component immediately reaches the others.
 * `useSyncExternalStore` keeps server rendering at "en" (no localStorage)
 * without a hydration mismatch.
 * ------------------------------------------------------------------ */

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribeLanguage(listener: () => void): () => void {
  listeners.add(listener);

  const onStorage = (event: StorageEvent) => {
    if (
      event.key === null ||
      event.key === LANGUAGE_STORAGE_KEY ||
      event.key.startsWith(MAP_LANGUAGE_KEY_PREFIX)
    ) {
      emit();
    }
  };

  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function safeGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage unavailable; the choice still applies for this session.
  }
}

const serverSnapshot = (): AppLanguage => "en";

/** The application's interface language. */
export function getStoredLanguage(): AppLanguage {
  return parseLanguage(safeGet(LANGUAGE_STORAGE_KEY));
}

export function setStoredLanguage(lang: AppLanguage): void {
  if (parseLanguage(getStoredLanguage()) === lang && safeGet(LANGUAGE_STORAGE_KEY)) {
    return;
  }
  safeSet(LANGUAGE_STORAGE_KEY, lang);
  emit();
}

/**
 * The language a map's content is written in. Stored per map and never
 * overwritten by a later UI language change; falls back to the UI language
 * only for maps that have no stored value yet.
 */
export function getMapLanguage(mapId: string): AppLanguage {
  const stored = safeGet(`${MAP_LANGUAGE_KEY_PREFIX}${mapId}`);
  if (stored === "en" || stored === "id") return stored;
  return getStoredLanguage();
}

/** Records a map's content language. Deliberately does not touch the UI language. */
export function setMapLanguage(mapId: string, lang: AppLanguage): void {
  safeSet(`${MAP_LANGUAGE_KEY_PREFIX}${mapId}`, lang);
  emit();
}

export function useUiLanguage() {
  const language = useSyncExternalStore(
    subscribeLanguage,
    getStoredLanguage,
    serverSnapshot
  );
  return { language, setLanguage: setStoredLanguage };
}

/**
 * Content language for one map. AI operations on that map always use this
 * value, even if the interface language changes later.
 */
export function useMapLanguage(mapId: string) {
  const language = useSyncExternalStore(
    subscribeLanguage,
    () => getMapLanguage(mapId),
    serverSnapshot
  );
  return {
    language,
    setLanguage: (lang: AppLanguage) => setMapLanguage(mapId, lang),
  };
}