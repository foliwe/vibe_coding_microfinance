import { Skeleton } from "./ui/skeleton";

export function AdminPageLoading() {
  return (
    <div className="space-y-6 px-4 py-6 md:px-6">
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            className="rounded-xl border border-border/70 bg-card/95 p-5 shadow-sm"
            key={index}
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-4 h-8 w-28" />
            <Skeleton className="mt-4 h-4 w-full" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            className="rounded-xl border border-border/70 bg-card/95 p-5 shadow-sm"
            key={index}
          >
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-2 h-4 w-full max-w-md" />
            <Skeleton className="mt-6 h-56 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
