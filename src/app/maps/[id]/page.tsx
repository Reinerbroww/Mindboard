import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getMapWithNodesAndEdges } from "@/lib/supabase/queries";
import { Whiteboard } from "@/components/whiteboard/whiteboard";

export const metadata: Metadata = {
  title: "Learning Map",
};

export default async function MapPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const {
    data: { user },
  } = await getSession();
  if (!user) notFound();

  const data = await getMapWithNodesAndEdges(id);
  if (!data || data.map.user_id !== user.id) notFound();

  const nodes = (data.nodes ?? []).map((node) => ({
    id: node.id,
    label: node.label,
    description: node.description,
    level: node.level,
    parentId: node.parent_id,
  }));

  const edges = (data.edges ?? []).map((edge) => ({
    id: edge.id,
    source: edge.source_node_id,
    target: edge.target_node_id,
    relationship: edge.relationship,
  }));

  return (
    <div className="flex h-full w-full flex-col">
      <header className="flex items-center justify-between border-b border-border bg-card px-5 py-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
        <span className="truncate px-4 text-sm font-medium text-foreground">
          {data.map.title}
        </span>
        <span className="w-20" />
      </header>
      <div className="min-h-0 flex-1 bg-background">
        <Whiteboard
          mapId={data.map.id}
          mapTitle={data.map.title}
          initialNodes={nodes}
          initialEdges={edges}
        />
      </div>
    </div>
  );
}