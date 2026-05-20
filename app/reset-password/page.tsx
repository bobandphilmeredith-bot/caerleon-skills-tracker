"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { areaThemes } from "@/lib/theme";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const expiredMessage = "Password reset session not found or expired. Please request a new password reset link.";

  useEffect(() => {
    async function prepareRecoverySession() {
      if (!supabase) {
        setError("Supabase is not configured.");
        return;
      }

      const query = new URLSearchParams(window.location.search);
      const code = query.get("code");
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        window.history.replaceState(null, "", window.location.pathname);

        if (exchangeError) {
          setError(expiredMessage);
          return;
        }
      } else if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        window.history.replaceState(null, "", window.location.pathname);

        if (sessionError) {
          setError(expiredMessage);
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setError(expiredMessage);
        return;
      }

      setSessionReady(true);
    }

    prepareRecoverySession();
  }, []);

  async function updatePassword() {
    setError("");
    setMessage("");

    if (!newPassword) {
      setError("Enter a new password.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);

    if (updateError) {
      setError(updateError.message || "Password could not be updated.");
      return;
    }

    setMessage("Password updated. You can now sign in.");
    setNewPassword("");
    setConfirmPassword("");
    window.setTimeout(() => router.push("/login?password_reset=success"), 1800);
  }

  return (
    <section className="space-y-6">
      <PageHeader title="Reset password" eyebrow="Staff access" description="Set a new password for your staff account." accent={areaThemes.overview.accent} />

      {!isSupabaseConfigured ? (
        <article className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm font-semibold leading-6 text-red-800 shadow-sm">
          Supabase is not configured. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
        </article>
      ) : null}

      <article className="max-w-xl rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <label>
          <span className="mb-1 block text-sm font-semibold text-gray-700">New password</span>
          <input
            className="focus-ring w-full rounded-md border border-gray-300 px-3 py-2"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            autoComplete="new-password"
          />
        </label>
        <label className="mt-4 block">
          <span className="mb-1 block text-sm font-semibold text-gray-700">Confirm password</span>
          <input
            className="focus-ring w-full rounded-md border border-gray-300 px-3 py-2"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
          />
        </label>

        {error ? <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p> : null}
        {message ? <p className="mt-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-800">{message}</p> : null}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button className="focus-ring btn btn-primary" type="button" onClick={updatePassword} disabled={!sessionReady || saving}>
            {saving ? "Updating..." : "Update password"}
          </button>
          <Link className="focus-ring btn btn-muted" href="/login">
            Back to sign in
          </Link>
        </div>
      </article>
    </section>
  );
}
