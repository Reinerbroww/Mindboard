import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

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
  return (
    <Link
      href={`/maps/${id}`}
      className="group flex items-center justify-between rounded-lg border border-border bg-card px-5 py-4 transition-colors hover:bg-muted"
    >
      <div>
        <h3 className="font-medium text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Last edited: {formatDate(updatedAt)}
        </p>
      </div>
      <span className="flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
        Open
        <ArrowUpRight className="h-4 w-4" />
      </span>
    </Link>
  );
}