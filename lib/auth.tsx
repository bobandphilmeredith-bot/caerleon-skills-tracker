"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type UserRole = "platform_admin" | "school_admin" | "teacher" | "subject_lead" | "viewer";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  schoolId: string;
  assignedSubjects: string[];
  active: boolean;
};

type AuthContextValue = {
  currentUser: AppUser | null;
  users: AppUser[];
  loginAs: (userId: string) => void;
  logout: () => void;
  createUser: (user: Omit<AppUser, "id">) => void;
  updateUser: (userId: string, patch: Partial<AppUser>) => void;
  deactivateUser: (userId: string) => void;
  canManagePlatform: boolean;
  canManageSchool: boolean;
  canManageUsers: boolean;
  canEditMappings: boolean;
  canEditSubject: (subject: string) => boolean;
  canAccessRole: (roles: UserRole[]) => boolean;
};

const usersKey = "skills-tracker-users";
const currentUserKey = "skills-tracker-current-user";

export const roleLabels: Record<UserRole, string> = {
  platform_admin: "Platform admin",
  school_admin: "School admin",
  teacher: "Teacher",
  subject_lead: "Subject lead",
  viewer: "Viewer"
};

export const roleDescriptions: Record<UserRole, string> = {
  platform_admin: "Can access platform admin and manage schools.",
  school_admin: "Can manage their own school, users, frameworks, branding and mappings.",
  teacher: "Can add and edit curriculum mapping entries.",
  subject_lead: "Can manage assigned subject mapping entries.",
  viewer: "Can view curriculum visibility information only."
};

const defaultUsers: AppUser[] = [
  {
    id: "user-platform-admin",
    name: "Platform Admin",
    email: "platform.admin@skillstracker.wales",
    role: "platform_admin",
    schoolId: "school_caerleon",
    assignedSubjects: [],
    active: true
  },
  {
    id: "user-school-admin",
    name: "School Admin",
    email: "school.admin@caerleon.school",
    role: "school_admin",
    schoolId: "school_caerleon",
    assignedSubjects: [],
    active: true
  },
  {
    id: "user-teacher",
    name: "Teacher",
    email: "teacher@caerleon.school",
    role: "teacher",
    schoolId: "school_caerleon",
    assignedSubjects: [],
    active: true
  },
  {
    id: "user-subject-lead",
    name: "Subject Lead",
    email: "subject.lead@caerleon.school",
    role: "subject_lead",
    schoolId: "school_caerleon",
    assignedSubjects: ["Art", "Chemistry", "English"],
    active: true
  },
  {
    id: "user-viewer",
    name: "Viewer",
    email: "viewer@caerleon.school",
    role: "viewer",
    schoolId: "school_caerleon",
    assignedSubjects: [],
    active: true
  }
];

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<AppUser[]>(defaultUsers);
  const [currentUserId, setCurrentUserId] = useState(defaultUsers[1].id);

  useEffect(() => {
    const savedUsers = window.localStorage.getItem(usersKey);
    const savedCurrentUser = window.localStorage.getItem(currentUserKey);
    if (savedUsers) {
      try {
        setUsers(mergeDefaultUsers(JSON.parse(savedUsers) as AppUser[]));
      } catch {
        setUsers(defaultUsers);
      }
    }
    if (savedCurrentUser) setCurrentUserId(savedCurrentUser);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(usersKey, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    window.localStorage.setItem(currentUserKey, currentUserId);
  }, [currentUserId]);

  const currentUser = users.find((user) => user.id === currentUserId && user.active) ?? users.find((user) => user.active) ?? null;
  const canManagePlatform = currentUser?.role === "platform_admin";
  const canManageSchool = currentUser?.role === "platform_admin" || currentUser?.role === "school_admin";
  const canManageUsers = canManageSchool;
  const canEditMappings = canManageSchool || currentUser?.role === "teacher" || currentUser?.role === "subject_lead";

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      users,
      loginAs: (userId) => {
        const nextUser = users.find((user) => user.id === userId && user.active);
        if (nextUser) setCurrentUserId(nextUser.id);
      },
      logout: () => setCurrentUserId(""),
      createUser: (user) => {
        setUsers((current) => [...current, { ...user, id: `user-${Date.now()}` }]);
      },
      updateUser: (userId, patch) => {
        setUsers((current) => current.map((user) => (user.id === userId ? { ...user, ...patch } : user)));
      },
      deactivateUser: (userId) => {
        setUsers((current) => current.map((user) => (user.id === userId ? { ...user, active: false } : user)));
      },
      canManagePlatform,
      canManageSchool,
      canManageUsers,
      canEditMappings,
      canEditSubject: (subject) => {
        if (!currentUser) return false;
        if (currentUser.role === "platform_admin" || currentUser.role === "school_admin") return true;
        if (currentUser.role === "teacher") return true;
        if (currentUser.role === "subject_lead") return currentUser.assignedSubjects.includes(subject);
        return false;
      },
      canAccessRole: (roles) => !!currentUser && roles.includes(currentUser.role)
    }),
    [canEditMappings, canManagePlatform, canManageSchool, canManageUsers, currentUser, users]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}

export function roleBadgeClass(role: UserRole) {
  if (role === "platform_admin") return "bg-slate-900 text-white";
  if (role === "school_admin") return "bg-[#f7edf3] text-[#571435]";
  if (role === "teacher") return "bg-green-50 text-green-800";
  if (role === "subject_lead") return "bg-blue-50 text-blue-800";
  return "bg-gray-100 text-gray-700";
}

function mergeDefaultUsers(savedUsers: AppUser[]) {
  const savedIds = new Set(savedUsers.map((user) => user.id));
  return [...savedUsers, ...defaultUsers.filter((user) => !savedIds.has(user.id))];
}
