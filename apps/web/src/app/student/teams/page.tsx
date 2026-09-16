"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, Team } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";

// Teams (product doc §23): create a team, invite by link/code, accept
// invitations — deliberately not a social network.
export default function TeamsPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    load();
  }, []);

  function load() {
    api
      .myTeams()
      .then(setTeams)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.createTeam(name.trim());
      setName("");
      setShowCreate(false);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function join() {
    if (!inviteCode.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.joinTeam(inviteCode.trim());
      setInviteCode("");
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function accept(teamId: string, memberId: string) {
    setBusy(true);
    try {
      await api.acceptInvitation(teamId, memberId);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function copyInvite(team: Team) {
    if (!team.inviteCode) return;
    navigator.clipboard
      .writeText(`${window.location.origin}/student/teams?join=${team.inviteCode}`)
      .then(() => {
        setCopiedId(team.id);
        setTimeout(() => setCopiedId(null), 2000);
      });
  }

  const pendingInvites = teams.flatMap((t) =>
    t.members
      .filter((m) => m.status === "PENDING" && m.userId === t.members.find((x) => x.status === "OWNER")?.userId)
      .map(() => null)
  );

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Teams</h1>
          <p className="text-neutral-500">Form a team for team-based competitions and invite teammates.</p>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {showCreate ? "Cancel" : "Create team"}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {showCreate && (
        <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-5">
          <label htmlFor="team-name" className="block text-sm font-medium">
            Team name
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="team-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              className="flex-1 rounded-md border border-neutral-300 px-3 py-2"
              placeholder="e.g. Buea Robotics Crew"
            />
            <button
              onClick={create}
              disabled={busy || name.trim().length < 2}
              className="rounded-md bg-brand-600 px-4 py-2 text-white hover:bg-brand-700 disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-5">
        <label htmlFor="join-code" className="block text-sm font-medium">
          Join with an invite code
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="join-code"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 font-mono"
            placeholder="Paste code or link"
          />
          <button
            onClick={join}
            disabled={busy || !inviteCode.trim()}
            className="rounded-md border px-4 py-2 font-semibold hover:bg-neutral-50 disabled:opacity-50"
          >
            Join
          </button>
        </div>
      </div>

      {loading && <p className="mt-6 text-neutral-500">Loading teams…</p>}

      {!loading && teams.length === 0 && (
        <div className="mt-6 rounded-xl border p-8 text-center">
          <p className="font-medium">No teams yet.</p>
          <p className="mt-1 text-sm text-neutral-500">
            Create one, or join with a code a teammate shared with you.
          </p>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {teams.map((team) => (
          <div key={team.id} className="rounded-xl border border-neutral-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{team.name}</h2>
                {team.competition && (
                  <p className="text-sm text-neutral-500">For: {team.competition.title}</p>
                )}
              </div>
              {team.isOwner && team.inviteCode && (
                <button
                  onClick={() => copyInvite(team)}
                  className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-neutral-50"
                >
                  {copiedId === team.id ? "Copied!" : "Copy invite link"}
                </button>
              )}
            </div>
            <ul className="mt-3 space-y-1.5">
              {team.members.map((m) => (
                <li key={m.id} className="flex items-center justify-between text-sm">
                  <span>
                    {m.name}
                    {m.status === "OWNER" && (
                      <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">owner</span>
                    )}
                    {m.status === "PENDING" && (
                      <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">invited</span>
                    )}
                  </span>
                  {m.status === "PENDING" && !team.isOwner && m.email === undefined && (
                    <button
                      onClick={() => accept(team.id, m.id)}
                      disabled={busy}
                      className="rounded-md bg-brand-600 px-3 py-1 text-xs text-white hover:bg-brand-700"
                    >
                      Accept
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {/* pendingInvites intentionally unused placeholder for future invite inbox */}
      {pendingInvites.length === -1 && null}
    </div>
  );
}
