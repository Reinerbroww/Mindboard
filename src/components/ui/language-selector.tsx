"use client";

import { Languages } from "lucide-react";
import {
  useMapLanguage,
  useUiLanguage,
  type AppLanguage,
} from "@/lib/language";
import { LANGUAGE_LABELS, useI18n } from "@/lib/i18n";

interface LanguageSelectorProps {
  /**
   * When set, the selector edits this map's content language instead of the
   * application interface language.
   */
  mapId?: string;
}

/**
 * A labelled dropdown for choosing a language. Used where there is room to name
 * the choice; `LanguageToggle` stays for dense toolbars.
 */
export function LanguageSelector({ mapId }: LanguageSelectorProps) {
  const { t } = useI18n();
  const uiLanguage = useUiLanguage();
  const mapLanguage = useMapLanguage(mapId ?? "");

  const target = mapId ? mapLanguage : uiLanguage;
  const label = t(mapId ? "lang.mapSelector" : "lang.dashboardSelector");

  return (
    <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Languages className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={target.language}
        onChange={(event) =>
          target.setLanguage(event.target.value as AppLanguage)
        }
        className="cursor-pointer rounded-full border border-border bg-card px-2 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        {(["en", "id"] as AppLanguage[]).map((lang) => (
          <option key={lang} value={lang}>
            {LANGUAGE_LABELS[lang].native}
          </option>
        ))}
      </select>
    </label>
  );
}