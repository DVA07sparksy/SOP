"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { storeSession } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = mode === "login" ? await api.login(email, password) : await api.register(email, password, fullName);
      storeSession(result);
      router.push("/for-you");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-2xl font-bold text-neutral-900">
        {mode === "login" ? "Log in" : "Create account"}
      </h1>
      <form onSubmit={submit} className="space-y-4" aria-describedby={error ? "login-error" : undefined}>
        {mode === "register" && (
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium mb-1">Full name</label>
            <input
              id="fullName"
              name="fullName"
              required
              autoComplete="name"
              maxLength={120}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2"
            />
          </div>
        )}
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
          <input
            id="email"
            name="email"
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">Password</label>
          <div className="relative">
            <input
              id="password"
              name="password"
              required
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 pr-16"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 px-3 text-sm text-blue-700 underline"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {mode === "register" && (
            <p className="mt-1 text-xs text-neutral-500">At least 8 characters, with a letter and a number.</p>
          )}
        </div>
        {error && (
          <p id="login-error" role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <button
          disabled={loading}
          className="w-full rounded-md bg-brand-600 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
        </button>
      </form>
      <button
        onClick={() => {
          setMode(mode === "login" ? "register" : "login");
          setError(null);
        }}
        className="mt-4 text-sm text-brand-600 underline"
      >
        {mode === "login" ? "Need an account? Register" : "Already have an account? Log in"}
      </button>
      <p className="mt-6 text-xs text-neutral-400">
        Demo environment only: seeded login student@example.com / password123. Remove before launch.
      </p>
    </div>
  );
}
