import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getUserMaps } from "@/lib/supabase/queries";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { MapCard } from "@/components/dashboard/map-card";
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

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <Brand />
        <LogoutButton />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">
          Good morning, {firstName}.
        </h1>
        <p className="mt-1 text-muted-foreground">
          What do you want to understand?
        </p>

        <div className="mt-8">
          <Button size="lg" asChild>
            <Link href="/maps/new">
              <Plus className="h-4 w-4" />
              Create New Map
            </Link>
          </Button>
        </div>

        <section className="mt-12">
          <h2 className="text-lg font-semibold tracking-tight">
            My Learning Maps
          </h2>

          {maps.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-border bg-card px-5 py-10 text-center text-sm text-muted-foreground">
              You haven&apos;t created any maps yet. Start by creating a new
              one.
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {maps.map((map) => (
                <MapCard
                  key={map.id}
                  id={map.id}
                  title={map.title}
                  updatedAt={map.updated_at}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}