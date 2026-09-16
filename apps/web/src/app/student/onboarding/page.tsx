"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { storeSession } from "@/lib/auth";

type Step = "welcome" | "education" | "interests" | "preferences" | "complete";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    fullName: "",
    educationLevel: "",
    fieldOfStudy: [] as string[],
    interests: [] as string[],
    skills: [] as string[],
    age: "",
    country: "",
    region: "",
    city: "",
    preferredFormats: [] as string[],
    careerInterests: [] as string[],
  });

  const totalSteps = 4;
  const currentStepNum = step === "welcome" ? 0 : step === "complete" ? 4 : 
    step === "education" ? 1 : step === "interests" ? 2 : 3;

  function updateListField(field: keyof typeof formData, value: string) {
    setFormData(prev => ({
      ...prev,
      [field]: value.split(",").map(s => s.trim()).filter(Boolean)
    }));
  }

  function toggleArrayItem(field: keyof typeof formData, item: string) {
    const current = formData[field] as string[];
    const updated = current.includes(item) 
      ? current.filter(i => i !== item)
      : [...current, item];
    setFormData(prev => ({ ...prev, [field]: updated }));
  }

  async function completeOnboarding() {
    setLoading(true);
    setError(null);
    try {
      await api.updateProfile({
        fullName: formData.fullName,
        educationLevel: formData.educationLevel,
        fieldOfStudy: formData.fieldOfStudy,
        interests: formData.interests,
        skills: formData.skills,
        age: formData.age ? Number(formData.age) : undefined,
        country: formData.country,
        region: formData.region,
        city: formData.city,
        preferredFormats: formData.preferredFormats,
      });
      router.push("/student/profile");
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress bar */}
      {step !== "welcome" && step !== "complete" && (
        <div className="mb-8">
          <div className="flex justify-between text-sm text-neutral-600 mb-2">
            <span>Step {currentStepNum} of {totalSteps}</span>
            <span>{Math.round((currentStepNum / totalSteps) * 100)}% complete</span>
          </div>
          <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-brand-600 transition-all duration-300"
              style={{ width: `${(currentStepNum / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {step === "welcome" && (
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Welcome to ScholarTrack</h1>
          <p className="text-lg text-neutral-600 mb-8">
            Let's set up your profile to find competitions you're actually eligible for.
            This will only take a few minutes.
          </p>
          <button
            onClick={() => setStep("education")}
            className="rounded-md bg-brand-600 px-8 py-3 text-white font-semibold hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            Get Started
          </button>
          <p className="mt-4 text-sm text-neutral-500">
            You can update these settings anytime in your profile.
          </p>
        </div>
      )}

      {step === "education" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Your Education</h2>
            <p className="text-neutral-600">This helps us find competitions that match your academic level.</p>
          </div>

          <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                Full name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full rounded-md border border-neutral-300 px-3 py-2"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                Education level <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.educationLevel}
                onChange={(e) => setFormData({ ...formData, educationLevel: e.target.value })}
                className="w-full rounded-md border border-neutral-300 px-3 py-2"
              >
                <option value="">Select your level</option>
                <option value="SECONDARY">Secondary School</option>
                <option value="UNIVERSITY">University</option>
                <option value="GRADUATE">Graduate Studies</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                Field of study
              </label>
              <input
                type="text"
                value={formData.fieldOfStudy.join(", ")}
                onChange={(e) => updateListField("fieldOfStudy", e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2"
                placeholder="e.g. Mathematics, Computer Science, Physics (comma-separated)"
              />
              <p className="mt-1 text-xs text-neutral-500">Separate multiple fields with commas</p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                Age (optional)
              </label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                className="w-full rounded-md border border-neutral-300 px-3 py-2"
                placeholder="Your age"
                min="10"
                max="100"
              />
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep("welcome")}
              className="rounded-md border px-4 py-2 hover:bg-neutral-50"
            >
              Back
            </button>
            <button
              onClick={() => setStep("interests")}
              disabled={!formData.fullName || !formData.educationLevel}
              className="rounded-md bg-brand-600 px-4 py-2 text-white hover:bg-brand-700 disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === "interests" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Your Interests & Skills</h2>
            <p className="text-neutral-600">Tell us what you're interested in to get better recommendations.</p>
          </div>

          <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                Academic interests
              </label>
              <input
                type="text"
                value={formData.interests.join(", ")}
                onChange={(e) => updateListField("interests", e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2"
                placeholder="e.g. AI, mathematics, robotics, debate (comma-separated)"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                Skills
              </label>
              <input
                type="text"
                value={formData.skills.join(", ")}
                onChange={(e) => updateListField("skills", e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2"
                placeholder="e.g. Python, public speaking, research (comma-separated)"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                Career interests
              </label>
              <input
                type="text"
                value={formData.careerInterests.join(", ")}
                onChange={(e) => updateListField("careerInterests", e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2"
                placeholder="e.g. software engineering, research, entrepreneurship (comma-separated)"
              />
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep("education")}
              className="rounded-md border px-4 py-2 hover:bg-neutral-50"
            >
              Back
            </button>
            <button
              onClick={() => setStep("preferences")}
              className="rounded-md bg-brand-600 px-4 py-2 text-white hover:bg-brand-700"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === "preferences" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Your Preferences</h2>
            <p className="text-neutral-600">Help us tailor opportunities to your location and format preferences.</p>
          </div>

          <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">Country</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2"
                  placeholder="e.g. Cameroon"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">Region</label>
                <input
                  type="text"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2"
                  placeholder="e.g. Littoral"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2"
                  placeholder="e.g. Douala"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                Preferred competition formats
              </label>
              <div className="flex flex-wrap gap-2">
                {["ONLINE", "OFFLINE", "HYBRID"].map((format) => (
                  <button
                    key={format}
                    type="button"
                    onClick={() => toggleArrayItem("preferredFormats", format)}
                    className={`rounded-full px-3 py-1.5 text-sm ${
                      formData.preferredFormats.includes(format)
                        ? "bg-brand-600 text-white"
                        : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                    }`}
                  >
                    {format.toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep("interests")}
              className="rounded-md border px-4 py-2 hover:bg-neutral-50"
            >
              Back
            </button>
            <button
              onClick={completeOnboarding}
              disabled={loading}
              className="rounded-md bg-brand-600 px-4 py-2 text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Complete Setup"}
            </button>
          </div>
        </div>
      )}

      {step === "complete" && (
        <div className="text-center">
          <div className="mb-6">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">You're all set!</h2>
            <p className="text-neutral-600">
              Your profile is ready. We'll now show you competitions that match your eligibility and interests.
            </p>
          </div>
          <button
            onClick={() => router.push("/for-you")}
            className="rounded-md bg-brand-600 px-8 py-3 text-white font-semibold hover:bg-brand-700"
          >
            See Your Competitions
          </button>
        </div>
      )}
    </div>
  );
}