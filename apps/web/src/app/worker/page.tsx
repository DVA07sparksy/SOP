"use client";

import { useEffect, useState } from "react";
import { api, Competition } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";

// Internal worker/reviewer dashboard (product doc §27): separate from the
// student experience, information-dense, every decision audited server-side.
export default function WorkerPage() {
  const [items, setItems] = useState<Competition[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      setError("Log in required.");
      return;
    }
    load();
  }, []);

  function load() {
    api.reviewQueue().then(setItems).catch((e) => setError(e.message));
    api.reports().then(setReports).catch(() => {});
  }

  async function decide(id: string, decision: "PUBLISH" | "REJECT" | "REQUEST_CHANGES" | "ARCHIVE") {
    setBusyId(id);
    try {
      await api.decide(id, decision, note || undefined);
      setNote("");
      load();
    } catch (e: any) {
      // Workers don't have publish rights — surface the server's decision.
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function resolveReport(id: string, action: string) {
    setBusyId(id);
    try {
      await api.resolveReport(id, action);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Reviewer workspace</h1>
        <p className="text-neutral-500">
          Uncertain opportunities and user reports land here. Evidence first, decisions second.
        </p>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      <section aria-labelledby="rq-heading" className="space-y-4">
        <h2 id="rq-heading" className="text-lg font-semibold">Review queue ({items.length})</h2>
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-neutral-200 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm text-neutral-500">{item.organizer ?? "Organizer unknown"}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5">{item.status}</span>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5">Trust {item.trustScore}/100</span>
                  {typeof item.aiConfidence === "number" && (
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5">
                      AI confidence {Math.round(item.aiConfidence * 100)}%
                    </span>
                  )}
                  {item.duplicateOfId && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
                      Possible duplicate
                    </span>
                  )}
                </div>
                {item.eligibilityRawText && (
                  <p className="mt-2 text-xs text-neutral-500">Eligibility: {item.eligibilityRawText}</p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <button
                  onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                  className="text-xs text-brand-600 underline"
                  aria-expanded={expanded === item.id}
                >
                  {expanded === item.id ? "Hide evidence" : "Inspect evidence"}
                </button>
                <div className="flex gap-2">
                  <button disabled={busyId === item.id} onClick={() => decide(item.id, "REQUEST_CHANGES")}
                    className="rounded-md bg-amber-500 px-3 py-1.5 text-xs text-white hover:bg-amber-600">
                    Request evidence
                  </button>
                  <button disabled={busyId === item.id} onClick={() => decide(item.id, "REJECT")}
                    className="rounded-md bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-700">
                    Reject
                  </button>
                  <button disabled={busyId === item.id} onClick={() => decide(item.id, "PUBLISH")}
                    className="rounded-md bg-green-600 px-3 py-1.5 text-xs text-white hover:bg-green-700">
                    Approve
                  </button>
                </div>
              </div>
            </div>

            {expanded === item.id && (
              <div className="mt-4 space-y-3 rounded-lg bg-neutral-50 p-4 text-sm">
                <div>
                  <h4 className="font-semibold">Source evidence</h4>
                  {item.rawPage?.url ? (
                    <a href={item.rawPage.url} target="_blank" rel="noreferrer" className="break-all text-brand-600 underline">
                      {item.rawPage.url}
                    </a>
                  ) : (
                    <p className="text-neutral-500">No fetched source page recorded.</p>
                  )}
                </div>
                {item.rawPage?.rawText && (
                  <div>
                    <h4 className="font-semibold">Extracted source text (excerpt)</h4>
                    <pre className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap rounded bg-white p-2 text-xs text-neutral-600">
                      {item.rawPage.rawText.slice(0, 2000)}
                    </pre>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <h4 className="font-semibold">What we know</h4>
                    <ul className="mt-1 list-disc pl-5 text-xs text-neutral-600">
                      <li>Trust score {item.trustScore}/100, status {item.trustStatus}</li>
                      <li>Deadline: {item.deadline ? new Date(item.deadline).toLocaleString() : "unknown"}</li>
                      <li>Cost: {item.cost ?? "unknown"}</li>
                      <li>Levels: {(item.educationLevels ?? []).join(", ") || "unknown"}</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold">What we don&apos;t know</h4>
                    <ul className="mt-1 list-disc pl-5 text-xs text-neutral-600">
                      {!item.organizer && <li>Organizer identity</li>}
                      {!item.deadline && <li>Deadline</li>}
                      {!item.cost && <li>Fees</li>}
                      {!item.applicationUrl && <li>Application link</li>}
                      {!item.officialUrl && <li>Official source</li>}
                    </ul>
                  </div>
                </div>
                {item.source && (
                  <p className="text-xs text-neutral-500">
                    Source reputation: {item.source.reliabilityScore}/100
                    {item.source.organization ? ` (${item.source.organization})` : ""}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-neutral-500">Queue is empty.</p>}
      </section>

      <section aria-labelledby="rep-heading" className="mt-10 space-y-3">
        <h2 id="rep-heading" className="text-lg font-semibold">User reports ({reports.length})</h2>
        {reports.map((r) => (
          <div key={r.id} className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">
                  {r.reason} — {r.competition?.title ?? r.competitionId}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  {r.message ?? "no details"}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button disabled={busyId === r.id} onClick={() => resolveReport(r.id, "UNPUBLISH")}
                  className="rounded-md bg-amber-500 px-2.5 py-1.5 text-xs text-white">
                  Suppress listing
                </button>
                <button disabled={busyId === r.id} onClick={() => resolveReport(r.id, "FLAG_SOURCE")}
                  className="rounded-md bg-red-500 px-2.5 py-1.5 text-xs text-white">
                  Flag source
                </button>
                <button disabled={busyId === r.id} onClick={() => resolveReport(r.id, "DISMISS")}
                  className="rounded-md border px-2.5 py-1.5 text-xs">
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        ))}
        {reports.length === 0 && <p className="text-sm text-neutral-500">No open reports.</p>}
      </section>
    </div>
  );
}
