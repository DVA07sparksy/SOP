"use client";

export function storeSession(tokens: { accessToken: string; refreshToken: string }) {
  window.localStorage.setItem("sop_access_token", tokens.accessToken);
  window.localStorage.setItem("sop_refresh_token", tokens.refreshToken);
}

export function clearSession() {
  window.localStorage.removeItem("sop_access_token");
  window.localStorage.removeItem("sop_refresh_token");
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("sop_access_token");
}

export function isLoggedIn(): boolean {
  return Boolean(getAccessToken());
}
