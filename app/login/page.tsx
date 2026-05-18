"use client";

import { PageHeader } from "@/components/PageHeader";
import { roleBadgeClass, roleDescriptions, roleLabels, useAuth } from "@/lib/auth";
import { areaThemes } from "@/lib/theme";

export default function LoginPage() {
  const { currentUser, users, loginAs, logout } = useAuth();
  const activeUsers = users.filter((user) => user.active);

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
