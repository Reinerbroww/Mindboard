import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getMapGraphSummaries, getUserMaps } from "@/lib/supabase/queries";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { MapCard } from "@/components/dashboard/map-card";
import { Brand } from "@/components/brand";

export const metadata: Metadata = {
  title: "Dashboard",
};

function greetingFor(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function EmptyMapsState() {
  return (
    <div className="mt-5 flex flex-col items-center rounded-2xl border border-dashed border-border bg-card/60 px-6 py-12 text-center">
      {/* A quiet sketch of what a map becomes — no illustration, just structure. */}
      <svg
        viewBox="0 0 160 76"
        aria-hidden="true"
        className="mb-5 h-19 w-40 text-primary"
      >
        <g stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.2" fill="none">
          <path d="M80 26 L44 58" />
          <path d="M80 26 L116 58" />
          <path d="M80 26 L80 58" strokeDasharray="3 4" />
        </g>
        <rect x="62" y="12" width="36" height="14" rx="7" fill="currentColor" />
        <g fill="var(--accent)" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.2">
          <rect x="30" y="56" width="28" height="13" rx="6.5" />
          <rect x="66" y="56" width="28" height="13" rx="6.5" />
          <rect x="102" y="56" width="28" height="13" rx="6.5" />
        </g>
      </svg>

      <p className="text-sm font-medium text-foreground">
        Your knowledge space is empty.
      </p>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
        Add your study material and Mindboard will turn it into a map of ideas
        you can explore.
      </p>

      <Button className="mt-5" asChild>
        <Link href="/maps/new">
          <Plus className="h-4 w-4" />
          Create your first map
        </Link>
      </Button>
    </div>
  );
}

export default async function DashboardPage() {
  const {
    data: { user },
  } = await getSession();

  if (!user) {
    redirect("/login");
  }

  const firstName = user.user_metadata?.full_name?.split(" ")[0] ?? "there";
  const maps = await getUserMaps(user.id);
  const nodeCounts = await getMapGraphSummaries(user.id);
  const totalConcepts = maps.reduce(
    (total, map) => total + (nodeCounts.get(map.id) ?? 0),
    0
  );

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <Brand />
        <LogoutButton />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10 sm:py-14">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          {greetingFor(new Date())}, {firstName}.
        </h1>
        <p className="mt-2 text-muted-foreground">
          What do you want to understand today?
        </p>

        <div className="mt-8">
          <Button size="lg" asChild>
            <Link href="/maps/new">
              <Plus className="h-4 w-4" />
              Create New Map
            </Link>
          </Button>
        </div>

        <section className="mt-14">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              My Learning Maps
            </h2>
            {maps.length > 0 && (
              <span className="text-xs text-muted-foreground/80">
                {maps.length} map{maps.length === 1 ? "" : "s"} ·{" "}
                {totalConcepts} concept{totalConcepts === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {maps.length === 0 ? (
            <EmptyMapsState />
          ) : (
            <div className="mt-4 flex flex-col gap-2.5">
              {maps.map((map) => (
                <MapCard
                  key={map.id}
                  id={map.id}
                  title={map.title}
                  updatedAt={map.updated_at}
                  nodeCount={nodeCounts.get(map.id) ?? 0}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}