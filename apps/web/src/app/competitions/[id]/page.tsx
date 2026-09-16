"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

export default function CompetitionDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<{
    competition: any;
    match: any;
    eligibility: { verdict: string; reasons: string[] } | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("WRONG_INFO");
  const [reportMsg, setReportMsg] = useState("");
  const [reportDone, setReportDone] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .competition(params.id)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  // Set page title dynamically
  useEffect(() => {
    if (data?.competition) {
      document.title = `${data.competition.title} — ScholarTrack`;
    }
  }, [data]);

  if (loading)
    return (
      <div className="max-w-3xl animate-pulse space-y-4" aria-busy="true">
        <div className="h-8 w-3/4 rounded bg-neutral-100 dark:bg-neutral-800" />
        <div className="h-24 rounded bg-neutral-100 dark:bg-neutral-800" />
        <div className="h-40 rounded bg-neutral-100 dark:bg-neutral-800" />
        <span className="sr-only">Loading competition…</span>
      </div>
    );
  if (error)
    return (
      <div role="alert" className="max-w-3xl">
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
        <Link href="/competitions" className="mt-3 inline-block text-sm underline">
          Back to competitions
        </Link>
      </div>
    );
  if (!data) return null;

  const { competition, match } = data;

  const stages: { name: string; date: string }[] = (() => {
    try {
      return competition.stages ? JSON.parse(competition.stages) : [];
    } catch {
      return [];
    }
  })();
  const prepResources: { title: string; url?: string; official?: boolean }[] = (() => {
    try {
      return competition.preparationResources ? JSON.parse(competition.preparationResources) : [];
    } catch {
      return [];
    }
  })();
  const requiredDocs: string[] = (() => {
    try {
      return competition.requiredDocuments ? JSON.parse(competition.requiredDocuments) : [];
    } catch {
      return [];
    }
  })();

  const LABEL_STYLES: Record<string, string> = {
    STARTER: "bg-green-100 text-green-800",
    STRONG_MATCH: "bg-blue-100 text-blue-800",
    STRETCH: "bg-purple-100 text-purple-800",
  };
  const LABEL_TEXT: Record<string, string> = {
    STARTER: "Good starter",
    STRONG_MATCH: "Strong match",
    STRETCH: "Stretch challenge",
  };

  async function act(status: string, extra?: { followed?: boolean }) {
    setSaving(true);
    setNotice(null);
    try {
      await api.saveApplication(competition.id, status, extra);
      if (status === "SAVED") setSaved(true);
      setNotice(
        extra?.followed
          ? "Following — we'll flag new editions and changes."
          : status === "SAVED"
            ? "Saved — find it any time under Saved."
            : status === "PREPARING"
              ? "You're preparing — track it under Applications."
              : "Status updated — track it under Applications."
      );
    } catch (e: any) {
      setNotice(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function submitReport() {
    try {
      await api.reportCompetition(competition.id, reportReason, reportMsg || undefined);
      setReportDone(true);
      setReportOpen(false);
    } catch (e: any) {
      alert(e.message);
    }
  }

  const eligibilityBadge =
    data?.eligibility?.verdict === "ELIGIBLE"
      ? { text: "✓ You meet the recorded eligibility rules", cls: "bg-green-100 text-green-800" }
      : data?.eligibility?.verdict === "NOT_ELIGIBLE"
        ? { text: "✗ You may not be eligible — see reasons", cls: "bg-red-100 text-red-800" }
        : data?.eligibility?.verdict === "UNCERTAIN"
          ? { text: "? Eligibility uncertain — check the official rules", cls: "bg-amber-100 text-amber-900" }
          : null;

  return (
    <div className="max-w-3xl">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
          Trust score: {competition.trustScore}/100
        </span>
        {competition.lastVerifiedAt && (
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            Last verified {new Date(competition.lastVerifiedAt).toLocaleDateString()}
          </span>
        )}
        {eligibilityBadge && (
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${eligibilityBadge.cls}`}>
            {eligibilityBadge.text}
          </span>
        )}
      </div>

      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{competition.title}</h1>
      <p className="mt-1 text-neutral-500">
        {competition.organizer ?? "Organizer not yet verified"}
        {competition.editionYear ? ` · ${competition.editionYear} edition` : ""}
      </p>

      {match && (
        <span className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${LABEL_STYLES[match.label] ?? "bg-neutral-100"}`}>
          {LABEL_TEXT[match.label] ?? match.label}
        </span>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 rounded-xl border border-neutral-200 bg-white p-5 text-sm sm:grid-cols-3 dark:bg-neutral-900 dark:border-neutral-700">
        <Field label="Format" value={competition.format ?? "Unknown"} />
        <Field label="Participation" value={(competition.individualOrTeam ?? "INDIVIDUAL").toLowerCase()} />
        <Field label="Cost" value={competition.cost ?? "Unknown"} />
        <Field label="Deadline" value={competition.deadline ? new Date(competition.deadline).toDateString() : "TBA"} />
        <Field label="Countries" value={competition.countries?.length ? competition.countries.join(", ") : "Any"} />
        <Field label="Education level" value={competition.educationLevels?.join(", ") || "Any"} />
        <Field label="Benefits" value={competition.benefits?.join(", ") || "Not specified"} />
        <Field label="Difficulty" value={(competition.difficulty ?? "unknown").replace("_", " ").toLowerCase()} />
        {competition.location && <Field label="Location" value={competition.location} />}
      </div>

      {stages.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 font-semibold text-neutral-900 dark:text-neutral-100">Timeline</h2>
          <ol className="space-y-2 border-l-2 border-neutral-200 pl-4 text-sm text-neutral-700 dark:text-neutral-300">
            {stages.map((s, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand-500" aria-hidden="true" />
                <span className="font-medium">{s.name}</span>
                {s.date && <span className="text-neutral-500"> — {new Date(s.date).toLocaleDateString()}</span>}
              </li>
            ))}
          </ol>
        </div>
      )}

      {(prepResources.length > 0 || requiredDocs.length > 0) && (
        <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-5 dark:bg-neutral-900 dark:border-neutral-700">
          <h2 className="mb-3 font-semibold text-neutral-900 dark:text-neutral-100">Preparation</h2>
          {requiredDocs.length > 0 && (
            <div className="mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Documents you may need</h3>
              <ul className="mt-1 list-disc pl-5 text-sm text-neutral-700 dark:text-neutral-300">
                {requiredDocs.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </div>
          )}
          {prepResources.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Resources</h3>
              <ul className="mt-1 space-y-1 text-sm">
                {prepResources.map((r, i) => (
                  <li key={i}>
                    {r.url ? (
                      <a href={r.url} target="_blank" rel="noreferrer" className="text-brand-600 underline">
                        {r.title}{r.official ? " (official)" : ""}
                      </a>
                    ) : (
                      <span className="text-neutral-700 dark:text-neutral-300">{r.title}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-6">
        <h2 className="mb-2 font-semibold text-neutral-900 dark:text-neutral-100">Description</h2>
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          {competition.description || "No description available yet."}
        </p>
      </div>

      <div className="mt-6">
        <h2 className="mb-2 font-semibold text-neutral-900 dark:text-neutral-100">Eligibility</h2>
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          {competition.eligibilityRawText ?? "Not yet parsed. Check the official page."}
        </p>
        {data.eligibility?.reasons?.length ? (
          <ul className="mt-2 list-disc pl-5 text-sm text-neutral-600 dark:text-neutral-400">
            {data.eligibility.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        ) : null}
      </div>

      {match && (
        <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-5 dark:bg-neutral-900 dark:border-neutral-700">
          <h2 className="mb-3 font-semibold text-neutral-900 dark:text-neutral-100">
            Why this may fit you ({match.score}%)
          </h2>
          <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-neutral-700 dark:text-neutral-300">
            {match.explanations.slice(0, 6).map((e: string, i: number) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
          {match.gaps?.length > 0 && (
            <div className="mb-4 rounded-lg bg-amber-50 p-3 dark:bg-amber-950">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Preparation gaps</h3>
              <ul className="mt-1 list-disc pl-5 text-sm text-amber-900 dark:text-amber-200">
                {match.gaps.map((g: string, i: number) => <li key={i}>{g}</li>)}
              </ul>
            </div>
          )}
          <div className="space-y-1.5">
            {Object.entries(match.components).map(([k, v]) => (
              <div key={k} className="flex items-center gap-3">
                <span className="w-32 shrink-0 capitalize text-neutral-500 text-xs">{k}</span>
                <div className="h-2 flex-1 rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <div className="h-2 rounded-full bg-brand-400" style={{ width: `${Math.min(100, Number(v) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {notice && (
        <p role="status" className="mt-4 rounded-md bg-green-50 p-3 text-sm text-green-800">
          {notice}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          disabled={saving || saved}
          onClick={() => act("SAVED")}
          className="rounded-md border border-brand-600 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50"
        >
          {saved ? "Saved ✓" : "Save"}
        </button>
        <button
          disabled={saving}
          onClick={() => act("PREPARING")}
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
        >
          I want to try — start preparing
        </button>
        <button
          disabled={saving}
          onClick={() => act("SAVED", { followed: true })}
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
        >
          Follow
        </button>
        {competition.applicationUrl && (
          <a
            href={competition.applicationUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="ml-auto text-sm font-medium text-brand-600 underline"
          >
            Official application page ↗
          </a>
        )}
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        Applications happen on the organizer&apos;s website — we never apply on your behalf.
      </p>

      <div className="mt-4 text-right">
        {reportDone ? (
          <span role="status" className="text-xs text-green-700">Report received — thank you.</span>
        ) : reportOpen ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-left dark:bg-amber-950 dark:border-amber-800">
            <p className="mb-2 text-sm font-medium text-amber-900 dark:text-amber-200">What&apos;s wrong with this listing?</p>
            <label htmlFor="report-reason" className="sr-only">Reason</label>
            <select
              id="report-reason"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="mb-2 w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm"
            >
              <option value="SUSPICIOUS">Suspicious / possibly fake</option>
              <option value="FAKE_OR_SCAM">Fake or scam</option>
              <option value="WRONG_INFO">Information is wrong</option>
              <option value="EXPIRED">Deadline has passed</option>
              <option value="INACCESSIBLE_LINK">Link doesn&apos;t work</option>
              <option value="OTHER">Other</option>
            </select>
            <label htmlFor="report-message" className="sr-only">Details</label>
            <textarea
              id="report-message"
              value={reportMsg}
              onChange={(e) => setReportMsg(e.target.value)}
              placeholder="Optional details"
              className="mb-2 w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm"
              rows={2}
              maxLength={2000}
            />
            <div className="flex gap-2">
              <button onClick={submitReport} className="rounded-md bg-amber-600 px-3 py-1.5 text-sm text-white hover:bg-amber-700">
                Send report
              </button>
              <button onClick={() => setReportOpen(false)} className="text-sm text-neutral-500 underline">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setReportOpen(true)} className="text-xs text-neutral-400 underline hover:text-neutral-600">
            Report this listing
          </button>
        )}
      </div>

      {competition.source && (
        <p className="mt-4 text-xs text-neutral-400">
          Source: {competition.source.organization ?? competition.source.url} · discovery data is reviewed by humans
          before publication.
        </p>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-neutral-400">{label}</p>
      <p className="font-medium text-neutral-800 dark:text-neutral-200">{value}</p>
    </div>
  );
}
