"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";

// Student questionnaire (product doc §11): 2-5 minutes, no right answers,
// materially improves matching. Responses are editable and retakeable.
export default function QuestionnairePage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    Promise.all([api.questionnaire(), api.myQuestionnaire().catch(() => null)])
      .then(([defs, existing]) => {
        setQuestions(defs.questions);
        if (existing?.answers) setAnswers(existing.answers);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [router]);

  function setSingle(id: string, value: string) {
    setAnswers((a) => ({ ...a, [id]: value }));
  }
  function toggleMulti(id: string, value: string) {
    setAnswers((a) => {
      const current = (a[id] as string[]) ?? [];
      return {
        ...a,
        [id]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
      };
    });
  }

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      await api.submitQuestionnaire(answers);
      setDone(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-neutral-500">Loading questionnaire…</p>;

  if (done) {
    return (
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold">Thanks — your answers are saved</h1>
        <p className="mt-2 text-neutral-600">
          Your feed now reflects your interests, goals and appetite for challenge. You can retake
          this any time from your profile.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => router.push("/for-you")}
            className="rounded-md bg-brand-600 px-6 py-2.5 font-semibold text-white hover:bg-brand-700"
          >
            See my matches
          </button>
          <button
            onClick={() => setDone(false)}
            className="rounded-md border px-6 py-2.5 font-semibold hover:bg-neutral-50"
          >
            Edit answers
          </button>
        </div>
      </div>
    );
  }

  const answered = questions.filter((q) => {
    const a = answers[q.id];
    return Array.isArray(a) ? a.length > 0 : a != null;
  }).length;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">Quick questionnaire</h1>
      <p className="mt-1 text-neutral-500">
        About 2 minutes. There are no right or wrong answers — it just helps us find what fits you.
      </p>
      <div className="mt-4 h-2 rounded-full bg-neutral-200">
        <div
          className="h-full rounded-full bg-brand-600 transition-all"
          style={{ width: `${questions.length ? (answered / questions.length) * 100 : 0}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-neutral-400">{answered} of {questions.length} answered</p>

      {error && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <form
        className="mt-6 space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {questions.map((q, idx) => (
          <fieldset key={q.id} className="rounded-xl border border-neutral-200 bg-white p-5">
            <legend className="px-1 text-sm font-semibold text-neutral-900">
              {idx + 1}. {q.question}
            </legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {q.options.map((opt: any) => {
                const selected =
                  q.type === "multiple"
                    ? ((answers[q.id] as string[]) ?? []).includes(opt.value)
                    : answers[q.id] === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      q.type === "multiple"
                        ? toggleMulti(q.id, opt.value)
                        : setSingle(q.id, opt.value)
                    }
                    className={`rounded-full px-3.5 py-2 text-sm transition-colors ${
                      selected
                        ? "bg-brand-600 text-white"
                        : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}

        <button
          disabled={saving || answered < questions.length}
          className="w-full rounded-md bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : answered < questions.length ? "Answer all questions to continue" : "Save answers"}
        </button>
      </form>
    </div>
  );
}
