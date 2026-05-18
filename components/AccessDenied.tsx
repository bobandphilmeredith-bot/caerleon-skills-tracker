"use client";

import Link from "next/link";
import { useAuth, roleLabels } from "@/lib/auth";

export function AccessDenied({ title = "Access restricted", message = "Your current role cannot open this area." }: { title?: string; message?: string }) {
  const { currentUser } = useAuth();

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#741B47]">Role-based access</p>
      <h1 className="mt-2 text-2xl font-bold text-gray-950">{title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-700">{message}</p>
      {currentUser ? (
        <p className="mt-3 text-sm font-semibold text-gray-600">
          Current role: <span className="text-gray-950">{roleLabels[currentUser.role]}</span>
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap gap-3">
        <Link className="focus-ring btn btn-primary" href="/login">
          Switch user
        </Link>
        <Link className="focus-ring btn btn-muted" href="/">
          Return to dashboard
        </Link>
      </div>
    </section>
  );
}
