"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ErrorAlert } from "@/components/ui/error-alert";
import { Textarea } from "@/components/ui/textarea";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { useLanguage, setMapLanguage, type AppLanguage as Language } from "@/lib/language";

type Phase = "input" | "processing";

const STAGES: Record<Language, string[]> = {
  en: [
    "Reading your material...",
    "Finding key concepts...",
    "Understanding relationships...",
    "Building your knowledge map...",
    "Drawing your mind map...",
  ],
  id: [
    "Membaca materi kamu...",
    "Mencari konsep utama...",
    "Memahami hubungan konsep...",
    "Membangun peta pengetahuan...",
    "Menggambar mind map...",
  ],
};

const COPY: Record<Language, Record<string, string>> = {
  en: {
    title: "Add your study material",
    subtitle: "Mindboard will turn it into an interactive mind map.",
    language: "Language",
    generate: "Generate Mind Map",
  },
  id: {
    title: "Tambahkan materi belajar",
    subtitle: "Mindboard akan mengubahnya menjadi mind map interaktif.",
    language: "Bahasa",
    generate: "Buat Mind Map",
  },
};

export function CreateNewMap() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generatingRef = useRef(false);
  const { language, setLanguage } = useLanguage();
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>("input");
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const stages = STAGES[language];
  const copy = COPY[language];

  function newRequestId(): string {
    if (typeof globalThis.crypto?.randomUUID === "function") {
      return globalThis.crypto.randomUUID();
    }
    return `gen-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function handleFile(selected: File | null) {
    if (!selected) return;
    if (selected.size > 50 * 1024 * 1024) {
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setError("PDF is too large. The maximum file size is 50 MB.");
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
        setError("Only PDF files are supported.");
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
          setError("Please sign in again and retry.");
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
          setError("Could not upload the PDF. Try again.");
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
        setError("Paste your study material or upload a PDF.");
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
              ? "The server took too long. Try a smaller PDF or shorter text, then retry."
              : "Something went wrong. Try again.")
        );
        return;
      }

      if (!data?.mapId) {
        clearInterval(interval);
        setPhase("input");
        setError("Something went wrong. Try again.");
        return;
      }

      setMapLanguage(data.mapId, language);
      clearInterval(interval);
      router.push(`/maps/${data.mapId}`);
    } catch {
      if (interval) clearInterval(interval);
      setPhase("input");
      setError(
        "Could not reach the server. Check your connection and try again."
      );
    } finally {
      generatingRef.current = false;
    }
  }

  if (phase === "processing") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-24">
        <div className="flex flex-col items-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            {language === "id" ? "Membuat mind map kamu" : "Creating your map"}
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
              {copy.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{copy.subtitle}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <LanguageToggle language={language} onLanguageChange={setLanguage} />
            <span className="text-[11px] text-muted-foreground/80">
              {copy.language}
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
              aria-label="Upload a PDF"
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
                    Drag &amp; drop your PDF here
                  </div>
                  <div className="text-xs text-muted-foreground">
                    or click to browse files (max 50 MB)
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
                Remove file
              </button>
            )}
            {file && (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                OR paste text below
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              OR
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div>
            <Textarea
              placeholder="Paste your study material here..."
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
            {copy.generate}
          </Button>
        </div>
      </main>
    </div>
  );
}