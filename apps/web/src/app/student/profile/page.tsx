"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { clearSession } from "@/lib/auth";

type Tab = "profile" | "questionnaire" | "saved" | "achievements" | "applications" | "settings";

export default function ProfilePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("profile");
  const [profile, setProfile] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [savedList, setSavedCompetitions] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      const [profileData, appsData, savedData, achievementsData] = await Promise.all([
        api.me(),
        api.applications?.() || Promise.resolve([]),
        api.saved?.() || Promise.resolve([]),
        api.achievements?.() || Promise.resolve([])
      ]);
      setProfile(profileData);
      setApplications(appsData);
      setSavedCompetitions(savedData);
      setAchievements(achievementsData);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function updateListField(field: string, value: string) {
    setProfile((p: any) => ({ ...p, [field]: value.split(",").map((s) => s.trim()).filter(Boolean) }));
  }

  function toggleArrayItem(field: string, item: string) {
    const current = profile[field] as string[];
    const updated = current.includes(item) 
      ? current.filter(i => i !== item)
      : [...current, item];
    setProfile((p: any) => ({ ...p, [field]: updated }));
  }

  async function saveProfile() {
    try {
      await api.updateProfile({
        fullName: profile.fullName,
        educationLevel: profile.educationLevel,
        fieldOfStudy: profile.fieldOfStudy,
        interests: profile.interests,
        skills: profile.skills,
        country: profile.country,
        region: profile.region,
        city: profile.city,
        age: profile.age ? Number(profile.age) : undefined,
        preferredFormats: profile.preferredFormats,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleDeleteAccount() {
    if (!confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      return;
    }
    try {
      await api.deleteAccount?.();
      clearSession();
      router.push("/");
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (error) return <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">Log in to view your profile. ({error})</p>;
  if (loading) return <p className="text-neutral-500">Loading…</p>;

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Your Profile</h1>
        <p className="text-neutral-500">Manage your account, applications, and preferences.</p>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {(["profile", "questionnaire", "saved", "achievements", "applications", "settings"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium capitalize ${
              tab === t ? "bg-brand-600 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
            <div className="space-y-4">
              <ProfileInput label="Full name" value={profile.fullName} onChange={(v) => setProfile({ ...profile, fullName: v })} />
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">Education level</label>
                <select
                  value={profile.educationLevel}
                  onChange={(e) => setProfile({ ...profile, educationLevel: e.target.value })}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2"
                >
                  <option value="">Select your level</option>
                  {["SECONDARY", "UNIVERSITY", "GRADUATE", "OTHER"].map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <ProfileInput
                label="Field of study (comma-separated)"
                value={(profile.fieldOfStudy ?? []).join(", ")}
                onChange={(v) => updateListField("fieldOfStudy", v)}
              />
              <ProfileInput
                label="Academic interests (comma-separated)"
                value={(profile.interests ?? []).join(", ")}
                onChange={(v) => updateListField("interests", v)}
              />
              <ProfileInput
                label="Skills (comma-separated)"
                value={(profile.skills ?? []).join(", ")}
                onChange={(v) => updateListField("skills", v)}
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <ProfileInput label="Country" value={profile.country ?? ""} onChange={(v) => setProfile({ ...profile, country: v })} />
                <ProfileInput label="Region" value={profile.region ?? ""} onChange={(v) => setProfile({ ...profile, region: v })} />
                <ProfileInput label="City" value={profile.city ?? ""} onChange={(v) => setProfile({ ...profile, city: v })} />
              </div>
              <ProfileInput label="Age" value={String(profile.age ?? "")} onChange={(v) => setProfile({ ...profile, age: v })} type="number" />
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h2 className="text-lg font-semibold mb-4">Competition Preferences</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">Preferred formats</label>
                <div className="flex flex-wrap gap-2">
                  {["ONLINE", "OFFLINE", "HYBRID"].map((format) => (
                    <button
                      key={format}
                      type="button"
                      onClick={() => toggleArrayItem("preferredFormats", format)}
                      className={`rounded-full px-3 py-1.5 text-sm ${
                        (profile.preferredFormats ?? []).includes(format)
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
          </div>

          <button onClick={saveProfile} className="w-full rounded-md bg-brand-600 py-2 font-medium text-white hover:bg-brand-700">
            Save profile
          </button>
          {saved && <p className="text-center text-sm text-green-600">Profile saved successfully!</p>}
        </div>
      )}

      {tab === "applications" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Your Applications</h2>
          {applications.length === 0 ? (
            <p className="text-neutral-500">No applications yet. Start saving competitions!</p>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => (
                <div key={app.id} className="rounded-xl border border-neutral-200 bg-white p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{app.competition?.title}</h3>
                      <p className="text-sm text-neutral-500">Status: {app.status}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs ${
                      app.status === "APPLIED" ? "bg-green-100 text-green-700" :
                      app.status === "SAVED" ? "bg-blue-100 text-blue-700" :
                      "bg-neutral-100 text-neutral-700"
                    }`}>
                      {app.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "questionnaire" && (
        <div className="max-w-xl space-y-4">
          <h2 className="text-lg font-semibold">Interest questionnaire</h2>
          <p className="text-sm text-neutral-500">
            Your answers tune your recommendations. Retake any time your interests change —
            it takes about 2 minutes.
          </p>
          <a
            href="/student/questionnaire"
            className="inline-block rounded-md bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Open questionnaire
          </a>
        </div>
      )}

      {tab === "saved" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Saved Competitions</h2>
          {savedList.length === 0 ? (
            <p className="text-neutral-500">No saved competitions yet.</p>
          ) : (
            <div className="space-y-3">
              {savedList.map((item) => (
                <div key={item.id} className="rounded-xl border border-neutral-200 bg-white p-4">
                  <h3 className="font-semibold">{item.competition?.title}</h3>
                  <p className="text-sm text-neutral-500">{item.competition?.deadline && `Deadline: ${new Date(item.competition.deadline).toLocaleDateString()}`}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "achievements" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Your Achievements</h2>
          {achievements.length === 0 ? (
            <p className="text-neutral-500">No achievements recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {achievements.map((achievement) => (
                <div key={achievement.id} className="rounded-xl border border-neutral-200 bg-white p-4">
                  <h3 className="font-semibold">{achievement.competition?.title}</h3>
                  <p className="text-sm text-neutral-500">{achievement.type}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "settings" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h2 className="text-lg font-semibold mb-4">Account Settings</h2>
            <div className="space-y-4">
              <button className="w-full text-left rounded-md border px-4 py-3 hover:bg-neutral-50">
                Change password
              </button>
              <button className="w-full text-left rounded-md border px-4 py-3 hover:bg-neutral-50">
                Export my data
              </button>
              <button 
                onClick={handleDeleteAccount}
                className="w-full text-left rounded-md border border-red-200 px-4 py-3 text-red-600 hover:bg-red-50"
              >
                Delete account
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h2 className="text-lg font-semibold mb-4">Notification Preferences</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-sm">Deadline reminders</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-sm">New matching competitions</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-sm">Application updates</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-neutral-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-neutral-300 px-3 py-2"
      />
    </div>
  );
}