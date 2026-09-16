export function CompetitionCardSkeleton() {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
      <div className="h-6 w-3/4 bg-neutral-100 rounded animate-pulse" />
      <div className="h-4 w-1/2 bg-neutral-100 rounded animate-pulse" />
      <div className="space-y-2">
        <div className="h-4 w-full bg-neutral-100 rounded animate-pulse" />
        <div className="h-4 w-2/3 bg-neutral-100 rounded animate-pulse" />
      </div>
      <div className="flex gap-2">
        <div className="h-8 w-20 bg-neutral-100 rounded animate-pulse" />
        <div className="h-8 w-20 bg-neutral-100 rounded animate-pulse" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <div className="h-10 bg-neutral-100 rounded animate-pulse" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 bg-neutral-100 rounded animate-pulse" />
      ))}
    </div>
  );
}

export function TextSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-neutral-100 rounded animate-pulse" />
      ))}
    </div>
  );
}