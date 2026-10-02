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
<div className="flex h-screen w-screen flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-4 sm:px-5">
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center gap-1 rounded-md px-1 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <h1 className="min-w-0 truncate text-center text-sm font-medium text-foreground">
            {data.map.title}
          </h1>
          <span className="w-9 shrink-0 sm:w-20" />
        </header>
      <div className="relative h-[calc(100vh-3.5rem)] w-full flex-1 bg-background">
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