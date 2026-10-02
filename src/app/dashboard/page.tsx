import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getMapGraphSummaries, getUserMaps } from "@/lib/supabase/queries";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { MapCard } from "@/components/dashboard/map-card";
import {
  DashboardCreateLink,
  DashboardGreeting,
  DashboardLanguageSelector,
  DashboardSectionHeading,
  EmptyMapsState,
} from "@/components/dashboard/dashboard-copy";
import { Brand } from "@/components/brand";

export const metadata: Metadata = {
  title: "Dashboard",
};

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
      <header className="flex items-center justify-between gap-3 px-6 py-5 sm:px-10">
        <Brand />
        <div className="flex items-center gap-2">
          <DashboardLanguageSelector />
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10 sm:py-14">
        <DashboardGreeting firstName={firstName} />

        <div className="mt-8">
          <DashboardCreateLink />
        </div>

        <section className="mt-14">
          <DashboardSectionHeading
            mapCount={maps.length}
            conceptCount={totalConcepts}
          />

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