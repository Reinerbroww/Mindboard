import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-24 rounded-full" />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="mt-2 h-4 w-52" />

        <Skeleton className="mt-8 h-11 w-44 rounded-xl" />

        <div className="mt-12 flex flex-col gap-3">
          <Skeleton className="h-7 w-44" />
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5"
            >
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}