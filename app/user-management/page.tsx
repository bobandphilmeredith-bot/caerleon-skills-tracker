"use client";

import { useEffect, useMemo, useState } from "react";
import { AccessDenied } from "@/components/AccessDenied";
import { PageHeader } from "@/components/PageHeader";
import { roleLabels, type AppUser, type UserRole, useAuth } from "@/lib/auth";
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
  const [selectedCsvFile, setSelectedCsvFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadResults, setUploadResults] = useState<{ row: number; email: string; success: boolean; message: string }[]>([]);
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [managedSchools, setManagedSchools] = useState<ManagedSchool[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [rowMessage, setRowMessage] = useState<Record<string, string>>({});
  const [savingUserId, setSavingUserId] = useState("");
  const [createDebug, setCreateDebug] = useState<AccessDebug | null>(null);
  const [schoolDebug, setSchoolDebug] = useState<AccessDebug | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "All">("All");
  const [statusFilter, setStatusFilter] = useState<"Active" | "Suspended" | "Archived" | "All">("Active");
  const [subjectFilter, setSubjectFilter] = useState("All");
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [viewingUser, setViewingUser] = useState<ManagedUser | null>(null);
  const [archivedUserIds, setArchivedUserIds] = useState<string[]>([]);
  const [deletedUserIds, setDeletedUserIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [subjectModalUser, setSubjectModalUser] = useState<ManagedUser | null>(null);
  const [subjectModalSelection, setSubjectModalSelection] = useState<string[]>([]);
  const [subjectModalSearch, setSubjectModalSearch] = useState("");
  const [bulkSubjectDrafts, setBulkSubjectDrafts] = useState<Record<string, string[]>>({});
  const [bulkSubjectBaseline, setBulkSubjectBaseline] = useState<Record<string, string[]>>({});
  const [bulkSubjectSearch, setBulkSubjectSearch] = useState("");
  const [savingBulkSubjects, setSavingBulkSubjects] = useState(false);
  const [bulkSubjectMessage, setBulkSubjectMessage] = useState("");

  const schoolOptions = isDemoMode ? schools.map((school) => ({ id: school.id, name: school.name, slug: school.slug, active: school.active })) : managedSchools;
  const targetSchoolId = currentUser?.role === "platform_admin" ? selectedSchoolId : (currentUser?.schoolId ?? "");
  const hasLiveSupabaseSchool = isDemoMode || Boolean(targetSchoolId && !targetSchoolId.startsWith("school_"));

  const visibleUsers = useMemo(() => {
    if (currentUser?.role === "platform_admin") return users;
    return users.filter((user) => user.schoolId === currentUser?.schoolId && user.role !== "platform_admin");
  }, [currentUser, users]);

  const filteredManagedUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return managedUsers.filter((user) => {
      const archived = archivedUserIds.includes(user.id);
      const deleted = deletedUserIds.includes(user.id);
      if (deleted) return false;
      if (statusFilter === "Active" && (!user.active || archived)) return false;
      if (statusFilter === "Suspended" && (user.active || archived)) return false;
      if (statusFilter === "Archived" && !archived) return false;
      if (roleFilter !== "All" && user.role !== roleFilter) return false;
      if (subjectFilter !== "All" && !userHasSubjectAccess(user, subjectFilter)) return false;
      if (query && !`${user.display_name} ${user.email}`.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [archivedUserIds, deletedUserIds, managedUsers, roleFilter, search, statusFilter, subjectFilter]);
  const bulkSubjectUsers = useMemo(() => {
    const query = bulkSubjectSearch.trim().toLowerCase();
    return managedUsers
      .filter((user) => (user.role === "teacher" || user.role === "subject_lead") && canManageTarget(user) && !deletedUserIds.includes(user.id) && !archivedUserIds.includes(user.id))
      .filter((user) => !query || `${user.display_name} ${user.email}`.toLowerCase().includes(query))
      .sort((a, b) => a.display_name.localeCompare(b.display_name) || a.email.localeCompare(b.email));
  }, [archivedUserIds, bulkSubjectSearch, currentUser?.role, currentUser?.schoolId, deletedUserIds, managedUsers]);
  const assignmentSignature = useMemo(() => JSON.stringify(managedUsers.map((user) => [user.id, normaliseSubjectList(user.assigned_subjects)])), [managedUsers]);
  const dirtyBulkSubjectUserIds = useMemo(
    () => bulkSubjectUsers.filter((user) => !subjectListsEqual(bulkSubjectDrafts[user.id] ?? [], bulkSubjectBaseline[user.id] ?? [])).map((user) => user.id),
    [bulkSubjectBaseline, bulkSubjectDrafts, bulkSubjectUsers]
  );

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

  useEffect(() => {
    const nextAssignments = Object.fromEntries(managedUsers.map((user) => [user.id, normaliseSubjectList(user.assigned_subjects)]));
    setBulkSubjectDrafts(nextAssignments);
    setBulkSubjectBaseline(nextAssignments);
  }, [assignmentSignature]);

  if (!canManageUsers) {
    return <AccessDenied title="User management restricted" message="Only platform admins and school admins can manage staff users." />;
  }

  async function loadLiveData() {
    setLoadingUsers(true);
    setNotice("");
    setBulkSubjectMessage("");
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
    setRowMessage((current) => ({ ...current, [user.id]: response.ok ? "User updated" : result.error ?? "Could not save user." }));
    if (response.ok) {
      setNotice("User updated");
      setEditingUser(null);
      await loadLiveData();
    } else {
      setNotice(result.error ?? "Could not save user.");
    }
  }

  function updateLiveUser(userId: string, patch: Partial<ManagedUser>) {
    setManagedUsers((current) => current.map((user) => (user.id === userId ? { ...user, ...patch } : user)));
  }

  function setBulkUserSubjects(userId: string, nextSubjects: string[]) {
    setBulkSubjectDrafts((current) => ({ ...current, [userId]: normaliseSubjectList(nextSubjects) }));
    setBulkSubjectMessage("");
  }

  function toggleBulkUserSubject(userId: string, subject: string) {
    const currentSubjects = bulkSubjectDrafts[userId] ?? [];
    const expandedSubjects = currentSubjects.includes("__all_subjects__") ? subjects : currentSubjects;
    setBulkUserSubjects(userId, toggleSubject(expandedSubjects, subject));
  }

  async function saveBulkSubjectAssignments() {
    setBulkSubjectMessage("");
    if (!dirtyBulkSubjectUserIds.length) {
      setBulkSubjectMessage("No subject assignment changes to save.");
      return;
    }
    if (!hasLiveSupabaseSchool) {
      setBulkSubjectMessage("Choose a Supabase school before saving subject assignments.");
      return;
    }
    const token = await getAccessToken();
    if (!token) {
      setBulkSubjectMessage("You must be signed in before saving subject assignments.");
      return;
    }

    setSavingBulkSubjects(true);
    let savedCount = 0;
    const failures: string[] = [];

    for (const userId of dirtyBulkSubjectUserIds) {
      const user = managedUsers.find((item) => item.id === userId);
      if (!user) continue;
      const nextSubjects = normaliseSubjectList(bulkSubjectDrafts[userId] ?? []);
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
          assigned_subjects: nextSubjects,
          active: user.active,
          school_id: user.school_id
        })
      });
      const result = await response.json();
      if (response.ok) {
        savedCount += 1;
      } else {
        failures.push(`${user.display_name}: ${result.error ?? "Could not save"}`);
      }
    }

    await loadLiveData();
    setSavingBulkSubjects(false);
    setBulkSubjectMessage(failures.length ? `${savedCount} saved. ${failures.length} failed: ${failures.join("; ")}` : `${savedCount} subject assignment${savedCount === 1 ? "" : "s"} saved.`);
  }

  async function uploadCsv() {
    setUploading(true);
    setNotice("");
    setUploadMessage("");
    setUploadResults([]);
    if (!selectedCsvFile) {
      setUploading(false);
      setUploadMessage("Choose a CSV file before uploading users.");
      return;
    }
    if (!hasLiveSupabaseSchool) {
      setUploading(false);
      setUploadMessage("Choose a Supabase school before uploading users.");
      return;
    }
    const token = await getAccessToken();
    if (!token) {
      setUploading(false);
      setUploadMessage("You must be signed in before uploading users.");
      return;
    }
    const formData = new FormData();
    formData.append("file", selectedCsvFile);
    formData.append("school_id", targetSchoolId);
    const response = await fetch("/api/admin/users/bulk-upload", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`
      },
      body: formData
    });
    const result = await response.json();
    setUploading(false);
    if (!response.ok) {
      setUploadMessage(result.error ?? "Could not upload users.");
      return;
    }
    const results = result.results ?? [];
    const successCount = results.filter((item: { success: boolean }) => item.success).length;
    const failedCount = results.length - successCount;
    setUploadResults(results);
    setUploadMessage(
      results.length
        ? `Upload complete: ${successCount} user${successCount === 1 ? "" : "s"} created or updated${failedCount ? `, ${failedCount} failed` : ""}.`
        : "No users were found in the CSV."
    );
    setSelectedCsvFile(null);
    setFileInputKey((current) => current + 1);
    await loadLiveData();
  }

  function downloadCsvTemplate() {
    const template = 'display_name,email,role,assigned_subjects,active,password\nJane Smith,smithj@newportschools.wales,teacher,"English;History",true,TempPass2026!\n';
    const url = URL.createObjectURL(new Blob([template], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "bulk-user-upload-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function setLiveUserActive(user: ManagedUser, active: boolean, message: string) {
    await saveLiveUser({ ...user, active });
    setNotice(message);
  }

  async function archiveLiveUser(user: ManagedUser) {
    if (!canManageTarget(user)) {
      setNotice("You do not have permission to perform this action");
      return;
    }
    await saveLiveUser({ ...user, active: false });
    setArchivedUserIds((current) => Array.from(new Set([...current, user.id])));
    setNotice("User archived");
  }

  async function deleteLiveUser() {
    if (!deleteTarget) return;
    if (deleteConfirmText !== "DELETE") return;
    if (!canManageTarget(deleteTarget) || currentUser?.role !== "platform_admin") {
      setNotice("You do not have permission to perform this action");
      return;
    }
    await saveLiveUser({ ...deleteTarget, active: false });
    setDeletedUserIds((current) => Array.from(new Set([...current, deleteTarget.id])));
    setNotice("User deleted");
    setDeleteTarget(null);
    setDeleteConfirmText("");
  }

  function canManageTarget(user: ManagedUser) {
    if (currentUser?.role === "platform_admin") return true;
    if (currentUser?.role === "school_admin") return user.school_id === currentUser.schoolId && user.role !== "platform_admin";
    return false;
  }

  function userStatus(user: ManagedUser) {
    if (archivedUserIds.includes(user.id)) return "Archived";
    return user.active ? "Active" : "Suspended";
  }

  function openSubjectModal(user: ManagedUser) {
    setSubjectModalUser(user);
    setSubjectModalSelection(user.assigned_subjects);
    setSubjectModalSearch("");
  }

  async function saveSubjectModal() {
    if (!subjectModalUser) return;
    const latestUser = managedUsers.find((user) => user.id === subjectModalUser.id) ?? subjectModalUser;
    await saveLiveUser({ ...latestUser, assigned_subjects: subjectModalSelection });
    setSubjectModalUser(null);
    setSubjectModalSelection([]);
    setSubjectModalSearch("");
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
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Bulk subject assignments</h2>
                <p className="mt-1 text-sm leading-6 text-gray-600">Tick subjects for each teacher or subject lead, then save all changes together.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">{dirtyBulkSubjectUserIds.length} unsaved</span>
                <button className="focus-ring btn btn-primary px-3 py-2 text-sm" type="button" onClick={saveBulkSubjectAssignments} disabled={savingBulkSubjects || !hasLiveSupabaseSchool || !dirtyBulkSubjectUserIds.length}>
                  {savingBulkSubjects ? "Saving..." : "Save subject assignments"}
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-3">
              <label className="min-w-72 flex-1">
                <span className="mb-1 block text-sm font-semibold text-gray-700">Search staff</span>
                <input className="focus-ring w-full rounded-md border border-gray-300 px-3 py-2" value={bulkSubjectSearch} onChange={(event) => setBulkSubjectSearch(event.target.value)} placeholder="Search teacher or subject lead" />
              </label>
              <button className="focus-ring btn btn-muted px-3 py-2 text-sm" type="button" onClick={() => setBulkSubjectSearch("")}>
                Clear search
              </button>
            </div>

            <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-gray-600">
                    <th className="sticky left-0 z-10 w-72 bg-gray-50 py-3 pl-4 pr-3 font-bold">Staff member</th>
                    {subjects.map((subject) => (
                      <th key={subject} className="min-w-28 px-3 py-3 text-center text-xs font-bold">
                        {subject}
                      </th>
                    ))}
                    <th className="min-w-32 px-3 py-3 text-center text-xs font-bold">Quick actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkSubjectUsers.map((user) => {
                    const selectedSubjects = bulkSubjectDrafts[user.id] ?? [];
                    const dirty = !subjectListsEqual(selectedSubjects, bulkSubjectBaseline[user.id] ?? []);
                    return (
                      <tr key={user.id} className={`border-b border-gray-100 ${dirty ? "bg-[#fff8fb]" : "bg-white"}`}>
                        <td className="sticky left-0 z-10 bg-inherit py-3 pl-4 pr-3">
                          <div className="font-bold text-gray-900">{user.display_name}</div>
                          <div className="mt-1 truncate text-xs font-semibold text-gray-500">{user.email}</div>
                          <div className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-gray-400">{roleLabels[user.role]}</div>
                        </td>
                        {subjects.map((subject) => {
                          const checked = selectedSubjects.includes("__all_subjects__") || selectedSubjects.includes(subject);
                          return (
                            <td key={`${user.id}-${subject}`} className="px-3 py-3 text-center">
                              <input className="h-4 w-4 accent-[#741B47]" type="checkbox" checked={checked} onChange={() => toggleBulkUserSubject(user.id, subject)} aria-label={`${user.display_name} ${subject}`} />
                            </td>
                          );
                        })}
                        <td className="px-3 py-3">
                          <div className="flex justify-center gap-2">
                            <button className="focus-ring rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-bold text-gray-700" type="button" onClick={() => setBulkUserSubjects(user.id, subjects)}>
                              All
                            </button>
                            <button className="focus-ring rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-bold text-gray-700" type="button" onClick={() => setBulkUserSubjects(user.id, [])}>
                              None
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!bulkSubjectUsers.length ? <p className="p-4 text-sm text-gray-600">{loadingUsers ? "Loading staff users..." : "No teachers or subject leads match this search."}</p> : null}
            </div>
            {bulkSubjectMessage ? <p className="mt-3 text-sm font-semibold text-gray-700" role="status">{bulkSubjectMessage}</p> : null}
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-gray-900">Staff users</h2>
              <button className="focus-ring btn btn-muted px-3 py-2 text-sm" type="button" onClick={loadLiveData} disabled={loadingUsers}>
                {loadingUsers ? "Refreshing..." : "Refresh"}
              </button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <LabelledInput label="Search staff" value={search} onChange={setSearch} />
              <label>
                <span className="mb-1 block text-sm font-semibold text-gray-700">Role</span>
                <select className="focus-ring w-full rounded-md border border-gray-300 bg-white px-3 py-2" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as UserRole | "All")}>
                  <option value="All">All roles</option>
                  {availableRoles.map((role) => (
                    <option key={role} value={role}>
                      {roleLabels[role]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-gray-700">Subject</span>
                <select className="focus-ring w-full rounded-md border border-gray-300 bg-white px-3 py-2" value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)}>
                  <option>All</option>
                  {subjects.map((subject) => (
                    <option key={subject}>{subject}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-gray-700">Status</span>
                <select className="focus-ring w-full rounded-md border border-gray-300 bg-white px-3 py-2" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
                  <option>Active</option>
                  <option>Suspended</option>
                  <option>Archived</option>
                  <option>All</option>
                </select>
              </label>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
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
                  {filteredManagedUsers.map((user) => {
                    const lockedPlatformAdmin = currentUser?.role !== "platform_admin" && user.role === "platform_admin";
                    const roleChoices = currentUser?.role === "platform_admin" ? roles : roles.filter((role) => role !== "platform_admin");
                    return (
                      <tr key={user.id} className="border-b border-gray-100 align-middle">
                        <td className="py-3 pr-3">
                          <input className="focus-ring w-full rounded-md border border-gray-300 px-3 py-2 font-semibold" value={user.display_name} disabled={lockedPlatformAdmin} onChange={(event) => updateLiveUser(user.id, { display_name: event.target.value })} />
                        </td>
                        <td className="py-3 pr-3">
                          <input className="focus-ring w-full rounded-md border border-gray-300 px-3 py-2" value={user.email} disabled={lockedPlatformAdmin} onChange={(event) => updateLiveUser(user.id, { email: event.target.value })} />
                        </td>
                        <td className="py-3 pr-3">
                          <RoleSelect value={user.role} roles={roleChoices} disabled={lockedPlatformAdmin} hideLabel onChange={(role) => updateLiveUser(user.id, { role })} />
                        </td>
                        <td className="py-3 pr-3">
                          <span className="text-sm font-semibold text-gray-700">{subjectSummary(user.assigned_subjects, user.role)}</span>
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
                          <div className="flex flex-wrap items-center gap-2">
                            <button className="focus-ring btn btn-muted px-3 py-2 text-xs" type="button" disabled={lockedPlatformAdmin} onClick={() => openSubjectModal(user)}>
                              Manage subjects
                            </button>
                            <button className="focus-ring btn btn-secondary px-3 py-2 text-xs" type="button" disabled={lockedPlatformAdmin || savingUserId === user.id} onClick={() => saveLiveUser(user)}>
                              {savingUserId === user.id ? "Saving..." : "Save"}
                            </button>
                            {rowMessage[user.id] ? <span className="basis-full text-xs font-semibold text-gray-600">{rowMessage[user.id]}</span> : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!filteredManagedUsers.length ? <p className="rounded-md bg-gray-50 p-4 text-sm text-gray-600">{loadingUsers ? "Loading staff users..." : "No staff users match the current filters."}</p> : null}
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Bulk CSV upload</h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">Use columns: display_name,email,role,assigned_subjects,active,password. Header row optional.</p>
            <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
              <label>
                <span className="mb-2 block text-sm font-bold text-gray-800">CSV file</span>
                <input
                  key={fileInputKey}
                  className="focus-ring block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-[#741B47] file:px-3 file:py-2 file:text-sm file:font-bold file:text-white"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => {
                    setSelectedCsvFile(event.target.files?.[0] ?? null);
                    setUploadMessage("");
                    setUploadResults([]);
                  }}
                />
              </label>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button className="focus-ring btn btn-primary" type="button" onClick={uploadCsv} disabled={uploading || !hasLiveSupabaseSchool || !selectedCsvFile}>
                  {uploading ? "Uploading..." : "Upload users"}
                </button>
                <button className="focus-ring btn btn-muted" type="button" onClick={downloadCsvTemplate}>
                  Download template
                </button>
                <span className="text-sm font-semibold text-gray-600">{selectedCsvFile ? selectedCsvFile.name : "No file selected"}</span>
              </div>
            </div>
            {uploadMessage ? <p className="mt-3 text-sm font-semibold text-gray-700" role="status">{uploadMessage}</p> : null}
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
                      <RoleSelect value={user.role} roles={availableRoles} hideLabel onChange={(role) => updateUser(user.id, { role })} />
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

      {subjectModalUser ? (
        <SubjectAssignmentModal
          user={subjectModalUser}
          subjects={subjects}
          selected={subjectModalSelection}
          search={subjectModalSearch}
          saving={savingUserId === subjectModalUser.id}
          onSearch={setSubjectModalSearch}
          onToggle={(subject) => setSubjectModalSelection((current) => toggleSubject(current, subject))}
          onSelectAll={() => setSubjectModalSelection(subjects)}
          onClearAll={() => setSubjectModalSelection([])}
          onCancel={() => setSubjectModalUser(null)}
          onSave={saveSubjectModal}
        />
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

function RoleSelect({ value, roles, onChange, disabled = false, hideLabel = false }: { value: UserRole; roles: UserRole[]; onChange: (role: UserRole) => void; disabled?: boolean; hideLabel?: boolean }) {
  return (
    <label>
      {hideLabel ? null : <span className="mb-1 block text-sm font-semibold text-gray-700">Role</span>}
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

function SubjectAssignmentModal({
  user,
  subjects,
  selected,
  search,
  saving,
  onSearch,
  onToggle,
  onSelectAll,
  onClearAll,
  onCancel,
  onSave
}: {
  user: ManagedUser;
  subjects: string[];
  selected: string[];
  search: string;
  saving: boolean;
  onSearch: (value: string) => void;
  onToggle: (subject: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const filteredSubjects = subjects.filter((subject) => subject.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 px-4 py-6" role="dialog" aria-modal="true" aria-label="Manage subject assignments">
      <div className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-5 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 pb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-950">Manage subjects</h2>
            <p className="mt-1 text-sm font-semibold text-gray-700">{user.display_name}</p>
            <p className="mt-1 text-sm text-gray-600">{user.email}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-gray-500">{roleLabels[user.role]}</p>
          </div>
          <button className="focus-ring btn btn-muted px-3 py-2 text-sm" type="button" onClick={onCancel}>
            Close
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="min-w-64 flex-1">
            <span className="mb-1 block text-sm font-semibold text-gray-700">Search subjects</span>
            <input className="focus-ring w-full rounded-md border border-gray-300 px-3 py-2" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search by subject name" />
          </label>
          <button className="focus-ring btn btn-muted px-3 py-2 text-sm" type="button" onClick={onSelectAll}>
            Select all
          </button>
          <button className="focus-ring btn btn-muted px-3 py-2 text-sm" type="button" onClick={onClearAll}>
            Clear all
          </button>
        </div>

        <div className="mt-4 grid max-h-80 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
          {filteredSubjects.map((subject) => (
            <label key={subject} className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700">
              <input type="checkbox" checked={selected.includes(subject)} onChange={() => onToggle(subject)} />
              {subject}
            </label>
          ))}
          {!filteredSubjects.length ? <p className="text-sm text-gray-600">No subjects match that search.</p> : null}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4">
          <span className="text-sm font-semibold text-gray-600">{selected.length ? `${selected.length} selected` : "No subjects assigned"}</span>
          <div className="flex flex-wrap gap-2">
            <button className="focus-ring btn btn-muted" type="button" onClick={onCancel}>
              Cancel
            </button>
            <button className="focus-ring btn btn-primary" type="button" onClick={onSave} disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function toggleSubject(subjects: string[], subject: string) {
  return subjects.includes(subject) ? subjects.filter((item) => item !== subject) : [...subjects, subject];
}

function normaliseSubjectList(subjects: string[]) {
  return Array.from(new Set(subjects.map((subject) => subject.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function subjectListsEqual(left: string[], right: string[]) {
  const normalisedLeft = normaliseSubjectList(left);
  const normalisedRight = normaliseSubjectList(right);
  return normalisedLeft.length === normalisedRight.length && normalisedLeft.every((subject, index) => subject === normalisedRight[index]);
}

function subjectSummary(subjects: string[], role: UserRole) {
  if (role === "platform_admin" || role === "school_admin") return "All subjects";
  if (!subjects.length) return "No subjects assigned";
  if (subjects.length <= 2) return subjects.join(", ");
  return `${subjects.slice(0, 2).join(", ")} +${subjects.length - 2}`;
}

function userHasSubjectAccess(user: ManagedUser, subjectFilter: string) {
  if (user.role === "platform_admin" || user.role === "school_admin") return true;
  return user.assigned_subjects.some((subject) => subject.trim().toLowerCase() === subjectFilter.trim().toLowerCase());
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
