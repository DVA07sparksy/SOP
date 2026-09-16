"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";

// Achievements portfolio (product doc §24): self-reported records with
// optional certificate evidence; verification is a separate, later layer.
const PLACEMENTS = ["PARTICIPATED", "FINALIST", "WINNER", "CERTIFICATE", "MEDAL", "SCHOLARSHIP", "OTHER"] as const;

const PLACEMENT_ICONS: Record<string, string> = {
  PARTICIPATED: "🎯",
  FINALIST: "🏆",
  WINNER: "🥇",
  CERTIFICATE: "📜",
  MEDAL: "🥈",
  SCHOLARSHIP: "💰",
  OTHER: "⭐",
};

export default function AchievementsPage() {
  const router = useRouter();
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    title: "",
    competitionId: "",
    placement: "PARTICIPATED",
    achievedAt: "",
    prizeDescription: "",
    certificateUrl: "",
    evidenceFileName: "",
  });

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    load();
  }, []);

  function load() {
    api.achievements()
      .then(setAchievements)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  async function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function add() {
    setBusy(true);
    setError(null);
    try {
      let evidence;
      // Evidence file: for the MVP we validate client-side type/size and pass
      // a data URL as the storage key placeholder — production swaps this for
      // a presigned upload to object storage; server still validates.
      let evidenceFile: File | null = null;
      const input = document.getElementById("evidence-input") as HTMLInputElement | null;
      if (input?.files?.[0]) evidenceFile = input.files[0];
      if (evidenceFile) {
        if (!["image/png", "image/jpeg", "image/webp", "application/pdf"].includes(evidenceFile.type)) {
          throw new Error("Evidence must be a PNG, JPEG, WebP image or PDF (max 5 MB).");
        }
        if (evidenceFile.size > 5 * 1024 * 1024) {
          throw new Error("Evidence file must be 5 MB or smaller.");
        }
        const dataUrl = await fileToDataUrl(evidenceFile);
        evidence = {
          fileName: evidenceFile.name.slice(0, 200),
          mimeType: evidenceFile.type,
          byteSize: evidenceFile.size,
          storageKey: dataUrl.slice(0, 500),
        };
      }

      await api.addAchievement({
        title: form.title,
        competitionId: form.competitionId || undefined,
        placement: form.placement,
        achievedAt: form.achievedAt ? new Date(form.achievedAt).toISOString() : undefined,
        prizeDescription: form.prizeDescription || undefined,
        certificateUrl: form.certificateUrl || undefined,
        evidence,
      });
      setShowAdd(false);
      setForm({ title: "", competitionId: "", placement: "PARTICIPATED", achievedAt: "", prizeDescription: "", certificateUrl: "", evidenceFileName: "" });
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      await api.deleteAchievement(id);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  const byYear = achievements.reduce<Record<number, any[]>>((acc, a) => {
    const year = new Date(a.createdAt).getFullYear();
    (acc[year] ??= []).push(a);
    return acc;
  }, {});
  const years = Object.keys(byYear).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Achievements portfolio</h1>
          <p className="text-neutral-500">
            Record competitions entered, placements and certificates — build your record as you grow.
          </p>
        </div>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {showAdd ? "Cancel" : "Add achievement"}
        </button>
      </div>

      {error && <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {showAdd && (
        <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="text-lg font-semibold">Record an achievement</h2>
          <p className="mt-1 text-xs text-neutral-500">
            Self-reported for now; the team can verify later. Only claim what you can evidence.
          </p>
          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="ach-title" className="block text-sm font-medium">Title *</label>
              <input id="ach-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                maxLength={200} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
                placeholder="e.g. 2nd place, National Programming Championship" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="ach-place" className="block text-sm font-medium">Placement</label>
                <select id="ach-place" value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value })}
                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2">
                  {PLACEMENTS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="ach-date" className="block text-sm font-medium">Date achieved</label>
                <input id="ach-date" type="date" value={form.achievedAt} onChange={(e) => setForm({ ...form, achievedAt: e.target.value })}
                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" />
              </div>
            </div>
            <div>
              <label htmlFor="ach-comp" className="block text-sm font-medium">Competition ID (optional)</label>
              <input id="ach-comp" value={form.competitionId} onChange={(e) => setForm({ ...form, competitionId: e.target.value })}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm"
                placeholder="Links this achievement to a competition on the platform" />
            </div>
            <div>
              <label htmlFor="ach-prize" className="block text-sm font-medium">Prize / benefit (optional)</label>
              <input id="ach-prize" value={form.prizeDescription} onChange={(e) => setForm({ ...form, prizeDescription: e.target.value })}
                maxLength={2000} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" />
            </div>
            <div>
              <label htmlFor="ach-cert" className="block text-sm font-medium">Certificate URL (optional)</label>
              <input id="ach-cert" type="url" value={form.certificateUrl} onChange={(e) => setForm({ ...form, certificateUrl: e.target.value })}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" />
            </div>
            <div>
              <label htmlFor="evidence-input" className="block text-sm font-medium">Evidence file (optional — image or PDF, max 5 MB)</label>
              <input id="evidence-input" type="file" accept="image/png,image/jpeg,image/webp,application/pdf"
                className="mt-1 w-full text-sm" />
            </div>
            <button
              onClick={add}
              disabled={busy || form.title.trim().length < 2}
              className="w-full rounded-md bg-brand-600 py-2.5 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save achievement"}
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="mt-6 space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-lg bg-neutral-100" />)}
        </div>
      )}

      {!loading && achievements.length === 0 && (
        <div className="mt-6 rounded-xl border p-8 text-center">
          <div className="mb-3 text-4xl">🎯</div>
          <p className="font-medium">No achievements recorded yet.</p>
          <p className="mt-1 text-sm text-neutral-500">Every entry starts your record — even participating counts.</p>
        </div>
      )}

      <div className="mt-8 space-y-8">
        {years.map((year) => (
          <div key={year}>
            <h2 className="mb-3 text-xl font-bold">{year}</h2>
            <div className="space-y-3">
              {byYear[Number(year)].map((a: any) => (
                <div key={a.id} className="rounded-xl border border-neutral-200 bg-white p-5">
                  <div className="flex items-start gap-4">
                    <div className="text-3xl" aria-hidden="true">{PLACEMENT_ICONS[a.placement] ?? "⭐"}</div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold">{a.title}</h3>
                          <p className="text-sm text-neutral-500">
                            {a.placement} · {a.achievedAt ? new Date(a.achievedAt).toLocaleDateString() : new Date(a.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          a.verificationStatus === "VERIFIED" ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-600"
                        }`}>
                          {a.verificationStatus === "VERIFIED" ? "✓ Verified" : "Self-reported"}
                        </span>
                      </div>
                      {a.prizeDescription && <p className="mt-2 text-sm text-neutral-600">{a.prizeDescription}</p>}
                      {a.competition && (
                        <a href={`/competitions/${a.competition.id}`} className="mt-1 inline-block text-xs text-brand-600 underline">
                          {a.competition.title}
                        </a>
                      )}
                      {a.evidences?.length > 0 && (
                        <p className="mt-2 text-xs text-neutral-500">
                          📎 {a.evidences[0].fileName} ({Math.round(a.evidences[0].byteSize / 1024)} KB)
                        </p>
                      )}
                      {a.certificateUrl && (
                        <a href={a.certificateUrl} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-brand-600 underline">
                          View certificate ↗
                        </a>
                      )}
                    </div>
                    <button onClick={() => remove(a.id)} aria-label={`Delete ${a.title}`}
                      className="text-xs text-red-600 underline">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {achievements.length > 0 && (
        <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">Portfolio summary</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Summary value={achievements.length} label="Total" />
            <Summary value={achievements.filter((a) => a.placement === "WINNER").length} label="Wins" />
            <Summary value={achievements.filter((a) => a.placement === "FINALIST").length} label="Finalist" />
            <Summary value={achievements.filter((a) => a.verificationStatus === "VERIFIED").length} label="Verified" />
          </div>
        </div>
      )}
    </div>
  );
}

function Summary({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-brand-600">{value}</div>
      <div className="text-sm text-neutral-600">{label}</div>
    </div>
  );
}
