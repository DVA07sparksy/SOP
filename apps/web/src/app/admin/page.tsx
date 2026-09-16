"use client";

import { useEffect, useState } from "react";
import { api, Competition } from "@/lib/api";

type Tab = "queue" | "reports" | "sources" | "audit" | "analytics" | "users";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("queue");
  const [items, setItems] = useState<Competition[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [aiRuns, setAiRuns] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ organizer: "", deadline: "", cost: "", reason: "" });
  const [note, setNote] = useState("");

  function load() {
    api.reviewQueue().then(setItems).catch((e) => setError(e.message));
    api.reports().then(setReports).catch(() => {});
    api.sources().then(setSources).catch(() => {});
    api.auditLog().then(setAuditLogs).catch(() => {});
    api.aiRuns().then(setAiRuns).catch(() => {});
    api.stats().then(setStats).catch(() => {});
    api.users().then(setUsers).catch(() => {});
  }
  useEffect(load, []);

  async function decide(id: string, decision: "PUBLISH" | "REJECT" | "REQUEST_CHANGES" | "ARCHIVE") {
    setBusyId(id);
    try {
      await api.decide(id, decision, note || undefined);
      setNote("");
      load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function reprocess(id: string) {
    setBusyId(id);
    try {
      await api.reprocess(id);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function saveEdit(id: string) {
    setBusyId(id);
    try {
      await api.editCompetition(
        id,
        {
          organizer: editDraft.organizer || null,
          deadline: editDraft.deadline || null,
          cost: editDraft.cost || null,
        },
        editDraft.reason
      );
      setEditing(null);
      load();
    } catch (e: any) {
      alert(e.message);
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
      alert(e.message);
    } finally {
      setBusyId(null);
    }
  }

  if (error)
    return (
      <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
        Admin login required. ({error})
      </p>
    );

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Admin Dashboard</h1>
        <p className="text-neutral-500">
          AI discovers and extracts — nothing reaches students without a decision here.
        </p>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {(["queue", "reports", "sources", "audit", "analytics", "users"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium capitalize ${
              tab === t ? "bg-brand-600 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            {t === "queue" ? `Review queue (${items.length})` : 
             t === "reports" ? `Reports (${reports.length})` : 
             t === "audit" ? `Audit log` :
             t === "analytics" ? `Analytics` :
             t === "users" ? `Users` : t}
          </button>
        ))}
      </div>

      {tab === "queue" && (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-neutral-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-semibold text-neutral-900">{item.title}</h3>
                  <p className="text-sm text-neutral-500">{item.organizer ?? "Organizer unknown"}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5">{item.status}</span>
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5">Trust: {item.trustScore}/100</span>
                    {typeof item.aiConfidence === "number" && (
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5">
                        AI confidence: {Math.round(item.aiConfidence * 100)}%
                      </span>
                    )}
                    {item.duplicateOfId && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
                        Possible duplicate of {item.duplicateOfId.slice(0, 8)}
                      </span>
                    )}
                    {item.reports && item.reports.length > 0 && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-700">
                        {item.reports.length} open report{item.reports.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  {item.rawPage?.url && (
                    <a
                      href={item.rawPage.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 block truncate text-xs text-brand-600 underline"
                    >
                      Source evidence: {item.rawPage.url}
                    </a>
                  )}
                  {item.eligibilityRawText && (
                    <p className="mt-2 line-clamp-2 text-xs text-neutral-500">Eligibility: {item.eligibilityRawText}</p>
                  )}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <div className="flex gap-2">
                    <button
                      disabled={busyId === item.id}
                      onClick={() => decide(item.id, "PUBLISH")}
                      className="rounded-md bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700"
                    >
                      Publish
                    </button>
                    <button
                      disabled={busyId === item.id}
                      onClick={() => decide(item.id, "REQUEST_CHANGES")}
                      className="rounded-md bg-amber-500 px-3 py-1.5 text-sm text-white hover:bg-amber-600"
                    >
                      Send back
                    </button>
                    <button
                      disabled={busyId === item.id}
                      onClick={() => decide(item.id, "REJECT")}
                      className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
                    >
                      Reject
                    </button>
                    <button
                      disabled={busyId === item.id}
                      onClick={() => decide(item.id, "ARCHIVE")}
                      className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600"
                    >
                      Archive
                    </button>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <button
                      onClick={() => {
                        setEditing(editing === item.id ? null : item.id);
                        setEditDraft({
                          organizer: item.organizer ?? "",
                          deadline: item.deadline ? item.deadline.slice(0, 10) : "",
                          cost: item.cost ?? "",
                          reason: "",
                        });
                      }}
                      className="text-brand-600 underline"
                    >
                      {editing === item.id ? "Close editor" : "Edit"}
                    </button>
                    <button onClick={() => reprocess(item.id)} className="text-neutral-500 underline">
                      Reprocess
                    </button>
                  </div>
                </div>
              </div>

              {editing === item.id && (
                <div className="mt-4 space-y-2 rounded-lg bg-neutral-50 p-4">
                  <input
                    value={editDraft.organizer}
                    onChange={(e) => setEditDraft({ ...editDraft, organizer: e.target.value })}
                    placeholder="Organizer"
                    className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
                  />
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={editDraft.deadline}
                      onChange={(e) => setEditDraft({ ...editDraft, deadline: e.target.value })}
                      className="flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
                    />
                    <input
                      value={editDraft.cost}
                      onChange={(e) => setEditDraft({ ...editDraft, cost: e.target.value })}
                      placeholder="Cost (e.g. free / 5000 XAF)"
                      className="flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
                    />
                  </div>
                  <input
                    value={editDraft.reason}
                    onChange={(e) => setEditDraft({ ...editDraft, reason: e.target.value })}
                    placeholder="Why are you making this change? (required, audited)"
                    className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
                  />
                  <button
                    disabled={!editDraft.reason.trim() || busyId === item.id}
                    onClick={() => saveEdit(item.id)}
                    className="rounded-md bg-brand-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                  >
                    Save edit
                  </button>
                </div>
              )}
            </div>
          ))}
          {items.length === 0 && <p className="text-neutral-500">Nothing waiting for review right now.</p>}
        </div>
      )}

      {tab === "reports" && (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-neutral-900">
                    {r.reason} — {r.competition?.title ?? r.competitionId}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">By {r.reportedBy?.email ?? "unknown"}: {r.message ?? "no details"}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    disabled={busyId === r.id}
                    onClick={() => resolveReport(r.id, "UNPUBLISH")}
                    className="rounded-md bg-amber-500 px-2.5 py-1.5 text-xs text-white"
                  >
                    Unpublish
                  </button>
                  <button
                    disabled={busyId === r.id}
                    onClick={() => resolveReport(r.id, "FLAG_SOURCE")}
                    className="rounded-md bg-red-500 px-2.5 py-1.5 text-xs text-white"
                  >
                    Flag source
                  </button>
                  <button
                    disabled={busyId === r.id}
                    onClick={() => resolveReport(r.id, "DISMISS")}
                    className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-xs"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          ))}
          {reports.length === 0 && <p className="text-neutral-500">No open reports.</p>}
        </div>
      )}

      {tab === "sources" && (
        <div className="space-y-2">
          {sources.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-neutral-900">{s.url}</p>
                <p className="text-xs text-neutral-500">{s.organization ?? "Unknown organization"}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  s.reliabilityScore >= 85 ? "bg-green-100 text-green-700" : s.reliabilityScore >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                }`}
              >
                {s.reliabilityScore}/100
              </span>
            </div>
          ))}
          {sources.length === 0 && <p className="text-neutral-500">No sources yet.</p>}
        </div>
      )}

      {tab === "audit" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Audit Log</h2>
          <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
            <table className="w-full">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">Time</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">Actor</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">Action</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">Target</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} className="border-t">
                    <td className="px-4 py-3 text-sm">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm">{log.actorType}</td>
                    <td className="px-4 py-3 text-sm">{log.action}</td>
                    <td className="px-4 py-3 text-sm">{log.targetType}: {log.targetId?.slice(0, 8)}...</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {auditLogs.length === 0 && <p className="text-neutral-500">No audit logs yet.</p>}
        </div>
      )}

      {tab === "analytics" && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Platform Analytics</h2>
          
          {stats && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
              <StatCard label="Published" value={stats.publishedCompetitions} icon="🏆" />
              <StatCard label="Awaiting review" value={stats.awaitingReview} icon="⏳" />
              <StatCard label="Students" value={stats.students} icon="👥" />
              <StatCard label="Institutions" value={stats.institutions} icon="🏫" />
              <StatCard label="Applications" value={stats.applications} icon="📝" />
              <StatCard label="This month" value={stats.applicationsThisMonth} icon="📅" />
              <StatCard label="Achievements" value={stats.achievements} icon="🎯" />
              <StatCard label="Open reports" value={stats.openReports} icon="🚩" />
            </div>
          )}

          {aiRuns && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl border border-neutral-200 bg-white p-6">
                <h3 className="font-semibold mb-4">AI Usage by Task</h3>
                <div className="space-y-3">
                  {aiRuns.byTask?.map((run: any) => (
                    <div key={run.task} className="flex justify-between items-center">
                      <span className="text-sm">{run.task}</span>
                      <span className="text-sm font-medium">{run._count._all} calls</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-neutral-200 bg-white p-6">
                <h3 className="font-semibold mb-4">Recent AI Failures</h3>
                {aiRuns.recentFailures?.length === 0 ? (
                  <p className="text-sm text-neutral-500">No recent failures</p>
                ) : (
                  <div className="space-y-2">
                    {aiRuns.recentFailures.map((failure: any, i: number) => (
                      <div key={i} className="text-sm p-2 bg-red-50 rounded">
                        <p className="font-medium">{failure.task}</p>
                        <p className="text-neutral-600">{failure.error}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}        </div>
      )}

      {tab === "users" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">User Management</h2>
          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
            <table className="w-full">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="px-4 py-3 text-sm">{u.email}</td>
                    <td className="px-4 py-3 text-sm">{u.role}</td>
                    <td className="px-4 py-3 text-sm">{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {users.length === 0 && <p className="text-neutral-500">No users found.</p>}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6">
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-neutral-500">{label}</div>
    </div>
  );
}
