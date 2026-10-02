import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { CreateNewMap } from "@/components/maps/create-new-map";

export const metadata: Metadata = {
  title: "Create New Map",
};

export default async function NewMapPage() {
  const {
    data: { user },
  } = await getSession();

  if (!user) {
    redirect("/login?next=/maps/new");
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center gap-3 px-6 py-5 sm:px-10">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <span className="h-4 w-px bg-border" />
        <h1 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Create New Map
        </h1>
      </header>
      <CreateNewMap />
    </div>
  );
}