import { useCallback, useState } from "react";

export type AppLanguage = "en" | "id";

export const LANGUAGE_STORAGE_KEY = "mb:language";
export const MAP_LANGUAGE_KEY_PREFIX = "mb:map-language:";

export const LANGUAGE_NAME: Record<AppLanguage, string> = {
  en: "English",
  id: "Indonesian",
};

export const LANGUAGE_SHORT: Record<AppLanguage, string> = {
  en: "EN",
  id: "ID",
};

export function parseLanguage(value: unknown): AppLanguage {
  return value === "id" ? "id" : "en";
}

export function getStoredLanguage(): AppLanguage {
  if (typeof window === "undefined") return "en";
  try {
    return parseLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return "en";
  }
}

export function setStoredLanguage(lang: AppLanguage): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // Storage unavailable; language still applies for this session.
  }
}

/** Language saved on the map (set at generation time); falls back to global. */
export function getMapLanguage(mapId: string): AppLanguage {
  if (typeof window === "undefined") return "en";
  try {
    const value = window.localStorage.getItem(
      `${MAP_LANGUAGE_KEY_PREFIX}${mapId}`
    );
    if (value === "en" || value === "id") return value;
  } catch {
    // Fall through to the global preference.
  }
  return getStoredLanguage();
}

export function setMapLanguage(mapId: string, lang: AppLanguage): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${MAP_LANGUAGE_KEY_PREFIX}${mapId}`, lang);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // Storage unavailable; ignore.
  }
}

/**
 * React hook for the app language preference. When `mapId` is provided, the
 * value is initialized from the map's saved language (falling back to the
 * global preference) and every change is persisted to both the map and the
 * global key.
 */
export function useLanguage(mapId?: string) {
  const [language, setLanguage] = useState<AppLanguage>(() =>
    mapId ? getMapLanguage(mapId) : getStoredLanguage()
  );

  const changeLanguage = useCallback(
    (next: AppLanguage) => {
      setLanguage(next);
      setStoredLanguage(next);
      if (mapId) setMapLanguage(mapId, next);
    },
    [mapId]
  );

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => {
      const next = prev === "en" ? "id" : "en";
      setStoredLanguage(next);
      if (mapId) setMapLanguage(mapId, next);
      return next;
    });
  }, [mapId]);

  return { language, setLanguage: changeLanguage, toggleLanguage };
}