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

export interface ErrorAlertProps {
  message: string;
  onRetry?: () => void;
}

interface ErrorKind {
  title: string;
  tone: "danger" | "warning";
  icon: LucideIcon;
  tips: string[];
}

function classify(message: string): ErrorKind {
  const m = message.toLowerCase();
  const danger: ErrorKind = {
    title: "Something went wrong",
    tone: "danger",
    icon: ShieldAlert,
    tips: ["Give it another try in a moment.", "If it keeps happening, contact support."],
  };

  if (/sign in again|unauthorized|not authenticated|session|login/i.test(m)) {
    return {
      title: "Your session has expired",
      tone: "warning",
      icon: ShieldAlert,
      tips: ["Sign in again to continue.", "Then try the action once more."],
    };
  }

  if (/busy right now|try again in a few seconds|too many requests|try again in a minute|quota|rate limit/i.test(m)) {
    return {
      title: "The AI service is busy",
      tone: "warning",
      icon: AlertTriangle,
      tips: [
        "Wait a minute or two and try again.",
        "Free AI access has a daily limit, so it can be unavailable at busy times.",
        "Using a shorter input makes success more likely.",
      ],
    };
  }

  if (/scanned|no selectable text/i.test(m)) {
    return {
      title: "Scanned PDF isn't supported yet",
      tone: "warning",
      icon: Info,
      tips: [
        "Use a PDF with real text instead of scanned images.",
        "Or simply copy and paste the text into the box below.",
      ],
    };
  }

  if (/server took too long|timed out|timeout|took too long|504|slow to respond/i.test(m)) {
    return {
      title: "The server is taking too long",
      tone: "warning",
      icon: Hourglass,
      tips: [
        "The AI is busy right now — wait a moment and try again.",
        "If it keeps happening, try one chapter or section at a time.",
      ],
    };
  }

  if (/too large|too big|10 mb|50 mb|reduce the pdf|smaller/i.test(m)) {
    return {
      title: "Your input is too large",
      tone: "warning",
      icon: AlertTriangle,
      tips: [
        "Reduce the PDF or text (for example, under 50 MB and 50 pages).",
        "Try one chapter or section at a time.",
      ],
    };
  }

  if (/could not reach|network|connection|offline/i.test(m)) {
    return {
      title: "Unable to reach the server",
      tone: "warning",
      icon: WifiOff,
      tips: ["Check your internet connection.", "Then hit Retry."],
    };
  }

  if (/server setup error|api key|gemini_model|google_generative_ai_api_key/i.test(m)) {
    return {
      title: "Temporary server issue",
      tone: "danger",
      icon: ShieldAlert,
      tips: ["Please try again later.", "If it continues, contact support."],
    };
  }

  if (/only .* supported|invalid|try again\./i.test(m)) {
    return {
      title: "Let's fix that input",
      tone: "warning",
      icon: AlertTriangle,
      tips: ["Check what you entered fits the requirements.", "Then try again."],
    };
  }

  return danger;
}

export function ErrorAlert({ message, onRetry }: ErrorAlertProps) {
  const kind = classify(message);
  const Icon = kind.icon;

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-start sm:gap-4",
        kind.tone === "danger"
          ? "border-destructive/25 bg-destructive/5"
          : "border-amber-500/30 bg-amber-500/5"
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          kind.tone === "danger"
            ? "bg-destructive/10 text-destructive"
            : "bg-amber-500/15 text-amber-600"
        )}
      >
        <Icon className="h-5 w-5" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="text-sm font-semibold text-foreground">{kind.title}</p>

        <ul className="flex flex-col gap-1">
          {kind.tips.map((tip) => (
            <li
              key={tip}
              className="flex items-start gap-2 text-xs leading-snug text-muted-foreground"
            >
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
              {tip}
            </li>
          ))}
        </ul>

        <p className="text-[11px] text-muted-foreground/70">
          {message}
        </p>

        {onRetry && (
          <div className="mt-1">
            <Button size="sm" variant="outline" onClick={onRetry}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Try again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}