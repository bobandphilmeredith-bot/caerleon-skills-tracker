"use client";

import { useEffect, useState } from "react";
import { areaThemes } from "@/lib/theme";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [nextPath, setNextPath] = useState("/");

  useEffect(() => {
    setNextPath(`${window.location.pathname}${window.location.search}`);
  }, []);

  function signInAgain() {
    const loginUrl = new URL("/login", window.location.origin);
    loginUrl.searchParams.set("next", nextPath);
    loginUrl.searchParams.set("session", "expired");
    window.location.href = loginUrl.toString();
  }

  return (
    <section className="mx-auto max-w-2xl space-y-5 py-12">
      <article className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.14em]" style={{ color: areaThemes.overview.text }}>
          Session check
        </p>
        <h1 className="mt-3 text-3xl font-bold text-gray-950">We could not open this page</h1>
        <p className="mt-3 text-base leading-7 text-gray-600">
          Your sign-in may have expired. Sign in again and the app will bring you back to the page you were trying to open.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button className="focus-ring btn btn-primary" type="button" onClick={signInAgain}>
            Sign in again
          </button>
          <button className="focus-ring btn btn-muted" type="button" onClick={reset}>
            Try again
          </button>
        </div>
      </article>
    </section>
  );
}
