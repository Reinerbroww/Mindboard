"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Phase = "input" | "processing";

const STAGES = [
  "Reading your material...",
  "Finding key concepts...",
  "Understanding relationships...",
  "Building your knowledge map...",
  "Drawing your mind map...",
];

export function CreateNewMap() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>("input");
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function handleFile(selected: File | null) {
    if (!selected) return;
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
    setError(null);

    let payload:
      | { type: "pdf"; file_name: string; storagePath: string }
      | { type: "text"; content: string };

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
      };
    } else {
      payload = { type: "text", content: text };
    }

    if (payload.type === "text" && !text.trim()) {
      setError("Paste your study material or upload a PDF.");
      return;
    }

    setPhase("processing");
    setStageIndex(0);

    const interval = setInterval(() => {
      setStageIndex((i) => (i + 1) % STAGES.length);
    }, 2500);

    try {
      const res = await fetch("/api/generate-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data: { mapId?: string; error?: string } | null = null;
      try {
        data = await res.json();
      } catch {
        // Non-JSON response (e.g. platform timeout page) — fall through below.
      }

      if (!res.ok) {
        clearInterval(interval);
        setPhase("input");
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

      clearInterval(interval);
      router.push(`/maps/${data.mapId}`);
    } catch {
      clearInterval(interval);
      setPhase("input");
      setError(
        "Could not reach the server. Check your connection and try again."
      );
    }
  }

  if (phase === "processing") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-24">
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Creating your map
          </h1>
          <div className="mt-8 flex h-12 w-12 animate-spin items-center justify-center">
            <div className="h-10 w-10 rounded-full border-4 border-secondary border-t-primary" />
          </div>
          <ul className="mt-8 flex flex-col gap-2">
            {STAGES.map((stage, i) => (
              <li
                key={stage}
                className={`text-center text-sm transition-opacity ${
                  i === stageIndex
                    ? "text-foreground opacity-100"
                    : "text-muted-foreground opacity-50"
                }`}
              >
                {stage}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">
          Add your study material
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Mindboard will turn it into an interactive mind map.
        </p>

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
              className={`flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-muted-foreground/40"
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
                    or click to browse files (max 10 MB)
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
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button
            size="lg"
            onClick={handleGenerate}
            disabled={!text.trim() && !file}
          >
            Generate Mind Map
          </Button>
        </div>
      </main>
    </div>
  );
}