"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { isLoggedIn, getAccessToken } from "@/lib/auth";

// Institution dashboard (product doc §25/§26): real aggregated statistics,
// roster, coordinator management, and competition nomination.
export default function InstitutionPage() {
  const [tab, setTab] = useState<"dashboard" | "students" | "coordinators" | "nominate">("dashboard");
  const [data, setData] = useState<any>(null);
  const [roster, setRoster] = useState<any[]>([]);
  const [coordinators, setCoordinators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Registration form
  const [showRegister, setShowRegister] = useState(false);
  const [regForm, setRegForm] = useState({ name: "", type: "SECONDARY", ownership: "GOVERNMENT", region: "", city: "" });

  // Coordinator form
  const [coordEmail, setCoordEmail] = useState("");
  const [coordSectors, setCoordSectors] = useState<string[]>([]);

  // Nominate form
  const [nominateCompetitionId, setNominateCompetitionId] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isLoggedIn()) return;
    const payload = parseJwt(getAccessToken());
    setRole(payload?.role ?? null);
    load();
  }, []);

  function parseJwt(token: string | null) {
    if (!token) return null;
    try {
      return JSON.parse(atob(token.split(".")[1]));
    } catch {
      return null;
    }
  }

  function load() {
    Promise.all([
      api.institutionDashboard().catch(() => null),
      api.institutionRoster().catch(() => []),
      api.institutionCoordinators().catch(() => []),
    ])
      .then(([dash, r, c]) => {
        setData(dash);
        setRoster(r);
        setCoordinators(c);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  async function register() {
    setError(null);
    try {
      await api.institutionRegister({
        name: regForm.name,
        type: regForm.type,
        ownership: regForm.ownership,
        country: "Cameroon",
        region: regForm.region || undefined,
        city: regForm.city || undefined,
      });
      setShowRegister(false);
      setMessage("Institution registered.");
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function addCoordinator() {
    setError(null);
    try {
      await api.addCoordinator(coordEmail, coordSectors.length ? coordSectors : ["general"]);
      setCoordEmail("");
      setCoordSectors([]);
      setMessage("Coordinator associated.");
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function removeCoordinator(id: string) {
    try {
      await api.removeCoordinator(id);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function nominate() {
    setError(null);
    try {
      await api.nominateStudents(Array.from(selectedStudents), nominateCompetitionId);
      setMessage(`Nominated ${selectedStudents.size} student(s).`);
      setSelectedStudents(new Set());
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (!isLoggedIn()) {
    return (
      <div className="max-w-2xl">
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">Log in as an institution admin to view this page.</p>
        <Link href="/login" className="mt-3 inline-block text-brand-600 underline">Go to login</Link>
      </div>
    );
  }

  if (loading) return <p className="text-neutral-500">Loading institution data…</p>;

  if (!data) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold">Institution registration</h1>
        <p className="mt-2 text-neutral-600">
          Register your school to track student participation, manage coordinators and get
          institution-level statistics. Government schools are pre-seeded; other institutions are
          reviewed before verification.
        </p>
        {message && <p className="mt-3 rounded-md bg-green-50 p-3 text-sm text-green-800">{message}</p>}
        {error && <p role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {!showRegister ? (
          <button
            onClick={() => setShowRegister(true)}
            className="mt-4 rounded-md bg-brand-600 px-6 py-2.5 font-semibold text-white hover:bg-brand-700"
          >
            Register institution
          </button>
        ) : (
          <div className="mt-4 space-y-3 rounded-xl border border-neutral-200 bg-white p-5">
            <div>
              <label htmlFor="inst-name" className="block text-sm font-medium">Institution name *</label>
              <input id="inst-name" value={regForm.name} onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="inst-type" className="block text-sm font-medium">Type</label>
                <select id="inst-type" value={regForm.type} onChange={(e) => setRegForm({ ...regForm, type: e.target.value })}
                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2">
                  <option value="SECONDARY">Secondary / High school</option>
                  <option value="UNIVERSITY">University</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="inst-own" className="block text-sm font-medium">Ownership</label>
                <select id="inst-own" value={regForm.ownership} onChange={(e) => setRegForm({ ...regForm, ownership: e.target.value })}
                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2">
                  <option value="GOVERNMENT">Government (public)</option>
                  <option value="PRIVATE">Private</option>
                  <option value="ASSOCIATION">Association</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="inst-region" className="block text-sm font-medium">Region</label>
                <input id="inst-region" value={regForm.region} onChange={(e) => setRegForm({ ...regForm, region: e.target.value })}
                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" placeholder="e.g. Southwest" />
              </div>
              <div>
                <label htmlFor="inst-city" className="block text-sm font-medium">City</label>
                <input id="inst-city" value={regForm.city} onChange={(e) => setRegForm({ ...regForm, city: e.target.value })}
                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" placeholder="e.g. Buea" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={register} disabled={regForm.name.trim().length < 2}
                className="rounded-md bg-brand-600 px-5 py-2 text-white hover:bg-brand-700 disabled:opacity-50">
                Submit registration
              </button>
              <button onClick={() => setShowRegister(false)} className="rounded-md border px-5 py-2 hover:bg-neutral-50">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const stats = data.stats ?? {};
  const verification = data.institution?.verificationStatus ?? "PENDING";

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{data.institution?.name}</h1>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            verification === "VERIFIED" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
          }`}>
            {verification === "VERIFIED" ? "✓ Verified" : "Verification pending"}
          </span>
        </div>
        <p className="text-neutral-500">Institution dashboard</p>
      </div>

      {message && <p className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800">{message}</p>}
      {error && <p role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {(["dashboard", "students", "coordinators", "nominate"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium capitalize ${
              tab === t ? "bg-brand-600 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "dashboard" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <StatCard label="Students" value={stats.students ?? 0} />
            <StatCard label="Competitions entered" value={stats.competitionsEntered ?? 0} />
            <StatCard label="Preparing" value={stats.preparing ?? 0} />
            <StatCard label="Applied" value={stats.applied ?? 0} />
            <StatCard label="Selected" value={stats.selected ?? 0} />
            <StatCard label="Finalists" value={stats.finalists ?? 0} />
            <StatCard label="Winners" value={stats.winners ?? 0} />
            <StatCard label="Certificates" value={stats.certificates ?? 0} />
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h2 className="mb-3 text-lg font-semibold">Recent achievements</h2>
            {(data.recentAchievements ?? []).length === 0 ? (
              <p className="text-sm text-neutral-500">No achievements recorded yet.</p>
            ) : (
              <ul className="space-y-2">
                {data.recentAchievements.map((a: any) => (
                  <li key={a.id} className="flex items-center justify-between rounded-lg bg-neutral-50 p-3 text-sm">
                    <span>{a.title}</span>
                    <span className="text-neutral-500">{a.placement ?? ""} · {new Date(a.createdAt).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === "students" && (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
          <table className="w-full">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Level</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Region</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Applications</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Achievements</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-4 py-3 text-sm">{s.fullName}</td>
                  <td className="px-4 py-3 text-sm">{s.educationLevel}</td>
                  <td className="px-4 py-3 text-sm">{s.region ?? "—"}</td>
                  <td className="px-4 py-3 text-sm">{s.applicationCount}</td>
                  <td className="px-4 py-3 text-sm">{s.achievementCount}</td>
                </tr>
              ))}
              {roster.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-neutral-500">No students associated yet. Students select your school in their profile.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "coordinators" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="font-semibold">Add coordinator</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Coordinators must first register an account with the “Coordinator” role. Up to 4 per institution; each picks 2–3 sectors.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                value={coordEmail}
                onChange={(e) => setCoordEmail(e.target.value)}
                placeholder="coordinator@example.com"
                aria-label="Coordinator email"
                className="flex-1 rounded-md border border-neutral-300 px-3 py-2"
              />
              <button
                onClick={addCoordinator}
                disabled={!coordEmail.includes("@")}
                className="rounded-md bg-brand-600 px-4 py-2 text-white hover:bg-brand-700 disabled:opacity-50"
              >
                Associate
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {coordinators.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4">
                <div>
                  <p className="text-sm font-medium">{c.email}</p>
                  <p className="text-xs text-neutral-500">Sectors: {c.sectors.join(", ")}</p>
                </div>
                <button onClick={() => removeCoordinator(c.id)} className="text-xs text-red-600 underline">
                  Remove
                </button>
              </div>
            ))}
            {coordinators.length === 0 && <p className="text-sm text-neutral-500">No coordinators associated yet.</p>}
          </div>
        </div>
      )}

      {tab === "nominate" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <label htmlFor="nom-comp" className="block text-sm font-medium">Competition ID to nominate for</label>
            <input
              id="nom-comp"
              value={nominateCompetitionId}
              onChange={(e) => setNominateCompetitionId(e.target.value)}
              placeholder="Paste a competition ID (from a competition page URL)"
              className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm"
            />
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="font-semibold">Select students ({selectedStudents.size} selected)</h2>
            <ul className="mt-3 space-y-2">
              {roster.map((s) => (
                <li key={s.id}>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedStudents.has(s.id)}
                      onChange={(e) => {
                        const next = new Set(selectedStudents);
                        if (e.target.checked) next.add(s.id);
                        else next.delete(s.id);
                        setSelectedStudents(next);
                      }}
                    />
                    {s.fullName} ({s.educationLevel})
                  </label>
                </li>
              ))}
            </ul>
            <button
              onClick={nominate}
              disabled={!nominateCompetitionId || selectedStudents.size === 0}
              className="mt-4 rounded-md bg-brand-600 px-5 py-2 text-white hover:bg-brand-700 disabled:opacity-50"
            >
              Nominate selected students
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-neutral-500">{label}</div>
    </div>
  );
}
