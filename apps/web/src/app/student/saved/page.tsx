"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";

export default function SavedPage() {
  const router = useRouter();
  const [saved, setSaved] = useState<{ competition: any; status: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    load();
  }, []);

  function load() {
    api
      .savedList()
      .then(setSaved)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  async function update(competitionId: string, status: string) {
    setBusyId(competitionId);
    try {
      await api.saveApplication(competitionId, status);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold">Saved opportunities</h1>
      <p className="mt-1 text-neutral-500">
        Your bookmarks. Move one to “Preparing” when you start getting ready — it appears in your
        application tracker.
      </p>

      {error && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading && (
        <div className="mt-6 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-neutral-100" />
          ))}
        </div>
      )}

      {!loading && saved.length === 0 && (
        <div className="mt-6 rounded-xl border p-8 text-center">
          <p className="font-medium">Nothing saved yet.</p>
          <p className="mt-1 text-sm text-neutral-500">
            Browse competitions and tap Save on the ones worth coming back to.
          </p>
          <Link
            href="/competitions"
            className="mt-4 inline-block rounded-md bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Browse competitions
          </Link>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {saved.map(({ competition: c }) => (
          <div key={c.id} className="rounded-xl border border-neutral-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/competitions/${c.id}`} className="font-semibold hover:text-brand-700">
                  {c.title}
                </Link>
                <p className="text-sm text-neutral-500">{c.organizer ?? "Organizer unknown"}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {c.deadline && (
                    <span className="rounded-full bg-neutral-100 px-2 py-1">
                      Deadline {new Date(c.deadline).toLocaleDateString()}
                    </span>
                  )}
                  <span className="rounded-full bg-neutral-100 px-2 py-1">{c.format}</span>
                  <span className="rounded-full bg-neutral-100 px-2 py-1">{c.cost ?? "cost unknown"}</span>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  disabled={busyId === c.id}
                  onClick={() => update(c.id, "PREPARING")}
                  className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  Start preparing
                </button>
                <button
                  disabled={busyId === c.id}
                  onClick={() => update(c.id, "WITHDRAWN")}
                  className="rounded-md border px-3 py-1.5 text-xs hover:bg-neutral-50 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
