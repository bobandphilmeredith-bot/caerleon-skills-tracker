"use client";

import { useEffect, useMemo, useState } from "react";
import { AccessDenied } from "@/components/AccessDenied";
import { PageHeader } from "@/components/PageHeader";
import { roleBadgeClass, roleLabels, type AppUser, type UserRole, useAuth } from "@/lib/auth";
import { useCurrentSchool } from "@/lib/currentSchool";
import { supabase } from "@/lib/supabaseClient";
import { areaThemes } from "@/lib/theme";

const roles: UserRole[] = ["platform_admin", "school_admin", "teacher", "subject_lead", "viewer"];

type ManagedUser = {
  id: string;
  school_id: string;
  email: string;
  display_name: string;
  role: UserRole;
  assigned_subjects: string[];
  active: boolean;
  created_at: string | null;
  last_sign_in_at: string | null;
};

type ManagedSchool = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
};

type AccessDebug = {
  authenticated_user_id?: string | null;
  authenticated_email?: string | null;
  staff_profile_found?: boolean;
  staff_profile_role?: string | null;
  staff_profile_school_id?: string | null;
  staff_profile_active?: boolean | null;
  target_school_id?: string | null;
  reason?: string;
};

export default function UserManagementPage() {
  const { currentUser, users, createUser, updateUser, deactivateUser, canManageUsers, isDemoMode } = useAuth();
  const { data, schools } = useCurrentSchool();
  const { subjects } = data;
  const availableRoles = currentUser?.role === "platform_admin" ? roles : roles.filter((role) => role !== "platform_admin");
  const [draft, setDraft] = useState<Omit<AppUser, "id">>({
    name: "",
    email: "",
    role: "viewer",
    schoolId: currentUser?.schoolId ?? (isDemoMode ? "school_caerleon" : ""),
    assignedSubjects: [],
    active: true
  });
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [selectedSchoolId, setSelectedSchoolId] = useState(isDemoMode ? (currentUser?.schoolId ?? "school_caerleon") : "");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [csv, setCsv] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<{ row: number; email: string; success: boolean; message: string }[]>([]);
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [managedSchools, setManagedSchools] = useState<ManagedSchool[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [rowMessage, setRowMessage] = useState<Record<string, string>>({});
  const [savingUserId, setSavingUserId] = useState("");
  const [createDebug, setCreateDebug] = useState<AccessDebug | null>(null);
  const [schoolDebug, setSchoolDebug] = useState<AccessDebug | null>(null);

  const schoolOptions = isDemoMode ? schools.map((school) => ({ id: school.id, name: school.name, slug: school.slug, active: school.active })) : managedSchools;
  const targetSchoolId = currentUser?.role === "platform_admin" ? selectedSchoolId : (currentUser?.schoolId ?? "");
  const hasLiveSupabaseSchool = isDemoMode || Boolean(targetSchoolId && !targetSchoolId.startsWith("school_"));

  const visibleUsers = useMemo(() => {
    if (currentUser?.role === "platform_admin") return users;
    return users.filter((user) => user.schoolId === currentUser?.schoolId && user.role !== "platform_admin");
  }, [currentUser, users]);

  useEffect(() => {
    if (isDemoMode || !canManageUsers) return;
    void loadLiveData();
  }, [isDemoMode, canManageUsers]);

  useEffect(() => {
    if (!schoolOptions.length) return;

    if (isDemoMode) {
      if (!schoolOptions.some((school) => school.id === selectedSchoolId)) {
        setSelectedSchoolId(currentUser?.schoolId ?? schoolOptions[0].id);
      }
      return;
    }

    const currentUserSchoolIsReal = currentUser?.schoolId && schoolOptions.some((school) => school.id === currentUser.schoolId);
    if (!selectedSchoolId || selectedSchoolId.startsWith("school_") || !schoolOptions.some((school) => school.id === selectedSchoolId)) {
      setSelectedSchoolId(currentUserSchoolIsReal ? currentUser.schoolId : schoolOptions[0].id);
    }
  }, [currentUser?.schoolId, isDemoMode, schoolOptions, selectedSchoolId]);

  if (!canManageUsers) {
    return <AccessDenied title="User management restricted" message="Only platform admins and school admins can manage staff users." />;
  }

  async function loadLiveData() {
    setLoadingUsers(true);
    setNotice("");
    setCreateDebug(null);
    setSchoolDebug(null);
    const token = await getAccessToken();
    if (!token) {
      setNotice("You must be signed in before managing users.");
      setLoadingUsers(false);
      return;
    }

    const [usersResponse, schoolsResponse] = await Promise.all([
      fetch("/api/admin/users/list", { headers: { authorization: `Bearer ${token}` } }),
      fetch("/api/admin/schools/list", { headers: { authorization: `Bearer ${token}` } })
    ]);
    const usersResult = await usersResponse.json();
    const schoolsResult = await schoolsResponse.json();

    if (!usersResponse.ok) setNotice(usersResult.error ?? "Could not load users.");
    else setManagedUsers(usersResult.users ?? []);

    if (schoolsResponse.ok) {
      const nextSchools = schoolsResult.schools ?? [];
      setManagedSchools(nextSchools);
      if (!nextSchools.length) {
        setSchoolDebug({
          authenticated_user_id: currentUser?.id ?? null,
          authenticated_email: currentUser?.email ?? null,
          staff_profile_found: Boolean(currentUser),
          staff_profile_role: currentUser?.role ?? null,
          staff_profile_school_id: currentUser?.schoolId ?? null,
          staff_profile_active: currentUser?.active ?? null,
          reason: "The schools endpoint returned no active Supabase schools."
        });
      }
    } else {
      setNotice(schoolsResult.error ?? "Could not load schools.");
      setSchoolDebug(schoolsResult.debug ?? { reason: schoolsResult.error ?? "Could not load schools." });
    }
    setLoadingUsers(false);
  }

  function toggleDraftSubject(subject: string) {
    setDraft((current) => ({
      ...current,
      assignedSubjects: toggleSubject(current.assignedSubjects, subject)
    }));
  }

  async function addUser() {
    if (!draft.name.trim() || !draft.email.trim()) return;
    const role = availableRoles.includes(draft.role) ? draft.role : "viewer";
    if (isDemoMode) {
      createUser({ ...draft, role, schoolId: currentUser?.role === "platform_admin" ? draft.schoolId : (currentUser?.schoolId ?? "school_caerleon"), name: draft.name.trim(), email: draft.email.trim() });
      setDraft({ name: "", email: "", role: "viewer", schoolId: currentUser?.schoolId ?? "school_caerleon", assignedSubjects: [], active: true });
      return;
    }

    setSaving(true);
    setNotice("");
    setCreateDebug(null);
    if (!hasLiveSupabaseSchool) {
      setSaving(false);
      setNotice("Choose a Supabase school before creating a user.");
      setCreateDebug({
        authenticated_user_id: currentUser?.id ?? null,
        authenticated_email: currentUser?.email ?? null,
        staff_profile_found: Boolean(currentUser),
        staff_profile_role: currentUser?.role ?? null,
        staff_profile_school_id: currentUser?.schoolId ?? null,
        staff_profile_active: currentUser?.active ?? null,
        target_school_id: targetSchoolId || null,
        reason: "The page did not have a real Supabase public.schools.id UUID selected."
      });
      return;
    }
    const token = await getAccessToken();
    if (!token) {
      setSaving(false);
      setNotice("You must be signed in before creating users.");
      return;
    }
    const response = await fetch("/api/admin/users/create", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        display_name: draft.name.trim(),
        email: draft.email.trim(),
        password: temporaryPassword,
        role,
        assigned_subjects: draft.assignedSubjects,
        active: draft.active,
        school_id: targetSchoolId
      })
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) {
      setNotice(result.error ?? "Could not create user.");
      setCreateDebug(result.debug ?? null);
      return;
    }
    setNotice(result.message ?? "User created.");
    setDraft({ name: "", email: "", role: "viewer", schoolId: currentUser?.schoolId ?? (isDemoMode ? "school_caerleon" : ""), assignedSubjects: [], active: true });
    setTemporaryPassword("");
    await loadLiveData();
  }

  async function saveLiveUser(user: ManagedUser) {
    setSavingUserId(user.id);
    setRowMessage((current) => ({ ...current, [user.id]: "" }));
    const token = await getAccessToken();
    if (!token) {
      setSavingUserId("");
      setRowMessage((current) => ({ ...current, [user.id]: "You must be signed in." }));
      return;
    }

    const response = await fetch("/api/admin/users/update", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        id: user.id,
        display_name: user.display_name,
        email: user.email,
        role: user.role,
        assigned_subjects: user.assigned_subjects,
        active: user.active,
        school_id: user.school_id
      })
    });
    const result = await response.json();
    setSavingUserId("");
    setRowMessage((current) => ({ ...current, [user.id]: response.ok ? "Saved." : result.error ?? "Could not save user." }));
    if (response.ok) await loadLiveData();
  }

  function updateLiveUser(userId: string, patch: Partial<ManagedUser>) {
    setManagedUsers((current) => current.map((user) => (user.id === userId ? { ...user, ...patch } : user)));
  }

  async function uploadCsv() {
    setUploading(true);
    setNotice("");
    setUploadResults([]);
    if (!hasLiveSupabaseSchool) {
      setUploading(false);
      setNotice("Choose a Supabase school before uploading users.");
      return;
    }
    const token = await getAccessToken();
    if (!token) {
      setUploading(false);
      setNotice("You must be signed in before uploading users.");
      return;
    }
    const response = await fetch("/api/admin/users/bulk-upload", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        csv,
        school_id: targetSchoolId
      })
    });
    const result = await response.json();
    setUploading(false);
    if (!response.ok) {
      setNotice(result.error ?? "Could not upload users.");
      return;
    }
    setUploadResults(result.results ?? []);
    await loadLiveData();
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="User Management"
        eyebrow="Staff access"
        description="Manage staff profiles, roles, subject assignments and active status."
        accent={areaThemes.overview.accent}
      />

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">Create user</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <LabelledInput label="Name" value={draft.name} onChange={(value) => setDraft((current) => ({ ...current, name: value }))} />
          <LabelledInput label="Email" value={draft.email} onChange={(value) => setDraft((current) => ({ ...current, email: value }))} />
          <LabelledInput label="Temporary password" value={temporaryPassword} type="password" onChange={setTemporaryPassword} />
          {currentUser?.role === "platform_admin" ? (
            <label>
              <span className="mb-1 block text-sm font-semibold text-gray-700">School</span>
              <select className="focus-ring w-full rounded-md border border-gray-300 bg-white px-3 py-2" value={selectedSchoolId} onChange={(event) => setSelectedSchoolId(event.target.value)}>
                {!schoolOptions.length ? <option value="">Loading Supabase schools...</option> : null}
                {schoolOptions.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <RoleSelect value={draft.role} roles={availableRoles} onChange={(role) => setDraft((current) => ({ ...current, role }))} />
          <label className="flex items-end gap-2 pb-2 text-sm font-semibold text-gray-700">
            <input type="checkbox" checked={draft.active} onChange={(event) => setDraft((current) => ({ ...current, active: event.target.checked }))} />
            Active
          </label>
        </div>
        <SubjectChecks subjects={subjects} selected={draft.assignedSubjects} onToggle={toggleDraftSubject} />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button className="focus-ring btn btn-primary" type="button" onClick={addUser} disabled={saving || !hasLiveSupabaseSchool}>
            {saving ? "Creating..." : "Create user"}
          </button>
          {notice ? <span className="text-sm font-semibold text-gray-700">{notice}</span> : null}
        </div>
        {!isDemoMode && !hasLiveSupabaseSchool ? (
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">
            A real Supabase school must be loaded before creating users.
          </p>
        ) : null}
        {schoolDebug ? <AccessDebugPanel title="School loading debug" debug={schoolDebug} /> : null}
        {createDebug ? <AccessDebugPanel debug={createDebug} /> : null}
      </section>

      {!isDemoMode ? (
        <>
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-gray-900">Staff users</h2>
              <button className="focus-ring btn btn-muted px-3 py-2 text-sm" type="button" onClick={loadLiveData} disabled={loadingUsers}>
                {loadingUsers ? "Refreshing..." : "Refresh"}
              </button>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="py-3 pr-3 font-bold">Name</th>
                    <th className="py-3 pr-3 font-bold">Email</th>
                    <th className="py-3 pr-3 font-bold">Role</th>
                    <th className="py-3 pr-3 font-bold">Assigned subjects</th>
                    <th className="py-3 pr-3 font-bold">Status</th>
                    <th className="py-3 pr-3 font-bold">Created</th>
                    <th className="py-3 pr-3 font-bold">Last login</th>
                    <th className="py-3 pr-3 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {managedUsers.map((user) => {
                    const lockedPlatformAdmin = currentUser?.role !== "platform_admin" && user.role === "platform_admin";
                    const roleChoices = currentUser?.role === "platform_admin" ? roles : roles.filter((role) => role !== "platform_admin");
                    return (
                      <tr key={user.id} className="border-b border-gray-100 align-top">
                        <td className="py-3 pr-3">
                          <input className="focus-ring w-full rounded-md border border-gray-300 px-3 py-2 font-semibold" value={user.display_name} disabled={lockedPlatformAdmin} onChange={(event) => updateLiveUser(user.id, { display_name: event.target.value })} />
                        </td>
                        <td className="py-3 pr-3">
                          <input className="focus-ring w-full rounded-md border border-gray-300 px-3 py-2" value={user.email} disabled={lockedPlatformAdmin} onChange={(event) => updateLiveUser(user.id, { email: event.target.value })} />
                        </td>
                        <td className="py-3 pr-3">
                          <RoleSelect value={user.role} roles={roleChoices} disabled={lockedPlatformAdmin} onChange={(role) => updateLiveUser(user.id, { role })} />
                          <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold ${roleBadgeClass(user.role)}`}>{roleLabels[user.role]}</span>
                        </td>
                        <td className="py-3 pr-3">
                          <SubjectChecks subjects={subjects} selected={user.assigned_subjects} compact disabled={lockedPlatformAdmin} onToggle={(subject) => updateLiveUser(user.id, { assigned_subjects: toggleSubject(user.assigned_subjects, subject) })} />
                        </td>
                        <td className="py-3 pr-3">
                          <button
                            className={`focus-ring rounded-full px-3 py-1 text-xs font-bold ${user.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}
                            type="button"
                            disabled={lockedPlatformAdmin}
                            onClick={() => updateLiveUser(user.id, { active: !user.active })}
                          >
                            {user.active ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="py-3 pr-3 text-gray-700">{formatUkDateTime(user.created_at)}</td>
                        <td className="py-3 pr-3 text-gray-700">{formatUkDateTime(user.last_sign_in_at, "Never")}</td>
                        <td className="py-3 pr-3">
                          <div className="flex flex-col items-start gap-2">
                            <button className="focus-ring btn btn-secondary px-3 py-2 text-xs" type="button" disabled={lockedPlatformAdmin || savingUserId === user.id} onClick={() => saveLiveUser(user)}>
                              {savingUserId === user.id ? "Saving..." : "Save"}
                            </button>
                            {rowMessage[user.id] ? <span className="text-xs font-semibold text-gray-600">{rowMessage[user.id]}</span> : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!managedUsers.length ? <p className="rounded-md bg-gray-50 p-4 text-sm text-gray-600">{loadingUsers ? "Loading staff users..." : "No staff users found."}</p> : null}
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Bulk CSV upload</h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">Use columns: display_name,email,role,assigned_subjects,active,password</p>
            <textarea
              className="focus-ring mt-4 min-h-40 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm"
              value={csv}
              onChange={(event) => setCsv(event.target.value)}
              placeholder={'display_name,email,role,assigned_subjects,active,password\nJane Smith,smithj@newportschools.wales,teacher,"English;History",true,TempPass2026!'}
            />
            <button className="focus-ring btn btn-primary mt-4" type="button" onClick={uploadCsv} disabled={uploading || !hasLiveSupabaseSchool}>
              {uploading ? "Uploading..." : "Upload users"}
            </button>
            {uploadResults.length ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500">
                      <th className="py-3 pr-3 font-bold">Row</th>
                      <th className="py-3 pr-3 font-bold">Email</th>
                      <th className="py-3 pr-3 font-bold">Result</th>
                      <th className="py-3 pr-3 font-bold">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadResults.map((result) => (
                      <tr key={`${result.row}-${result.email}`} className="border-b border-gray-100">
                        <td className="py-3 pr-3">{result.row}</td>
                        <td className="py-3 pr-3">{result.email}</td>
                        <td className={`py-3 pr-3 font-bold ${result.success ? "text-green-700" : "text-red-700"}`}>{result.success ? "Success" : "Failed"}</td>
                        <td className="py-3 pr-3">{result.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        </>
      ) : null}

      {isDemoMode ? (
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
                      <RoleSelect value={user.role} roles={availableRoles} onChange={(role) => updateUser(user.id, { role })} />
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
      ) : null}
    </section>
  );
}

async function getAccessToken() {
  if (!supabase) return "";
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

function LabelledInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label>
      <span className="mb-1 block text-sm font-semibold text-gray-700">{label}</span>
      <input className="focus-ring w-full rounded-md border border-gray-300 px-3 py-2" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function RoleSelect({ value, roles, onChange, disabled = false }: { value: UserRole; roles: UserRole[]; onChange: (role: UserRole) => void; disabled?: boolean }) {
  return (
    <label>
      <span className="mb-1 block text-sm font-semibold text-gray-700">Role</span>
      <select className="focus-ring w-full rounded-md border border-gray-300 bg-white px-3 py-2" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value as UserRole)}>
        {roles.map((role) => (
          <option key={role} value={role}>
            {roleLabels[role]}
          </option>
        ))}
      </select>
    </label>
  );
}

function SubjectChecks({ subjects, selected, onToggle, compact = false, disabled = false }: { subjects: string[]; selected: string[]; onToggle: (subject: string) => void; compact?: boolean; disabled?: boolean }) {
  return (
    <div className={compact ? "flex max-w-md flex-wrap gap-2" : "mt-4 flex flex-wrap gap-2"}>
      {subjects.map((subject) => (
        <label key={subject} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${selected.includes(subject) ? "border-[#741B47] bg-[#f7edf3] text-[#571435]" : "border-gray-200 bg-white text-gray-600"}`}>
          <input type="checkbox" disabled={disabled} checked={selected.includes(subject)} onChange={() => onToggle(subject)} />
          {subject}
        </label>
      ))}
    </div>
  );
}

function toggleSubject(subjects: string[], subject: string) {
  return subjects.includes(subject) ? subjects.filter((item) => item !== subject) : [...subjects, subject];
}

function AccessDebugPanel({ debug, title = "Access denied debug" }: { debug: AccessDebug; title?: string }) {
  const rows: [string, string][] = [
    ["authenticated_user_id", displayDebugValue(debug.authenticated_user_id)],
    ["authenticated_email", displayDebugValue(debug.authenticated_email)],
    ["staff_profile_found", displayDebugValue(debug.staff_profile_found)],
    ["staff_profile_role", displayDebugValue(debug.staff_profile_role)],
    ["staff_profile_school_id", displayDebugValue(debug.staff_profile_school_id)],
    ["staff_profile_active", displayDebugValue(debug.staff_profile_active)],
    ["target_school_id", displayDebugValue(debug.target_school_id)],
    ["reason", displayDebugValue(debug.reason)]
  ];

  return (
    <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
      <h3 className="font-bold">{title}</h3>
      <dl className="mt-3 grid gap-2 md:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded bg-white/70 p-2">
            <dt className="text-xs font-bold uppercase tracking-[0.12em] text-amber-800">{label}</dt>
            <dd className="mt-1 break-all font-mono text-xs">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function displayDebugValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "Not available";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function formatUkDateTime(value: string | null, fallback = "Not available") {
  if (!value) return fallback;
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}
