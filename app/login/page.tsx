"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { roleBadgeClass, roleDescriptions, roleLabels, useAuth } from "@/lib/auth";
import { areaThemes } from "@/lib/theme";

export default function LoginPage() {
  const { accessDeniedMessage, authLoading, currentUser, isDemoMode, isSupabaseConfigured, signInWithPassword, resetPassword, users, loginAs, logout } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const activeUsers = users.filter((user) => user.active);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("password_reset") === "success") {
      setMessage("Password updated. You can now sign in.");
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  async function submitPasswordSignIn() {
    setMessage("");
    if (!email.trim()) {
      setMessage("Enter your school email address.");
      return;
    }
    if (!password) {
      setMessage("Enter your password.");
      return;
    }
    setSending(true);
    const error = await signInWithPassword(email.trim(), password);
    setSending(false);
    if (error) {
      setMessage(error);
      return;
    }

    const next = safeNextPath(new URLSearchParams(window.location.search).get("next"));
    window.location.href = next ?? "/";
  }

  async function submitPasswordReset() {
    setMessage("");
    if (!email.trim()) {
      setMessage("Enter your school email address first.");
      return;
    }
    setSending(true);
    const error = await resetPassword(email.trim());
    setSending(false);
    setMessage(error || "Password reset email sent.");
  }

  if (!isDemoMode) {
    return (
      <section className="space-y-6">
        <PageHeader title="Staff sign in" eyebrow="Staff access" description="Use your school email address and password." accent={areaThemes.overview.accent} />

        {!isSupabaseConfigured ? (
          <article className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm font-semibold leading-6 text-red-800 shadow-sm">
            Supabase is not configured. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the environment before using staff sign-in.
          </article>
        ) : null}

        {accessDeniedMessage ? <article className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm font-semibold leading-6 text-amber-900 shadow-sm">{accessDeniedMessage}</article> : null}

        {currentUser ? (
          <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-gray-500">Signed in as</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-950">{currentUser.name}</h2>
                <p className="mt-1 text-sm font-semibold text-gray-600">{currentUser.email}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${roleBadgeClass(currentUser.role)}`}>{roleLabels[currentUser.role]}</span>
            </div>
            <button className="focus-ring btn btn-muted mt-4" type="button" onClick={logout}>
              Sign out
            </button>
          </article>
        ) : (
          <article className="max-w-xl rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <label>
              <span className="mb-1 block text-sm font-semibold text-gray-700">School email address</span>
              <input
                className="focus-ring w-full rounded-md border border-gray-300 px-3 py-2"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@school.org"
                autoComplete="email"
              />
            </label>
            <label className="mt-4 block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">Password</span>
              <input
                className="focus-ring w-full rounded-md border border-gray-300 px-3 py-2"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </label>
            <p className="mt-3 text-sm leading-6 text-gray-600">Staff should use their school email address. Roles are managed by the school administrator and cannot be chosen on this page.</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button className="focus-ring btn btn-primary" type="button" onClick={submitPasswordSignIn} disabled={!isSupabaseConfigured || sending || authLoading}>
                {sending ? "Signing in..." : "Sign in"}
              </button>
              <button className="focus-ring text-sm font-bold text-[#741B47] underline-offset-4 hover:underline" type="button" onClick={submitPasswordReset} disabled={!isSupabaseConfigured || sending}>
                Forgot password?
              </button>
            </div>
            {message ? <p className="mt-3 text-sm font-semibold text-gray-700">{message}</p> : null}
          </article>
        )}
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Sign In"
        eyebrow="Staff access"
        description="Choose a staff profile to use the app with the correct access level."
        accent={areaThemes.overview.accent}
      />

      <article className="rounded-lg border border-gray-200 bg-white p-5 text-sm leading-6 text-gray-700 shadow-sm">
        Staff access is structured for the live Supabase setup. These profiles let the app be used while the live sign-in connection is prepared.
      </article>

      {currentUser ? (
        <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-gray-500">Signed in as</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-950">{currentUser.name}</h2>
              <p className="mt-1 text-sm font-semibold text-gray-600">{currentUser.email}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${roleBadgeClass(currentUser.role)}`}>{roleLabels[currentUser.role]}</span>
          </div>
          <button className="focus-ring btn btn-muted mt-4" type="button" onClick={logout}>
            Sign out
          </button>
        </article>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {activeUsers.map((user) => (
          <article key={user.id} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-950">{user.name}</h2>
                <p className="mt-1 text-sm font-semibold text-gray-600">{user.email}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${roleBadgeClass(user.role)}`}>{roleLabels[user.role]}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-gray-700">{roleDescriptions[user.role]}</p>
            {user.assignedSubjects.length ? <p className="mt-2 text-xs font-bold text-gray-500">Subjects: {user.assignedSubjects.join(", ")}</p> : null}
            <button className="focus-ring btn btn-primary mt-4" type="button" onClick={() => loginAs(user.id)}>
              Continue as this user
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function safeNextPath(next: string | null) {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}
