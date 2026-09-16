import Link from "next/link";

export function CompetitionCard({ competition, matchScore }: { competition: any; matchScore?: number }) {
  const deadline = competition.deadline ? new Date(competition.deadline) : null;
  const daysLeft = deadline ? Math.ceil((deadline.getTime() - Date.now()) / 86_400_000) : null;
  const expired = daysLeft !== null && daysLeft <= 0;

  return (
    <Link
      href={`/competitions/${competition.id}`}
      className="block rounded-xl border border-neutral-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:bg-neutral-900 dark:border-neutral-700"
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">{competition.title}</h3>
        {typeof matchScore === "number" && (
          <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">
            {matchScore}% match
          </span>
        )}
      </div>
      <p className="mb-3 text-sm text-neutral-500 dark:text-neutral-400">
        {competition.organizer ?? "Organizer not yet verified"}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {(competition.category ?? []).slice(0, 3).map((c: string) => (
          <span key={c} className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            {c}
          </span>
        ))}
        {competition.cost === "free" && (
          <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-700">free</span>
        )}
        {competition.trustStatus === "VERIFIED" && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">✓ verified</span>
        )}
      </div>
      {daysLeft !== null && (
        <p className={`mt-3 text-xs font-medium ${expired ? "text-neutral-500" : daysLeft <= 7 ? "text-red-700" : "text-neutral-500"}`}>
          {expired
            ? "⏹ Deadline passed"
            : `⏳ ${daysLeft} day${daysLeft === 1 ? "" : "s"} left to apply — deadline ${deadline!.toLocaleDateString()}`}
        </p>
      )}
    </Link>
  );
}
