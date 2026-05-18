"use client";

import { useMemo, useState } from "react";
import { AccessDenied } from "@/components/AccessDenied";
import { PageHeader } from "@/components/PageHeader";
import { roleBadgeClass, roleLabels, type AppUser, type UserRole, useAuth } from "@/lib/auth";
import { useCurrentSchoolData } from "@/lib/currentSchool";
import { areaThemes } from "@/lib/theme";

const roles: UserRole[] = ["platform_admin", "school_admin", "teacher", "subject_lead", "viewer"];

export default function UserManagementPage() {
  const { currentUser, users, createUser, updateUser, deactivateUser, canManageUsers } = useAuth();
  const { subjects } = useCurrentSchoolData();
  const availableRoles = currentUser?.role === "platform_admin" ? roles : roles.filter((role) => role !== "platform_admin");
  const [draft, setDraft] = useState<Omit<AppUser, "id">>({
    name: "",
    email: "",
    role: "viewer",
    schoolId: currentUser?.schoolId ?? "school_caerleon",
    assignedSubjects: [],
    active: true
  });

  const visibleUsers = useMemo(() => {
    if (currentUser?.role === "platform_admin") return users;
    return users.filter((user) => user.schoolId === currentUser?.schoolId && user.role !== "platform_admin");
  }, [currentUser, users]);

  if (!canManageUsers) {
    return <AccessDenied title="User management restricted" message="Only platform admins and school admins can manage staff users." />;
  }

  function toggleDraftSubject(subject: string) {
    setDraft((current) => ({
      ...current,
      assignedSubjects: current.assignedSubjects.includes(subject) ? current.assignedSubjects.filter((item) => item !== subject) : [...current.assignedSubjects, subject]
    }));
  }

  function addUser() {
    if (!draft.name.trim() || !draft.email.trim()) return;
    const role = availableRoles.includes(draft.role) ? draft.role : "viewer";
    createUser({ ...draft, role, schoolId: currentUser?.role === "platform_admin" ? draft.schoolId : (currentUser?.schoolId ?? "school_caerleon"), name: draft.name.trim(), email: draft.email.trim() });
    setDraft({ name: "", email: "", role: "viewer", schoolId: currentUser?.schoolId ?? "school_caerleon", assignedSubjects: [], active: true });
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="User Management"
        eyebrow="Staff access"
        description="Manage staff profiles, roles, subject assignments and active status. This structure is ready for live sign-in."
        accent={areaThemes.overview.accent}
      />

      <article className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 shadow-sm">
        The role structure matches the planned Supabase setup. Teachers can add curriculum mapping entries; viewers remain read-only.
      </article>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">Create user</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <LabelledInput label="Name" value={draft.name} onChange={(value) => setDraft((current) => ({ ...current, name: value }))} />
          <LabelledInput label="Email" value={draft.email} onChange={(value) => setDraft((current) => ({ ...current, email: value }))} />
          <label>
            <span className="mb-1 block text-sm font-semibold text-gray-700">Role</span>
            <select className="focus-ring w-full rounded-md border border-gray-300 bg-white px-3 py-2" value={draft.role} onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value as UserRole }))}>
              {availableRoles.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm font-semibold text-gray-700">
            <input type="checkbox" checked={draft.active} onChange={(event) => setDraft((current) => ({ ...current, active: event.target.checked }))} />
            Active
          </label>
        </div>
        <SubjectChecks subjects={subjects} selected={draft.assignedSubjects} onToggle={toggleDraftSubject} />
        <button className="focus-ring btn btn-primary mt-4" type="button" onClick={addUser}>
          Create user
        </button>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">Users</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="py-3 pr-3 font-bold">Name</th>
                <th className="py-3 pr-3 font-bold">Email</th>
                <th className="py-3 pr-3 font-bold">Role</th>
                <th className="py-3 pr-3 font-bold">Assigned subjects</th>
                <th className="py-3 pr-3 font-bold">Status</th>
                <th className="py-3 pr-3 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((user) => (
                <tr key={user.id} className="border-b border-gray-100 align-top">
                  <td className="py-3 pr-3">
                    <input className="focus-ring w-full rounded-md border border-gray-300 px-3 py-2 font-semibold" value={user.name} onChange={(event) => updateUser(user.id, { name: event.target.value })} />
                  </td>
                  <td className="py-3 pr-3">
                    <input className="focus-ring w-full rounded-md border border-gray-300 px-3 py-2" value={user.email} onChange={(event) => updateUser(user.id, { email: event.target.value })} />
                  </td>
                  <td className="py-3 pr-3">
                    <select className="focus-ring w-full rounded-md border border-gray-300 bg-white px-3 py-2" value={user.role} onChange={(event) => updateUser(user.id, { role: event.target.value as UserRole })}>
                      {availableRoles.map((role) => (
                        <option key={role} value={role}>
                          {roleLabels[role]}
                        </option>
                      ))}
                    </select>
                    <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold ${roleBadgeClass(user.role)}`}>{roleLabels[user.role]}</span>
                  </td>
                  <td className="py-3 pr-3">
                    <SubjectChecks subjects={subjects} selected={user.assignedSubjects} compact onToggle={(subject) => updateUser(user.id, { assignedSubjects: toggleSubject(user.assignedSubjects, subject) })} />
                  </td>
                  <td className="py-3 pr-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${user.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>{user.active ? "Active" : "Inactive"}</span>
                  </td>
                  <td className="py-3 pr-3">
                    <button className="focus-ring btn btn-muted text-xs" type="button" onClick={() => (user.active ? deactivateUser(user.id) : updateUser(user.id, { active: true }))}>
                      {user.active ? "Deactivate" : "Reactivate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

function LabelledInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="mb-1 block text-sm font-semibold text-gray-700">{label}</span>
      <input className="focus-ring w-full rounded-md border border-gray-300 px-3 py-2" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SubjectChecks({ subjects, selected, onToggle, compact = false }: { subjects: string[]; selected: string[]; onToggle: (subject: string) => void; compact?: boolean }) {
  return (
    <div className={compact ? "flex max-w-md flex-wrap gap-2" : "mt-4 flex flex-wrap gap-2"}>
      {subjects.map((subject) => (
        <label key={subject} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${selected.includes(subject) ? "border-[#741B47] bg-[#f7edf3] text-[#571435]" : "border-gray-200 bg-white text-gray-600"}`}>
          <input type="checkbox" checked={selected.includes(subject)} onChange={() => onToggle(subject)} />
          {subject}
        </label>
      ))}
    </div>
  );
}

function toggleSubject(subjects: string[], subject: string) {
  return subjects.includes(subject) ? subjects.filter((item) => item !== subject) : [...subjects, subject];
}
