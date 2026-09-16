"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";

const LABEL_STYLES: Record<string, string> = {
  STARTER: "bg-green-100 text-green-800",
  STRONG_MATCH: "bg-blue-100 text-blue-800",
  STRETCH: "bg-purple-100 text-purple-800",
};
const LABEL_TEXT: Record<string, string> = {
  STARTER: "Starter",
  STRONG_MATCH: "Strong match",
  STRETCH: "Stretch",
};

// Personalized feed with Starter / Strong Match / Stretch grouping (doc §9/§18).
export default function ForYouPage() {
  const router = useRouter();
  const [ranked, setRanked] = useState<{ competition: any; match: any }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    api
      .forYou()
      .then(setRanked)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [router]);

  const groups = {
    STRONG_MATCH: ranked.filter((r) => r.match.label === "STRONG_MATCH"),
    STARTER: ranked.filter((r) => r.match.label === "STARTER"),
    STRETCH: ranked.filter((r) => r.match.label === "STRETCH"),
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">For you</h1>
          <p className="mt-1 max-w-2xl text-neutral-500">
            Ranked deterministically from your profile — eligibility first, then interest overlap,
            field, skills, format and deadline urgency. Never a black-box score.
          </p>
        </div>
        <a
          href="/student/questionnaire"
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-neutral-50"
        >
          Retake questionnaire
        </a>
      </div>

      {loading && <p className="mt-6 text-neutral-500">Ranking opportunities…</p>}
      {error && <p role="alert" className="mt-6 rounded-md bg-amber-50 p-3 text-sm text-amber-800">{error}</p>}

      {!loading && !error && ranked.length === 0 && (
        <div className="mt-6 rounded-xl border p-8 text-center">
          <p className="font-medium">No matches yet.</p>
          <p className="mt-1 text-sm text-neutral-500">
            Complete your profile and questionnaire to unlock personalized recommendations.
          </p>
          <a href="/student/onboarding" className="mt-4 inline-block rounded-md bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            Complete my profile
          </a>
        </div>
      )}

      {(["STRONG_MATCH", "STARTER", "STRETCH"] as const).map((key) =>
        groups[key].length > 0 ? (
          <section key={key} className="mt-8" aria-labelledby={`group-${key}`}>
            <h2 id={`group-${key}`} className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${LABEL_STYLES[key]}`}>
                {LABEL_TEXT[key]}
              </span>
              <span className="text-sm font-normal text-neutral-500">{groups[key].length} opportunit{groups[key].length === 1 ? "y" : "ies"}</span>
            </h2>
            {key === "STRETCH" && (
              <p className="mb-3 text-sm text-neutral-500">
                Ambitious picks — hard, but aligned with your profile. The preparation pathway on
                each page can get you ready.
              </p>
            )}
            <div className="space-y-3">
              {groups[key].map((r) => (
                <a
                  key={r.competition.id}
                  href={`/competitions/${r.competition.id}`}
                  className="block rounded-xl border border-neutral-200 bg-white p-4 hover:border-brand-300"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold">{r.competition.title}</p>
                      <p className="text-sm text-neutral-500">{r.competition.organizer ?? "Organizer unknown"}</p>
                      <p className="mt-1 line-clamp-1 text-xs text-neutral-500">
                        {r.match.explanations[0]}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs">{r.match.score}% fit</span>
                      {r.competition.deadline && (
                        <p className="mt-1 text-xs text-neutral-500">
                          {new Date(r.competition.deadline).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </section>
        ) : null
      )}
    </div>
  );
}
