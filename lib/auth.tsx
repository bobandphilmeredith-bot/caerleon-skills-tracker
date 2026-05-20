"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { isDemoLoginEnabled, isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

export type UserRole = "platform_admin" | "school_admin" | "teacher" | "subject_lead" | "viewer";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  schoolId: string;
  assignedSubjects: string[];
  active: boolean;
  createdAt?: string;
  lastLoginAt?: string | null;
};

type AuthContextValue = {
  currentUser: AppUser | null;
  users: AppUser[];
  isDemoMode: boolean;
  isSupabaseConfigured: boolean;
  authLoading: boolean;
  accessDeniedMessage: string;
  signInWithPassword: (email: string, password: string) => Promise<string>;
  resetPassword: (email: string) => Promise<string>;
  sendSignInLink: (email: string) => Promise<string>;
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
  teacher: "Can add and edit curriculum mapping entries for assigned subjects.",
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<AppUser[]>(defaultUsers);
  const [currentUserId, setCurrentUserId] = useState(defaultUsers[1].id);
  const [liveUser, setLiveUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(!isDemoLoginEnabled && isSupabaseConfigured);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState("");

  useEffect(() => {
    if (!isDemoLoginEnabled) return;

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
    if (!isDemoLoginEnabled) return;
    window.localStorage.setItem(usersKey, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (!isDemoLoginEnabled) return;
    window.localStorage.setItem(currentUserKey, currentUserId);
  }, [currentUserId]);

  useEffect(() => {
    if (isDemoLoginEnabled) return;

    if (!supabase) {
      setLiveUser(null);
      setAuthLoading(false);
      setAccessDeniedMessage(
        "Supabase environment variables are missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
      );
      return;
    }

    const client = supabase;
    let mounted = true;

    async function loadStaffProfile(userId: string) {
      const { data: profile, error } = await client
        .from("staff_profiles")
        .select("id,email,display_name,role,school_id,assigned_subjects,active")
        .eq("id", userId)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        setLiveUser(null);
        setAccessDeniedMessage("Staff profile could not be checked. Please contact your school administrator.");
        return;
      }

      if (!profile || profile.active === false) {
        setLiveUser(null);
        setAccessDeniedMessage("Access denied. Your staff profile is missing or inactive.");
        return;
      }

      setLiveUser({
        id: profile.id,
        name: profile.display_name || profile.email || "Staff user",
        email: profile.email || "",
        role: profile.role as UserRole,
        schoolId: profile.school_id,
        assignedSubjects: Array.isArray(profile.assigned_subjects) ? profile.assigned_subjects : [],
        active: profile.active
      });
      setAccessDeniedMessage("");
    }

    async function loadUser() {
      setAuthLoading(true);

      const { data, error } = await client.auth.getUser();

      if (!mounted) return;

      if (error || !data.user) {
        setLiveUser(null);
        setAccessDeniedMessage("");
        setAuthLoading(false);
        return;
      }

      await loadStaffProfile(data.user.id);

      if (mounted) setAuthLoading(false);
    }

    loadUser();

    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setLiveUser(null);
        setAccessDeniedMessage("");
        setAuthLoading(false);
        return;
      }

      setAuthLoading(true);
      loadStaffProfile(session.user.id).finally(() => {
        if (mounted) setAuthLoading(false);
      });
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const currentUser = isDemoLoginEnabled
    ? users.find((user) => user.id === currentUserId && user.active) ?? users.find((user) => user.active) ?? null
    : liveUser;

  const canManagePlatform = currentUser?.role === "platform_admin";
  const canManageSchool = currentUser?.role === "platform_admin" || currentUser?.role === "school_admin";
  const canManageUsers = canManageSchool;
  const canEditMappings = canManageSchool || currentUser?.role === "teacher" || currentUser?.role === "subject_lead";

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      users,
      isDemoMode: isDemoLoginEnabled,
      isSupabaseConfigured,
      authLoading,
      accessDeniedMessage,
      signInWithPassword: async (email, password) => {
        if (!supabase) return "Supabase environment variables are missing.";

        const client = supabase;
        const { error } = await client.auth.signInWithPassword({ email, password });
        return error?.message ?? "";
      },
      resetPassword: async (email) => {
        if (!supabase) return "Supabase environment variables are missing.";

        const client = supabase;
        const { error } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: typeof window === "undefined" ? undefined : `${window.location.origin}/reset-password`
        });
        return error?.message ?? "";
      },
      sendSignInLink: async (email) => {
        if (!supabase) return "Supabase environment variables are missing.";

        const client = supabase;
        const { error } = await client.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: typeof window === "undefined" ? undefined : `${window.location.origin}/login`
          }
        });

        return error?.message ?? "";
      },
      loginAs: (userId) => {
        if (!isDemoLoginEnabled) return;

        const nextUser = users.find((user) => user.id === userId && user.active);
        if (nextUser) setCurrentUserId(nextUser.id);
      },
      logout: () => {
        if (isDemoLoginEnabled) {
          setCurrentUserId("");
          return;
        }

        supabase?.auth.signOut();
        setLiveUser(null);
      },
      createUser: (user) => {
        if (!isDemoLoginEnabled) return;
        setUsers((current) => [...current, { ...user, id: `user-${Date.now()}` }]);
      },
      updateUser: (userId, patch) => {
        if (!isDemoLoginEnabled) return;
        setUsers((current) => current.map((user) => (user.id === userId ? { ...user, ...patch } : user)));
      },
      deactivateUser: (userId) => {
        if (!isDemoLoginEnabled) return;
        setUsers((current) => current.map((user) => (user.id === userId ? { ...user, active: false } : user)));
      },
      canManagePlatform,
      canManageSchool,
      canManageUsers,
      canEditMappings,
      canEditSubject: (subject) => {
        if (!currentUser) return false;
        if (currentUser.role === "platform_admin" || currentUser.role === "school_admin") return true;
        if (currentUser.role === "teacher" || currentUser.role === "subject_lead") return currentUser.assignedSubjects.includes(subject);
        return false;
      },
      canAccessRole: (roles) => !!currentUser && roles.includes(currentUser.role)
    }),
    [accessDeniedMessage, authLoading, canEditMappings, canManagePlatform, canManageSchool, canManageUsers, currentUser, users]
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
