"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/ui/language-selector";
import { useI18n, type MessageKey } from "@/lib/i18n";

interface DashboardHeaderCopyProps {
  firstName: string;
}

function greetingKey(date: Date): MessageKey {
  const hour = date.getHours();
  if (hour < 12) return "dashboard.greeting.morning";
  if (hour < 18) return "dashboard.greeting.afternoon";
  return "dashboard.greeting.evening";
}

/**
 * The greeting depends on the reader's clock, so it is resolved on the client
 * alongside the interface language instead of being baked into the server
 * render.
 */
export function DashboardGreeting({ firstName }: DashboardHeaderCopyProps) {
  const { t } = useI18n();
  const greeting = useMemo(() => greetingKey(new Date()), []);

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">
        {t(greeting)}, {firstName}.
      </h1>
      <p className="mt-2 text-muted-foreground">{t("dashboard.tagline")}</p>
    </>
  );
}

export function DashboardCreateLink() {
  const { t } = useI18n();

  return (
    <ButtonLink href="/maps/new" label={t("dashboard.create")} />
  );
}

export function DashboardSectionHeading({
  mapCount,
  conceptCount,
}: {
  mapCount: number;
  conceptCount: number;
}) {
  const { t } = useI18n();

  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {t("dashboard.section")}
      </h2>
      {mapCount > 0 && (
        <span className="text-xs text-muted-foreground/80">
          {t("dashboard.counts", {
            maps: mapCount,
            concepts: conceptCount,
          })}
        </span>
      )}
    </div>
  );
}

export function EmptyMapsState() {
  const { t } = useI18n();

  return (
    <div className="mt-5 flex flex-col items-center rounded-2xl border border-dashed border-border bg-card/60 px-6 py-12 text-center">
      {/* A quiet sketch of what a map becomes — no illustration, just structure. */}
      <svg
        viewBox="0 0 160 76"
        aria-hidden="true"
        className="mb-5 h-19 w-40 text-primary"
      >
        <g stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.2" fill="none">
          <path d="M80 26 L44 58" />
          <path d="M80 26 L116 58" />
          <path d="M80 26 L80 58" strokeDasharray="3 4" />
        </g>
        <rect x="62" y="12" width="36" height="14" rx="7" fill="currentColor" />
        <g fill="var(--accent)" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.2">
          <rect x="30" y="56" width="28" height="13" rx="6.5" />
          <rect x="66" y="56" width="28" height="13" rx="6.5" />
          <rect x="102" y="56" width="28" height="13" rx="6.5" />
        </g>
      </svg>

      <p className="text-sm font-medium text-foreground">
        {t("dashboard.empty.title")}
      </p>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
        {t("dashboard.empty.body")}
      </p>

      <div className="mt-5">
        <ButtonLink href="/maps/new" label={t("dashboard.empty.cta")} />
      </div>
    </div>
  );
}

function ButtonLink({ href, label }: { href: string; label: string }) {
  return (
    <Button size="lg" asChild>
      <Link href={href}>
        <Plus className="h-4 w-4" />
        {label}
      </Link>
    </Button>
  );
}

export function DashboardLanguageSelector() {
  return <LanguageSelector />;
}