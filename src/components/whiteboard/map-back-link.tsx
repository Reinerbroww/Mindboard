"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n";

/**
 * Client-rendered so the back link's label follows the interface language,
 * which lives in the browser rather than in the server render.
 */
export function MapBackLink() {
  const { t } = useI18n();

  return (
    <Link
      href="/dashboard"
      className="flex shrink-0 items-center gap-1 rounded-md px-1 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="hidden sm:inline">{t("nav.backToDashboard")}</span>
    </Link>
  );
}