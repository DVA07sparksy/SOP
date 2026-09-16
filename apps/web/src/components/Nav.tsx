"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { isLoggedIn, getAccessToken, clearSession } from "@/lib/auth";
import { api } from "@/lib/api";

export function Nav() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoggedIn(isLoggedIn());
  }, []);

  // Close the mobile menu on Escape and outside click.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  async function logout() {
    try {
      await apiFetchLogout();
    } finally {
      clearSession();
      setLoggedIn(false);
      setOpen(false);
      window.location.href = "/";
    }
  }

  async function apiFetchLogout() {
    try {
      await apiFetchRaw("/auth/logout", { method: "POST", body: JSON.stringify({ all: true }) });
    } catch {
      // Server-side revoke failed — local logout still proceeds.
    }
  }

  async function apiFetchRaw(path: string, init: RequestInit) {
    const token = getAccessToken();
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!res.ok) throw new Error(String(res.status));
    return res.json().catch(() => ({}));
  }

  const links = (
    <>
      <Link href="/competitions" className="hover:text-brand-600" onClick={() => setOpen(false)}>
        Browse
      </Link>
      <Link href="/search" className="hover:text-brand-600" onClick={() => setOpen(false)}>
        Search
      </Link>
      {loggedIn && (
        <Link href="/for-you" className="hover:text-brand-600" onClick={() => setOpen(false)}>
          For You
        </Link>
      )}
      {loggedIn && (
        <>
          <Link href="/student/saved" className="hover:text-brand-600" onClick={() => setOpen(false)}>
            Saved
          </Link>
          <Link href="/student/applications" className="hover:text-brand-600" onClick={() => setOpen(false)}>
            Tracker
          </Link>
          <Link href="/student/teams" className="hover:text-brand-600" onClick={() => setOpen(false)}>
            Teams
          </Link>
          <Link href="/student/achievements" className="hover:text-brand-600" onClick={() => setOpen(false)}>
            Achievements
          </Link>
          <Link href="/notifications" className="hover:text-brand-600" onClick={() => setOpen(false)}>
            Notifications
          </Link>
          <Link href="/student/profile" className="hover:text-brand-600" onClick={() => setOpen(false)}>
            Profile
          </Link>
        </>
      )}
      <Link href="/faq" className="hover:text-brand-600" onClick={() => setOpen(false)}>
        FAQ
      </Link>
      <Link href="/contact" className="hover:text-brand-600" onClick={() => setOpen(false)}>
        Contact
      </Link>
      {loggedIn && (
        <>
          <Link href="/institution" className="hover:text-brand-600" onClick={() => setOpen(false)}>
            Institution
          </Link>
          <Link href="/coordinator" className="hover:text-brand-600" onClick={() => setOpen(false)}>
            Coordinator
          </Link>
          <Link href="/worker" className="hover:text-brand-600" onClick={() => setOpen(false)}>
            Reviewer
          </Link>
          <Link href="/admin" className="hover:text-brand-600" onClick={() => setOpen(false)}>
            Admin
          </Link>
        </>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white dark:bg-neutral-900">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3">
        <Link href="/" className="text-lg font-bold text-brand-700" aria-label="ScholarTrack home">
          Scholar<span className="text-brand-400">Track</span>
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Main" className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-600">
          {links}
          {loggedIn ? (
            <button
              onClick={logout}
              className="rounded-md bg-neutral-100 px-3 py-1.5 hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              Log out
            </button>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-brand-600 px-3 py-1.5 text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              Log in
            </Link>
          )}
        </nav>

        {/* Mobile menu button */}
        <button
          className="md:hidden rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div id="mobile-menu" ref={menuRef} className="md:hidden border-t px-4 py-3 space-y-1">
          <nav aria-label="Mobile" className="flex flex-col text-sm font-medium">
            {links}
            {loggedIn ? (
              <button
                onClick={logout}
                className="mt-2 rounded-md bg-neutral-100 px-3 py-2 text-left hover:bg-neutral-200"
              >
                Log out
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="mt-2 rounded-md bg-brand-600 px-3 py-2 text-center text-white hover:bg-brand-700"
              >
                Log in
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
