import { Skeleton } from "@/components/ui/skeleton";

export default function MapsLoading() {
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-5">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-4 w-20" />
      </header>

      <div className="relative flex h-full flex-1 bg-background">
        <div className="absolute inset-0 p-6 md:p-10">
          <div className="flex items-start justify-center gap-8 pt-14 md:gap-12">
            <Skeleton className="h-16 w-40 rounded-xl md:w-48" />
            <Skeleton className="mt-20 hidden h-16 w-40 rounded-xl sm:block md:w-48" />
            <Skeleton className="h-16 w-40 rounded-xl md:w-48" />
          </div>
        </div>
      </div>
    </div>
  );
}