"use client";

import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useMapLanguage,
  useUiLanguage,
  type AppLanguage,
} from "@/lib/language";
import { LANGUAGE_LABELS, type MessageKey } from "@/lib/i18n";

interface LanguageToggleProps {
  /**
   * When set, the toggle edits this map's content language instead of the
   * application interface language.
   */
  mapId?: string;
  language?: AppLanguage;
  onLanguageChange?: (lang: AppLanguage) => void;
  /** Describes what the selection changes, for screen readers. */
  labelKey?: MessageKey;
  className?: string;
  /** Blocks interaction, e.g. while a language change is still running. */
  disabled?: boolean;
  /** Marks the toggle busy so the current language stays visible. */
  busy?: boolean;
}

export function LanguageToggle({
  mapId,
  language: controlledLanguage,
  onLanguageChange,
  labelKey,
  className,
  disabled = false,
  busy = false,
}: LanguageToggleProps) {
  const uiLanguage = useUiLanguage();
  const mapLanguage = useMapLanguage(mapId ?? "");

  // A map toggle edits map content; a bare toggle edits the interface.
  const fallback = mapId ? mapLanguage : uiLanguage;
  const language = controlledLanguage ?? fallback.language;
  const setLanguage = onLanguageChange ?? fallback.setLanguage;

  return (
    <div
      role="group"
      aria-label={labelKey ? undefined : "Language"}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-card px-1 py-0.5",
        className
      )}
    >
      <Languages
        className={cn(
          "ml-1 h-3.5 w-3.5",
          busy ? "animate-pulse text-primary" : "text-muted-foreground"
        )}
      />
      {(["en", "id"] as AppLanguage[]).map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => setLanguage(lang)}
          disabled={disabled}
          aria-pressed={language === lang}
          aria-busy={busy || undefined}
          title={LANGUAGE_LABELS[lang].native}
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            "disabled:cursor-not-allowed disabled:opacity-60",
            language === lang
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {LANGUAGE_LABELS[lang].short}
        </button>
      ))}
    </div>
  );
}