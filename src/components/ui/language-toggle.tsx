"use client";

import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useLanguage,
  type AppLanguage,
} from "@/lib/language";

interface LanguageToggleProps {
  mapId?: string;
  language?: AppLanguage;
  onLanguageChange?: (lang: AppLanguage) => void;
}

export function LanguageToggle({
  mapId,
  language: controlledLanguage,
  onLanguageChange,
}: LanguageToggleProps) {
  const internal = useLanguage(mapId);
  const language = controlledLanguage ?? internal.language;
  const setLanguage = onLanguageChange ?? internal.setLanguage;

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-1 py-0.5">
      <Languages className="ml-1 h-3.5 w-3.5 text-muted-foreground" />
      {(["en", "id"] as AppLanguage[]).map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => setLanguage(lang)}
          aria-pressed={language === lang}
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium transition-colors",
            language === lang
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  );
}