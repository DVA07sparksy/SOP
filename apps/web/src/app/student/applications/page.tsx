"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";

// Application tracker (product doc §21): Saved → Preparing → Applied →
// Selected → Finalist → Winner / Not selected. User-reported statuses.
const JOURNEY = [
  "DISCOVERED",
  "SAVED",
  "PREPARING",
  "APPLIED",
  "SELECTED",
  "FINALIST",
  "WINNER",
  "NOT_SELECTED",
  "WITHDRAWN",
] as const;

const STATUS_COLORS: Record<string, string> = {
  DISCOVERED: "bg-neutral-100 text-neutral-700",
  SAVED: "bg-blue-100 text-blue-700",
  PREPARING: "bg-yellow-100 text-yellow-700",
  APPLIED: "bg-green-100 text-green-700",
  SELECTED: "bg-teal-100 text-teal-700",
  FINALIST: "bg-indigo-100 text-indigo-700",
  WINNER: "bg-amber-100 text-amber-700",
  NOT_SELECTED: "bg-red-100 text-red-700",
  WITHDRAWN: "bg-gray-100 text-gray-700",
};

export default function ApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<string>("APPLIED");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      setApplications(await api.applications());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // The API upserts by (student, competition); send the competitionId.
  async function updateApplicationStatus(competitionId: string, status: string) {
    setBusy(true);
    setError(null);
    try {
      await api.saveApplication(competitionId, status);
      setEditingId(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const filtered = filter === "all" ? applications : applications.filter((a) => a.status === filter);
  const counts = JOURNEY.reduce<Record<string, number>>((acc, s) => {
    acc[s] = applications.filter((a) => a.status === s).length;
    return acc;
  }, {});

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Application tracker</h1>
        <p className="text-neutral-500">
          Your participation journey — from saved to preparing, applied, finalist and beyond.
        </p>
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {JOURNEY.map((status) => (
          <button
            key={status}
            onClick={() => setFilter(filter === status ? "all" : status)}
            aria-pressed={filter === status}
            className={`rounded-lg border p-3 text-center transition-colors ${
              filter === status ? "border-brand-600 bg-brand-50" : "border-neutral-200 hover:bg-neutral-50"
            }`}
          >
            <div className="text-lg font-bold">{counts[status] || 0}</div>
            <div className="text-xs text-neutral-600">
              {status === "NOT_SELECTED" ? "Not selected" : status.charAt(0) + status.slice(1).toLowerCase()}
            </div>
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-lg bg-neutral-100" />)}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="rounded-xl border p-8 text-center">
          <p className="font-medium">Nothing here yet.</p>
          <p className="mt-1 text-sm text-neutral-500">
            {filter === "all"
              ? "Save a competition or start preparing to begin tracking it."
              : `Nothing with status "${filter}".`}
          </p>
          <Link href="/competitions" className="mt-4 inline-block rounded-md bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            Browse competitions
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((app) => (
          <div key={app.id} className="rounded-xl border border-neutral-200 bg-white p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1">
                <Link href={`/competitions/${app.competitionId}`} className="text-lg font-semibold hover:text-brand-700">
                  {app.competition?.title ?? "Competition"}
                </Link>
                <p className="text-sm text-neutral-500">{app.competition?.organizer}</p>

                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className={`rounded-full px-2 py-1 font-medium ${STATUS_COLORS[app.status] ?? "bg-neutral-100"}`}>
                    {app.status}
                  </span>
                  {app.followed && (
                    <span className="rounded-full bg-purple-100 px-2 py-1">Following</span>
                  )}
                  {app.competition?.deadline && (
                    <span className="rounded-full bg-neutral-100 px-2 py-1">
                      Deadline {new Date(app.competition.deadline).toLocaleDateString()}
                    </span>
                  )}
                  {app.competition?.format && (
                    <span className="rounded-full bg-neutral-100 px-2 py-1">{app.competition.format}</span>
                  )}
                </div>

                {app.competition?.applicationUrl && (
                  <a
                    href={app.competition.applicationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block text-sm text-brand-600 hover:underline"
                  >
                    Official application link ↗
                  </a>
                )}
              </div>

              <div className="flex sm:flex-col gap-2">
                {editingId === app.id ? (
                  <div className="flex gap-2">
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      aria-label="New status"
                      className="rounded-md border px-2 py-1 text-sm"
                    >
                      {JOURNEY.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => updateApplicationStatus(app.competitionId, newStatus)}
                      disabled={busy}
                      className="rounded-md bg-brand-600 px-3 py-1 text-sm text-white disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="rounded-md border px-3 py-1 text-sm">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditingId(app.id);
                      setNewStatus(app.status);
                    }}
                    className="rounded-md border px-3 py-1 text-sm hover:bg-neutral-50"
                  >
                    Update status
                  </button>
                )}
              </div>
            </div>

            {app.submittedAt && (
              <div className="mt-3 border-t pt-3 text-xs text-neutral-500">
                Marked applied on {new Date(app.submittedAt).toLocaleDateString()}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
