const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("sop_access_token");
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface Competition {
  id: string;
  title: string;
  organizer: string | null;
  description?: string | null;
  category: string[];
  eligibilityRawText: string | null;
  deadline: string | null;
  format: string;
  location?: string | null;
  cost: string | null;
  costAmount?: number | null;
  costCurrency?: string | null;
  difficulty: string | null;
  individualOrTeam?: string;
  countries: string[];
  educationLevels: string[];
  benefits: string[];
  stages?: string | null;
  requiredDocuments?: string | null;
  preparationResources?: string | null;
  editionYear?: number | null;
  officialUrl: string | null;
  applicationUrl: string | null;
  trustScore: number;
  trustStatus: string;
  lastVerifiedAt: string | null;
  source?: { url: string; organization: string | null; reliabilityScore: number } | null;
  status?: string;
  duplicateOfId?: string | null;
  aiConfidence?: number | null;
  rawPage?: { url: string; rawText: string | null } | null;
  reports?: { id: string; reason: string }[];
}

export type MatchLabel = "STARTER" | "STRONG_MATCH" | "STRETCH";

export interface MatchBreakdown {
  score: number;
  components: Record<string, number>;
  eligible: boolean;
  verdict: "ELIGIBLE" | "NOT_ELIGIBLE" | "UNCERTAIN";
  label: MatchLabel;
  explanations: string[];
  gaps: string[];
}

export interface Team {
  id: string;
  name: string;
  inviteCode?: string;
  competition?: { id: string; title: string } | null;
  isOwner: boolean;
  members: { id: string; userId: string; name: string; email?: string; status: string }[];
  createdAt: string;
}

export const api = {
  login: (email: string, password: string) =>
    apiFetch<{ accessToken: string; refreshToken: string; user: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (email: string, password: string, fullName: string, role?: string) =>
    apiFetch<{ accessToken: string; refreshToken: string; user: any }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, fullName, role }),
    }),
  feed: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch<{ items: Competition[]; total: number; page: number; pageSize: number }>(`/competitions${qs ? `?${qs}` : ""}`);
  },
  forYou: () => apiFetch<{ competition: Competition; match: MatchBreakdown }[]>("/competitions/for-you"),
  competition: (id: string) =>
    apiFetch<{ competition: Competition; match: MatchBreakdown | null; eligibility: { verdict: string; reasons: string[] } | null }>(
      `/competitions/${id}`
    ),
  saveApplication: (competitionId: string, status: string, extra?: { followed?: boolean; teamId?: string | null }) =>
    apiFetch("/applications", {
      method: "POST",
      body: JSON.stringify({ competitionId, status, ...extra }),
    }),
  saved: () => apiFetch<{ competition: Competition; status: string }[]>("/students/me/saved"),
  submitUrl: (url: string) =>
    apiFetch<{ message: string }>("/competitions/submit", { method: "POST", body: JSON.stringify({ url }) }),
  reportCompetition: (competitionId: string, reason: string, message?: string) =>
    apiFetch<{ id: string; message: string }>("/reports", {
      method: "POST",
      body: JSON.stringify({ competitionId, reason, message }),
    }),
  me: () => apiFetch<any>("/students/me"),
  updateProfile: (data: any) => apiFetch("/students/me", { method: "PATCH", body: JSON.stringify(data) }),

  // Questionnaire (doc §11)
  questionnaire: () => apiFetch<{ version: number; questions: any[] }>("/questionnaire"),
  myQuestionnaire: () => apiFetch<{ version: number | null; answers: any | null }>("/questionnaire/me"),
  submitQuestionnaire: (answers: Record<string, string | string[]>) =>
    apiFetch<{ signals: any; interests: string[] }>("/questionnaire/responses", {
      method: "POST",
      body: JSON.stringify({ answers }),
    }),

  // Applications (doc §21 statuses)
  applications: () => apiFetch<any[]>("/students/me/applications"),
  savedList: () => apiFetch<any[]>("/students/me/saved"),
  achievements: () => apiFetch<any[]>("/achievements/mine"),
  addAchievement: (data: any) => apiFetch("/achievements/mine", { method: "POST", body: JSON.stringify(data) }),
  deleteAchievement: (id: string) => apiFetch(`/achievements/mine/${id}`, { method: "DELETE" }),

  // Teams (doc §23)
  createTeam: (name: string, competitionId?: string | null) =>
    apiFetch<Team>("/teams", { method: "POST", body: JSON.stringify({ name, competitionId: competitionId ?? null }) }),
  myTeams: () => apiFetch<Team[]>("/teams/mine"),
  joinTeam: (inviteCode: string) => apiFetch<{ teamId: string }>(`/teams/join/${inviteCode}`, { method: "POST" }),
  acceptInvitation: (teamId: string, memberId: string) =>
    apiFetch(`/teams/${teamId}/members/${memberId}/accept`, { method: "POST" }),

  // Institution (doc §25/§26)
  institutionDashboard: () => apiFetch<any>("/institutions/me/dashboard"),
  institutionRegister: (data: any) =>
    apiFetch<any>("/institutions/register", { method: "POST", body: JSON.stringify(data) }),
  institutionRoster: () => apiFetch<any[]>("/institutions/me/roster"),
  institutionCoordinators: () => apiFetch<any[]>("/institutions/me/coordinators"),
  addCoordinator: (email: string, sectors: string[]) =>
    apiFetch("/institutions/me/coordinators", { method: "POST", body: JSON.stringify({ email, sectors }) }),
  removeCoordinator: (id: string) => apiFetch(`/institutions/me/coordinators/${id}`, { method: "DELETE" }),
  nominateStudents: (studentIds: string[], competitionId: string) =>
    apiFetch("/institutions/me/nominate", { method: "POST", body: JSON.stringify({ studentIds, competitionId }) }),
  coordinatorFeed: () => apiFetch<any>("/institutions/coordinator/me"),

  deleteAccount: () => apiFetch("/students/me", { method: "DELETE" }),
  chat: (message: string) =>
    apiFetch<{ reply: string; provider?: string }>("/assistant/chat", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),

  // Admin (worker + admin roles)
  reviewQueue: () => apiFetch<Competition[]>("/admin/review-queue"),
  decide: (id: string, decision: "PUBLISH" | "REJECT" | "REQUEST_CHANGES" | "ARCHIVE", note?: string) =>
    apiFetch(`/admin/competitions/${id}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision, note }),
    }),
  editCompetition: (id: string, fields: Record<string, unknown>, reason: string) =>
    apiFetch(`/admin/competitions/${id}`, { method: "PATCH", body: JSON.stringify({ ...fields, reason }) }),
  reprocess: (id: string) => apiFetch(`/admin/competitions/${id}/reprocess`, { method: "POST" }),
  reports: () => apiFetch<any[]>("/admin/reports"),
  resolveReport: (id: string, action: string, note?: string) =>
    apiFetch(`/admin/reports/${id}/resolve`, { method: "POST", body: JSON.stringify({ action, note }) }),
  sources: () => apiFetch<any[]>("/admin/sources"),
  aiRuns: () => apiFetch<any[]>("/admin/ai-runs"),
  auditLog: (params?: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch<any[]>(`/admin/audit-log${qs ? `?${qs}` : ""}`);
  },
  stats: () => apiFetch<any>("/admin/stats"),
  users: (role?: string) => apiFetch<any[]>(`/admin/users${role ? `?role=${role}` : ""}`),

  // Notifications
  notifications: () => apiFetch<any[]>("/notifications"),
  markNotificationRead: (id: string) => apiFetch(`/notifications/${id}/read`, { method: "POST" }),
  markAllNotificationsRead: () => apiFetch("/notifications/read-all", { method: "POST" }),
  updateNotificationPreferences: (preferences: any) =>
    apiFetch("/notifications/preferences", { method: "PATCH", body: JSON.stringify(preferences) }),
};
