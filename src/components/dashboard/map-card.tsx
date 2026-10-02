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
  nodeCount?: number;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(date));
}

/**
 * A small, deterministic sketch of the map's own shape. Derived from the node
 * count so each map previews its real size without pulling graph data or
 * thumbnails into the dashboard.
 */
function GraphPreview({ nodeCount = 0 }: { nodeCount?: number }) {
  const children = Math.min(Math.max(nodeCount - 1, 0), 5);
  const width = 88;
  const height = 52;

  const span = width - 20;
  const points = Array.from({ length: children }, (_, i) => {
    const ratio = children === 1 ? 0.5 : i / (children - 1);
    return { x: 10 + span * ratio, y: height - 8 };
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      className="h-13 w-22 shrink-0 overflow-visible"
    >
      {points.map((point) => (
        <line
          key={`edge-${point.x}`}
          x1={width / 2}
          y1={16}
          x2={point.x}
          y2={point.y - 4}
          stroke="#2F6F5E"
          strokeOpacity={0.28}
          strokeWidth={1}
        />
      ))}
      {points.map((point) => (
        <circle
          key={`node-${point.x}`}
          cx={point.x}
          cy={point.y}
          r={3}
          fill="#DCEFE8"
          stroke="#2F6F5E"
          strokeOpacity={0.45}
          strokeWidth={1}
        />
      ))}
      <rect
        x={width / 2 - 13}
        y={6}
        width={26}
        height={11}
        rx={5.5}
        fill="#2F6F5E"
        fillOpacity={0.9}
      />
    </svg>
  );
}

export function MapCard({ id, title, updatedAt, nodeCount = 0 }: MapCardProps) {
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
    <div className="group relative flex flex-col rounded-xl border border-border bg-card px-4 py-4 transition-[border-color,box-shadow,transform] duration-200 ease-out hover:border-primary/30 hover:shadow-[0_6px_24px_rgb(38_51_46/0.07)] hover:translate-y-[-1px] motion-reduce:hover:translate-y-0 motion-reduce:transition-none">
      <div className="flex items-center justify-between gap-4">
        <Link
          href={`/maps/${id}`}
          className="flex min-w-0 flex-1 items-center gap-4 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <GraphPreview nodeCount={nodeCount} />

          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">
              {title}
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {nodeCount > 0
                ? `${nodeCount} concept${nodeCount === 1 ? "" : "s"} · ${formatDate(updatedAt)}`
                : `Empty map · ${formatDate(updatedAt)}`}
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {confirming ? (
            <div className="mb-rise flex items-center gap-1.5">
              <span className="mr-1 text-xs font-medium text-destructive">
                Delete map?
              </span>
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
                className="h-8 w-8 p-0 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                title="Delete map"
                aria-label={`Delete ${title}`}
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
                aria-label={`Open ${title}`}
                className="flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              >
                Open
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}