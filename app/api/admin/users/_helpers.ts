import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "@/lib/auth";

export const protectedPlatformAdminEmail = "meredithp3@newportschools.wales";

export type StaffUserInput = {
  display_name: string;
  email: string;
  password?: string;
  role: UserRole;
  assigned_subjects: string[];
  active: boolean;
  school_id: string;
};

export type StaffProfile = {
  id: string;
  school_id: string;
  email: string;
  display_name: string | null;
  role: UserRole;
  assigned_subjects: string[] | null;
  active: boolean;
  created_at?: string;
  updated_at?: string;
};

type StaffProfileRow = {
  id: string;
  email: string;
  display_name: string | null;
};

type SchoolUserRow = {
  id: string;
  school_id: string;
  user_id: string;
  role: UserRole;
  active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ManagedStaffUser = {
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

export type AccessDeniedDebug = {
  authenticated_user_id: string | null;
  authenticated_email: string | null;
  staff_profile_found: boolean;
  staff_profile_role: UserRole | null;
  staff_profile_school_id: string | null;
  staff_profile_active: boolean | null;
  target_school_id: string | null;
  reason: string;
};

export function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export function getSupabaseAuthClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export function getSupabaseUserClient(token: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export function bearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

export async function getActorProfile(admin: SupabaseClient, token: string, targetSchoolId?: string | null) {
  const emptyDebug: AccessDeniedDebug = {
    authenticated_user_id: null,
    authenticated_email: null,
    staff_profile_found: false,
    staff_profile_role: null,
    staff_profile_school_id: null,
    staff_profile_active: null,
    target_school_id: targetSchoolId ?? null,
    reason: "No bearer token was provided."
  };

  if (!token) return { error: "You must be signed in.", debug: emptyDebug };

  const authClient = getSupabaseAuthClient();
  if (!authClient) {
    return {
      error: "Supabase auth is not configured.",
      debug: { ...emptyDebug, reason: "NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing." }
    };
  }

  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userData.user) {
    return {
      error: "You must be signed in.",
      debug: { ...emptyDebug, reason: userError?.message ?? "Bearer token did not resolve to an authenticated user." }
    };
  }

  const userClient = getSupabaseUserClient(token);
  if (!userClient) {
    return {
      error: "Supabase auth is not configured.",
      debug: { ...emptyDebug, reason: "NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing." }
    };
  }

  const debug: AccessDeniedDebug = {
    authenticated_user_id: userData.user.id,
    authenticated_email: userData.user.email ?? null,
    staff_profile_found: false,
    staff_profile_role: null,
    staff_profile_school_id: null,
    staff_profile_active: null,
    target_school_id: targetSchoolId ?? null,
    reason: "Staff profile lookup has not completed."
  };

  const { data: profile, error: profileError } = await userClient
    .from("staff_profiles")
    .select("id,email,display_name")
    .eq("id", userData.user.id)
    .maybeSingle<StaffProfileRow>();

  const { data: memberships, error: membershipError } = await userClient
    .from("school_users")
    .select("id,school_id,user_id,role,active,created_at,updated_at")
    .eq("user_id", userData.user.id)
    .eq("active", true)
    .order("role", { ascending: true })
    .returns<SchoolUserRow[]>();

  const membership = selectPrimaryMembership(memberships ?? []);

  debug.staff_profile_found = Boolean(profile);
  debug.staff_profile_role = membership?.role ?? null;
  debug.staff_profile_school_id = membership?.school_id ?? null;
  debug.staff_profile_active = membership?.active ?? null;

  if (profileError) {
    return { error: "Access denied.", debug: { ...debug, reason: `Staff profile lookup failed: ${profileError.message}` } };
  }
  if (membershipError) {
    return { error: "Access denied.", debug: { ...debug, reason: `School membership lookup failed: ${membershipError.message}` } };
  }
  if (!profile) {
    return { error: "Access denied.", debug: { ...debug, reason: "No staff profile row found for authenticated user id using bearer-authenticated client." } };
  }
  if (!membership) {
    return { error: "Access denied.", debug: { ...debug, reason: "No active public.school_users row was found where user_id matches the authenticated user id." } };
  }
  return {
    profile: {
      id: profile.id,
      email: profile.email,
      display_name: profile.display_name,
      school_id: membership.school_id,
      role: membership.role,
      assigned_subjects: [],
      active: membership.active
    } satisfies StaffProfile
  };
}

export function canManageUsers(actor: StaffProfile) {
  return actor.role === "platform_admin" || actor.role === "school_admin";
}

export function normaliseStaffInput(input: Partial<StaffUserInput>, actor: StaffProfile): StaffUserInput {
  const email = String(input.email ?? "").trim().toLowerCase();
  const protectedAdmin = email === protectedPlatformAdminEmail;
  const role = protectedAdmin ? "platform_admin" : input.role ?? "viewer";

  return {
    display_name: String(input.display_name ?? "").trim(),
    email,
    password: String(input.password ?? ""),
    role,
    assigned_subjects: Array.isArray(input.assigned_subjects) ? input.assigned_subjects.map((item) => String(item).trim()).filter(Boolean) : [],
    active: protectedAdmin ? true : input.active !== false,
    school_id: actor.role === "platform_admin" ? String(input.school_id ?? actor.school_id) : actor.school_id
  };
}

export async function upsertStaffUser(admin: SupabaseClient, actor: StaffProfile, input: StaffUserInput) {
  const validation = await validateInput(admin, actor, input, "create");
  if (validation) return { success: false, message: validation };

  const existingAuthUser = await findAuthUserByEmail(admin, input.email);
  if (existingAuthUser.error) return { success: false, message: existingAuthUser.error };

  if (existingAuthUser.user) {
    const existingProfile = await getStaffProfileById(admin, existingAuthUser.user.id);
    if (existingProfile?.role === "platform_admin" && actor.role !== "platform_admin") {
      return { success: false, message: "Only a platform admin can manage a platform admin account." };
    }
  }

  const authUser = existingAuthUser.user
    ? await updateAuthUser(admin, existingAuthUser.user.id, input)
    : await createAuthUser(admin, input);

  if (authUser.error || !authUser.userId) return { success: false, message: authUser.error ?? "Could not create user." };

  const userId = authUser.userId;
  const { error: userError } = await admin.from("users").upsert(
    {
      id: userId,
      email: input.email,
      display_name: input.display_name
    },
    { onConflict: "id" }
  );
  if (userError) return { success: false, message: "Could not update user profile." };

  const { error: profileError } = await admin.from("staff_profiles").upsert(
    {
      id: userId,
      email: input.email,
      display_name: input.display_name
    },
    { onConflict: "id" }
  );
  if (profileError) return { success: false, message: "Could not update staff profile." };

  const { error: membershipError } = await admin.from("school_users").upsert(
    {
      school_id: input.school_id,
      user_id: userId,
      role: input.role,
      active: input.active
    },
    { onConflict: "school_id,user_id" }
  );
  if (membershipError) return { success: false, message: "Could not update school membership." };

  return { success: true, message: existingAuthUser.user ? "User updated." : "User created.", userId };
}

export async function updateStaffUser(admin: SupabaseClient, actor: StaffProfile, userId: string, input: StaffUserInput) {
  if (!userId) return { success: false, message: "User id is required." };

  const existingProfile = await getStaffProfileById(admin, userId);
  if (!existingProfile) return { success: false, message: "User was not found." };
  if (existingProfile.role === "platform_admin" && actor.role !== "platform_admin") {
    return { success: false, message: "Only a platform admin can manage a platform admin account." };
  }

  const protectedTarget = existingProfile.email.toLowerCase() === protectedPlatformAdminEmail || input.email.toLowerCase() === protectedPlatformAdminEmail;
  const nextInput: StaffUserInput = protectedTarget
    ? { ...input, email: protectedPlatformAdminEmail, role: "platform_admin", active: true }
    : input;

  const validation = await validateInput(admin, actor, nextInput, "update");
  if (validation) return { success: false, message: validation };
  if (actor.role !== "platform_admin" && existingProfile.school_id !== actor.school_id) {
    return { success: false, message: "School admins can only manage their own school." };
  }

  const { error: authError } = await admin.auth.admin.updateUserById(userId, {
    email: nextInput.email,
    ...(nextInput.password ? { password: nextInput.password } : {}),
    email_confirm: true,
    user_metadata: {
      display_name: nextInput.display_name
    }
  });
  if (authError) return { success: false, message: "Could not update auth user." };

  const { error: userError } = await admin.from("users").upsert(
    {
      id: userId,
      email: nextInput.email,
      display_name: nextInput.display_name
    },
    { onConflict: "id" }
  );
  if (userError) return { success: false, message: "Could not update user profile." };

  const { error: profileError } = await admin
    .from("staff_profiles")
    .update({
      email: nextInput.email,
      display_name: nextInput.display_name
    })
    .eq("id", userId);
  if (profileError) return { success: false, message: "Could not update staff profile." };

  const { error: membershipError } = await admin.from("school_users").upsert(
    {
      school_id: nextInput.school_id,
      user_id: userId,
      role: nextInput.role,
      active: nextInput.active
    },
    { onConflict: "school_id,user_id" }
  );
  if (membershipError) return { success: false, message: "Could not update school membership." };

  return { success: true, message: "User updated.", userId };
}

export async function listManagedUsers(admin: SupabaseClient, actor: StaffProfile): Promise<{ users?: ManagedStaffUser[]; error?: string }> {
  if (!canManageUsers(actor)) return { error: "Only platform admins and school admins can manage users." };

  let membershipQuery = admin
    .from("school_users")
    .select("id,school_id,user_id,role,active,created_at")
    .order("created_at", { ascending: true });

  if (actor.role !== "platform_admin") {
    membershipQuery = membershipQuery.eq("school_id", actor.school_id).neq("role", "platform_admin");
  }

  const { data: memberships, error: membershipError } = await membershipQuery.returns<SchoolUserRow[]>();
  if (membershipError) return { error: "Could not load school memberships." };

  const userIds = Array.from(new Set((memberships ?? []).map((membership) => membership.user_id)));
  const { data: profiles, error: profileError } = userIds.length
    ? await admin.from("staff_profiles").select("id,email,display_name").in("id", userIds).returns<StaffProfileRow[]>()
    : { data: [] as StaffProfileRow[], error: null };
  if (profileError) return { error: "Could not load staff profiles." };

  const authUsers = await listAllAuthUsers(admin);
  if ("error" in authUsers) return { error: authUsers.error };
  const authById = new Map(authUsers.users.map((user) => [user.id, user]));
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  return {
    users: (memberships ?? []).map((membership) => {
      const profile = profileById.get(membership.user_id);
      const authUser = authById.get(membership.user_id);
      return {
        id: membership.user_id,
        school_id: membership.school_id,
        email: profile?.email ?? authUser?.email ?? "",
        display_name: profile?.display_name || profile?.email || authUser?.email || "Staff user",
        role: membership.role,
        assigned_subjects: [],
        active: membership.active,
        created_at: authUser?.created_at ?? membership.created_at ?? null,
        last_sign_in_at: authUser?.last_sign_in_at ?? null
      };
    })
  };
}

async function validateInput(admin: SupabaseClient, actor: StaffProfile, input: StaffUserInput, mode: "create" | "update") {
  const roles: UserRole[] = ["platform_admin", "school_admin", "teacher", "subject_lead", "viewer"];
  if (!canManageUsers(actor)) return "Only platform admins and school admins can manage users.";
  if (!input.display_name) return "Name is required.";
  if (!input.email || !input.email.includes("@")) return "Valid email is required.";
  if (!roles.includes(input.role)) return "Invalid role.";
  if (!input.school_id) return "School is required.";
  if (actor.role !== "platform_admin" && input.school_id !== actor.school_id) return "School admins can only manage their own school.";
  if (actor.role !== "platform_admin" && input.role === "platform_admin") return "Only a platform admin can create a platform admin.";
  if (mode === "create" && (!input.password || input.password.length < 8)) return "Temporary password must be at least 8 characters.";
  if (mode === "update" && input.password && input.password.length < 8) return "Temporary password must be at least 8 characters.";
  const subjectError = await validateAssignedSubjects(admin, input.school_id, input.assigned_subjects);
  if (subjectError) return subjectError;
  return "";
}

async function createAuthUser(admin: SupabaseClient, input: StaffUserInput) {
  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      display_name: input.display_name
    }
  });
  return { userId: data.user?.id, error: error?.message };
}

async function updateAuthUser(admin: SupabaseClient, userId: string, input: StaffUserInput) {
  const { data, error } = await admin.auth.admin.updateUserById(userId, {
    email: input.email,
    ...(input.password ? { password: input.password } : {}),
    email_confirm: true,
    user_metadata: {
      display_name: input.display_name
    }
  });
  return { userId: data.user?.id, error: error?.message };
}

async function getStaffProfileById(admin: SupabaseClient, id: string) {
  const { data: profile } = await admin.from("staff_profiles").select("id,email,display_name").eq("id", id).maybeSingle<StaffProfileRow>();
  if (!profile) return null;

  const { data: memberships } = await admin
    .from("school_users")
    .select("id,school_id,user_id,role,active,created_at,updated_at")
    .eq("user_id", id)
    .returns<SchoolUserRow[]>();
  const membership = selectPrimaryMembership(memberships ?? []);
  if (!membership) return null;

  return {
    id: profile.id,
    email: profile.email,
    display_name: profile.display_name,
    school_id: membership.school_id,
    role: membership.role,
    assigned_subjects: [],
    active: membership.active
  } satisfies StaffProfile;
}

async function findAuthUserByEmail(admin: SupabaseClient, email: string) {
  let page = 1;
  while (page < 20) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return { error: "Could not check existing auth users." };
    const user = data.users.find((item) => item.email?.toLowerCase() === email);
    if (user) return { user };
    if (data.users.length < 1000) return {};
    page += 1;
  }
  return { error: "Too many auth users to search safely." };
}

async function listAllAuthUsers(admin: SupabaseClient) {
  const users = [];
  let page = 1;
  while (page < 20) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return { error: "Could not load auth users." };
    users.push(...data.users);
    if (data.users.length < 1000) return { users };
    page += 1;
  }
  return { error: "Too many auth users to list safely." };
}

async function validateAssignedSubjects(admin: SupabaseClient, schoolId: string, assignedSubjects: string[]) {
  if (!assignedSubjects.length) return "";

  const uniqueSubjects = Array.from(new Set(assignedSubjects.map((subject) => subject.trim()).filter(Boolean)));
  const { data, error } = await admin.from("subjects").select("name").eq("school_id", schoolId).in("name", uniqueSubjects);
  if (error) return "Could not validate assigned subjects.";

  const known = new Set((data ?? []).map((subject) => subject.name));
  const unknown = uniqueSubjects.filter((subject) => !known.has(subject));
  return unknown.length ? `Unknown assigned subject${unknown.length === 1 ? "" : "s"}: ${unknown.join(", ")}.` : "";
}

function selectPrimaryMembership(memberships: SchoolUserRow[]) {
  const activeMemberships = memberships.filter((membership) => membership.active);
  return activeMemberships.sort((a, b) => roleRank(a.role) - roleRank(b.role))[0] ?? null;
}

function roleRank(role: UserRole) {
  if (role === "platform_admin") return 1;
  if (role === "school_admin") return 2;
  if (role === "subject_lead") return 3;
  if (role === "teacher") return 4;
  return 5;
}
