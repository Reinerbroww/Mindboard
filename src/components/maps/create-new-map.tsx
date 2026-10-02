"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ErrorAlert } from "@/components/ui/error-alert";
import { Textarea } from "@/components/ui/textarea";
import { LanguageSelector } from "@/components/ui/language-selector";
import { setMapLanguage, useUiLanguage } from "@/lib/language";
import { useI18n, type MessageKey } from "@/lib/i18n";

type Phase = "input" | "processing";

const STAGE_KEYS: MessageKey[] = [
  "stage.understanding",
  "stage.structuring",
  "stage.connecting",
  "stage.completing",
];

const MAX_FILE_BYTES = 50 * 1024 * 1024;

export function CreateNewMap() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generatingRef = useRef(false);
  // The interface language is also the default generation language, so a new
  // map inherits whatever the user last chose in the Dashboard selector.
  const { language } = useUiLanguage();
  const { t } = useI18n();
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>("input");
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const stages = STAGE_KEYS.map((key) => t(key));

  function newRequestId(): string {
    if (typeof globalThis.crypto?.randomUUID === "function") {
      return globalThis.crypto.randomUUID();
    }
    return `gen-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function handleFile(selected: File | null) {
    if (!selected) return;
    if (selected.size > MAX_FILE_BYTES) {
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setError(t("create.errorTooLarge"));
      return;
    }
    setFile(selected);
    setText("");
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0] ?? null;
    if (dropped) {
      if (!dropped.name.toLowerCase().endsWith(".pdf")) {
        setError(t("create.errorFormat"));
        return;
      }
      handleFile(dropped);
    }
  }

  async function handleGenerate() {
    // One id per user action, reused across the whole request lifecycle so
    // client and server logs can be correlated. The guard also blocks
    // overlapping clicks (e.g. double-click during a PDF upload) from firing
    // duplicate POST /api/generate-map requests.
    if (generatingRef.current) return;
    generatingRef.current = true;
    setError(null);

    const requestId = newRequestId();
    console.info(`[CLIENT MAP GENERATION START] requestId=${requestId}`);

    let interval: ReturnType<typeof setInterval> | null = null;

    try {
      let payload:
        | {
            type: "pdf";
            file_name: string;
            storagePath: string;
            requestId: string;
            language: "en" | "id";
          }
        | { type: "text"; content: string; requestId: string; language: "en" | "id" };

      if (file) {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setError(t("create.errorSignIn"));
          return;
        }

        const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, "_");
        const storagePath = `${user.id}/${crypto.randomUUID()}-${safeName}`;

        try {
          const { error: uploadError } = await supabase.storage
            .from("materials")
            .upload(storagePath, file, {
              contentType: "application/pdf",
              upsert: false,
            });
          if (uploadError) {
            setError(uploadError.message);
            return;
          }
        } catch {
          setError(t("create.errorUpload"));
          return;
        }

        payload = {
          type: "pdf",
          file_name: file.name,
          storagePath,
          requestId,
          language,
        };
      } else {
        payload = { type: "text", content: text, requestId, language };
      }

      if (payload.type === "text" && !text.trim()) {
        setError(t("create.errorEmpty"));
        return;
      }

      setPhase("processing");
      setStageIndex(0);

      // Advances through the stages once and then holds on the last one, so the
      // display never implies work that has not happened yet.
      interval = setInterval(() => {
        setStageIndex((i) => Math.min(i + 1, stages.length - 1));
      }, 2500);

      const requestStartedAt = performance.now();
      const res = await fetch("/api/generate-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      console.info(
        `[CLIENT MAP GENERATION RESPONSE] requestId=${requestId} status=${res.status} elapsedMs=${Math.round(
          performance.now() - requestStartedAt
        )}`,
      );

      let data: { mapId?: string; error?: string } | null = null;
      try {
        data = await res.json();
      } catch {
        // Non-JSON response (e.g. platform timeout page) — fall through below.
      }

      if (!res.ok) {
        clearInterval(interval);
        setPhase("input");
        if (res.status === 401) {
          router.push("/login?next=/maps/new");
          return;
        }
        setError(
          data?.error ??
            (res.status === 504 || res.status === 500
              ? t("create.errorSlow")
              : t("create.errorGeneric"))
        );
        return;
      }

      if (!data?.mapId) {
        clearInterval(interval);
        setPhase("input");
        setError(t("create.errorGeneric"));
        return;
      }

      setMapLanguage(data.mapId, language);
      clearInterval(interval);
      router.push(`/maps/${data.mapId}`);
    } catch {
      if (interval) clearInterval(interval);
      setPhase("input");
      setError(t("create.errorNetwork"));
    } finally {
      generatingRef.current = false;
    }
  }

  if (phase === "processing") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-24">
        <div className="flex flex-col items-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            {t("create.generating")}
          </h2>

          {/* The structure materialising, mirroring the real generation flow. */}
          <svg
            viewBox="0 0 200 96"
            aria-hidden="true"
            className="mt-8 h-24 w-50 text-primary"
          >
            <g
              stroke="currentColor"
              strokeOpacity="0.25"
              strokeWidth="1.4"
              fill="none"
              className="mb-pulse"
            >
              <path d="M100 34 L52 72" />
              <path d="M100 34 L148 72" />
            </g>
            <rect
              x="72"
              y="18"
              width="56"
              height="18"
              rx="9"
              fill="currentColor"
              fillOpacity="0.9"
            />
            <g
              fill="var(--accent)"
              stroke="currentColor"
              strokeOpacity="0.4"
              strokeWidth="1.4"
            >
              <rect x="34" y="70" width="36" height="16" rx="8" />
              <rect x="130" y="70" width="36" height="16" rx="8" />
            </g>
          </svg>

          <ol className="mt-9 flex w-full max-w-xs flex-col gap-2.5">
            {stages.map((stage, i) => (
              <li
                key={stage}
                className={`flex items-center gap-2.5 text-sm transition-opacity duration-300 motion-reduce:transition-none ${
                  i === stageIndex
                    ? "text-foreground"
                    : i < stageIndex
                      ? "text-muted-foreground/70"
                      : "text-muted-foreground/40"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-300 motion-reduce:transition-none ${
                    i === stageIndex ? "bg-primary" : "bg-border"
                  }`}
                />
                {stage}
              </li>
            ))}
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {t("create.title")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("create.subtitle")}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <LanguageSelector />
            <span className="text-[11px] text-muted-foreground/80">
              {t("create.languageHint")}
            </span>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-6">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            <div
              role="button"
              tabIndex={0}
              aria-label={t("create.file.drop")}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              className={`flex cursor-pointer flex-col items-center gap-3 rounded-xl border border-dashed p-8 text-center transition-[border-color,background-color] duration-200 motion-reduce:transition-none ${
                isDragging
                  ? "border-primary bg-accent/40"
                  : "border-border bg-card hover:border-primary/35 hover:bg-accent/20"
              }`}
            >
              {file ? (
                <>
                  <FileText className="h-8 w-8 text-primary" />
                  <div className="text-sm font-medium">{file.name}</div>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <div className="text-sm font-medium">
                    {t("create.file.drop")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("create.file.choose")}
                  </div>
                  <div className="text-[11px] text-muted-foreground/80">
                    {t("create.file.formats")}
                  </div>
                </>
              )}
            </div>
            {file && (
              <button
                type="button"
                className="mt-2 text-xs text-muted-foreground hover:underline"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                {t("create.file.remove")}
              </button>
            )}
            {file && (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                {t("create.paste")}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("create.paste")}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div>
            <Textarea
              placeholder={t("create.paste.placeholder")}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (file) {
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }
              }}
            />
          </div>

          {error && (
            <ErrorAlert message={error} onRetry={handleGenerate} />
          )}

          <Button
            size="lg"
            className="self-start"
            onClick={handleGenerate}
            disabled={!text.trim() && !file}
          >
            {t("create.generate")}
          </Button>
        </div>
      </main>
    </div>
  );
}