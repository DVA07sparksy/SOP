"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";

// Coordinator dashboard (product doc §25): sector-specific opportunities,
// deadlines, school participation.
export default function CoordinatorPage() {
  const router = useRouter();
  const [feed, setFeed] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    api
      .coordinatorFeed()
      .then(setFeed)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return <p className="text-neutral-500">Loading coordinator feed…</p>;

  if (error) {
    return (
      <div className="max-w-2xl">
        <p role="alert" className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          Coordinator access required. {error}
        </p>
        <p className="mt-3 text-sm text-neutral-500">
          Coordinators register with the Coordinator role, then get associated with an institution
          by that institution&apos;s admin.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold">Coordinator dashboard</h1>
      <p className="mt-1 text-neutral-500">
        Opportunities in your selected sectors
        {feed.institutions?.length ? ` for ${feed.institutions.map((i: any) => i.name).join(", ")}` : ""}.
      </p>

      {feed.sectors?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {feed.sectors.map((s: string) => (
            <span key={s} className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
              {s}
            </span>
          ))}
        </div>
      )}

      <h2 className="mt-8 text-lg font-semibold">Sector opportunities</h2>
      {!feed.competitions?.length ? (
        <p className="mt-2 text-sm text-neutral-500">
          No published opportunities currently match your sectors. Check back soon.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {feed.competitions.map((c: any) => (
            <Link
              key={c.id}
              href={`/competitions/${c.id}`}
              className="block rounded-xl border border-neutral-200 bg-white p-4 hover:border-brand-300"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{c.title}</p>
                  <p className="text-sm text-neutral-500">{c.organizer ?? "Organizer unknown"}</p>
                </div>
                <div className="text-right text-xs text-neutral-500">
                  {c.deadline && <p>Deadline {new Date(c.deadline).toLocaleDateString()}</p>}
                  <p>{c.format} · {c.cost ?? "cost unknown"}</p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(c.category ?? []).map((cat: string) => (
                  <span key={cat} className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs">{cat}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
