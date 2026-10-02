"use client";

import {
  AlertTriangle,
  Hourglass,
  Info,
  RefreshCw,
  ShieldAlert,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n, type MessageKey } from "@/lib/i18n";

export interface ErrorAlertProps {
  message: string;
  onRetry?: () => void;
  /** Compact form for in-panel use, where the alert should not dominate. */
  compact?: boolean;
}

type ErrorKindId =
  | "generic"
  | "session"
  | "busy"
  | "scanned"
  | "slow"
  | "large"
  | "network"
  | "server"
  | "input";

interface ErrorKind {
  id: ErrorKindId;
  tone: "danger" | "warning";
  icon: LucideIcon;
  titleKey: MessageKey;
  tipKeys: MessageKey[];
}

/**
 * Maps a server message onto a stable kind. Only the kind decides the visible
 * copy, so the rendered text follows the interface language while the server
 * message stays available underneath for diagnostics.
 */
function classify(message: string): ErrorKind {
  const m = message.toLowerCase();

  if (/sign in again|unauthorized|not authenticated|session|login/i.test(m)) {
    return {
      id: "session",
      tone: "warning",
      icon: ShieldAlert,
      titleKey: "error.session.title",
      tipKeys: ["error.session.tip"],
    };
  }

  if (/busy right now|try again in a few seconds|too many requests|try again in a minute|quota|rate limit|rate-limited|temporarily unavailable|model .*unavailable/i.test(m)) {
    return {
      id: "busy",
      tone: "warning",
      icon: AlertTriangle,
      titleKey: "error.busy.title",
      tipKeys: ["error.busy.tip1", "error.busy.tip2"],
    };
  }

  if (/scanned|no selectable text/i.test(m)) {
    return {
      id: "scanned",
      tone: "warning",
      icon: Info,
      titleKey: "error.scanned.title",
      tipKeys: ["error.scanned.tip1", "error.scanned.tip2"],
    };
  }

  if (/server took too long|timed out|timeout|took too long|504|too long to generate|slow to respond/i.test(m)) {
    return {
      id: "slow",
      tone: "warning",
      icon: Hourglass,
      titleKey: "error.slow.title",
      tipKeys: ["error.slow.tip1", "error.slow.tip2"],
    };
  }

  if (/too large|too big|10 mb|50 mb|reduce the pdf|smaller/i.test(m)) {
    return {
      id: "large",
      tone: "warning",
      icon: AlertTriangle,
      titleKey: "error.large.title",
      tipKeys: ["error.large.tip1", "error.large.tip2"],
    };
  }

  if (/could not reach|network|connection|offline/i.test(m)) {
    return {
      id: "network",
      tone: "warning",
      icon: WifiOff,
      titleKey: "error.network.title",
      tipKeys: ["error.network.tip1"],
    };
  }

  if (/server setup error|api key|gemini_model|google_generative_ai_api_key|contact the administrator|not configured/i.test(m)) {
    return {
      id: "server",
      tone: "danger",
      icon: ShieldAlert,
      titleKey: "error.server.title",
      tipKeys: ["error.server.tip1", "error.server.tip2"],
    };
  }

  if (/only .* supported|invalid|could not be processed|try another document|try again\./i.test(m)) {
    return {
      id: "input",
      tone: "warning",
      icon: AlertTriangle,
      titleKey: "error.input.title",
      tipKeys: ["error.input.tip1", "error.input.tip2"],
    };
  }

  return {
    id: "generic",
    tone: "danger",
    icon: ShieldAlert,
    titleKey: "error.generic.title",
    tipKeys: ["error.generic.tip1", "error.generic.tip2"],
  };
}

export function ErrorAlert({ message, onRetry, compact = false }: ErrorAlertProps) {
  const { t } = useI18n();
  const kind = classify(message);
  const Icon = kind.icon;

  const retryButton = onRetry ? (
    <Button size="sm" variant="outline" onClick={onRetry}>
      <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
      {t("error.retry")}
    </Button>
  ) : null;

  if (compact) {
    return (
      <div
        role="alert"
        className={cn(
          "flex flex-col gap-2.5 rounded-lg border px-3.5 py-3",
          kind.tone === "danger"
            ? "border-destructive/25 bg-destructive/5"
            : "border-primary/20 bg-accent/40"
        )}
      >
        <div className="flex items-center gap-2">
          <Icon
            className={cn(
              "h-4 w-4 shrink-0",
              kind.tone === "danger" ? "text-destructive" : "text-primary"
            )}
          />
          <p className="text-xs font-semibold text-foreground">
            {t(kind.titleKey)}
          </p>
        </div>

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {t(kind.tipKeys[0])}
        </p>

        {retryButton && <div>{retryButton}</div>}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-start sm:gap-4",
        kind.tone === "danger"
          ? "border-destructive/25 bg-destructive/5"
          : "border-primary/20 bg-accent/40"
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          kind.tone === "danger"
            ? "bg-destructive/10 text-destructive"
            : "bg-primary/10 text-primary"
        )}
      >
        <Icon className="h-5 w-5" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="text-sm font-semibold text-foreground">
          {t(kind.titleKey)}
        </p>

        <ul className="flex flex-col gap-1">
          {kind.tipKeys.map((tipKey) => (
            <li
              key={tipKey}
              className="flex items-start gap-2 text-xs leading-snug text-muted-foreground"
            >
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
              {t(tipKey)}
            </li>
          ))}
        </ul>

        <p className="text-[11px] text-muted-foreground/70">{message}</p>

        {retryButton && <div className="mt-1">{retryButton}</div>}
      </div>
    </div>
  );
}