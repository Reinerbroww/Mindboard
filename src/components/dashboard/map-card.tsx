"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MapCardProps {
  id: string;
  title: string;
  updatedAt: string;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(date));
}

export function MapCard({ id, title, updatedAt }: MapCardProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/maps/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to delete map.");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete map.");
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <div className="group relative flex flex-col rounded-lg border border-border bg-card px-5 py-4 transition-colors hover:border-muted-foreground/30">
      <div className="flex items-center justify-between">
        <Link href={`/maps/${id}`} className="flex-1 pr-4">
          <h3 className="font-medium text-foreground transition-colors group-hover:text-primary">
            {title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Last edited: {formatDate(updatedAt)}
          </p>
        </Link>

        <div className="flex items-center gap-2">
          {confirming ? (
            <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
              <span className="text-xs text-muted-foreground font-medium mr-1">Delete map?</span>
              <Button
                variant="destructive"
                size="sm"
                className="h-8 px-2.5 text-xs"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Yes, Delete"
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setConfirming(false);
                }}
                disabled={deleting}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                title="Delete map"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setConfirming(true);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Link
                href={`/maps/${id}`}
                className="flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100"
              >
                Open
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-2 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}