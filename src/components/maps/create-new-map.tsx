"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Upload } from "lucide-react";
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
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileData, setFileData] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("input");
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      setFileData(base64);
      setFileName(file.name);
      setText("");
    };
    reader.readAsDataURL(file);
  }

  async function handleGenerate() {
    setError(null);

    const payload =
      fileName && fileData
        ? { type: "pdf", file_name: fileName, fileData }
        : { type: "text", content: text };

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

      const data = await res.json();

      if (!res.ok) {
        clearInterval(interval);
        setPhase("input");
        setError(data.error ?? "Something went wrong. Try again.");
        return;
      }

      clearInterval(interval);
      router.push(`/maps/${data.mapId}`);
    } catch {
      clearInterval(interval);
      setPhase("input");
      setError("Could not reach the server. Please try again.");
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
            <Button
              variant={fileName ? "secondary" : "outline"}
              size="lg"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              {fileName ? (
                <>
                  <FileText className="h-4 w-4" />
                  {fileName}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload PDF
                </>
              )}
            </Button>
            {fileName && (
              <button
                type="button"
                className="mt-2 text-xs text-muted-foreground hover:underline"
                onClick={() => {
                  setFileName(null);
                  setFileData(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                Remove file
              </button>
            )}
            {fileName && (
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
                if (fileName) {
                  setFileName(null);
                  setFileData(null);
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
            disabled={!text.trim() && !fileName}
          >
            Generate Mind Map
          </Button>
        </div>
      </main>
    </div>
  );
}