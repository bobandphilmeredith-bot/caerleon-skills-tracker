import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "@/lib/auth";

export const protectedPlatformAdminEmail = "meredithp3@newportschools.wales";

export type StaffUserInput = {
  display_name: string;
  email: string;
  password: string;
  role: UserRole;
  assigned_subjects: string[];
  active: boolean;
  school_id: string;
};

type StaffProfile = {
  id: string;
  school_id: string;
  email: string;
  display_name: string | null;
  role: UserRole;
  assigned_subjects: string[] | null;
  active: boolean;
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

export function bearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

export async function getActorProfile(admin: SupabaseClient, token: string) {
  if (!token) return { error: "You must be signed in." };

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) return { error: "You must be signed in." };

  const { data: profile, error: profileError } = await admin
    .from("staff_profiles")
    .select("id,school_id,email,display_name,role,assigned_subjects,active")
    .eq("id", userData.user.id)
    .maybeSingle<StaffProfile>();

  if (profileError || !profile || !profile.active) return { error: "Access denied." };
  return { profile };
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
  const validation = validateInput(actor, input);
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
      school_id: input.school_id,
      email: input.email,
      display_name: input.display_name,
      role: input.role,
      assigned_subjects: input.assigned_subjects,
      active: input.active
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

function validateInput(actor: StaffProfile, input: StaffUserInput) {
  const roles: UserRole[] = ["platform_admin", "school_admin", "teacher", "subject_lead", "viewer"];
  if (!canManageUsers(actor)) return "Only platform admins and school admins can manage users.";
  if (!input.display_name) return "Name is required.";
  if (!input.email || !input.email.includes("@")) return "Valid email is required.";
  if (!roles.includes(input.role)) return "Invalid role.";
  if (!input.school_id) return "School is required.";
  if (actor.role !== "platform_admin" && input.school_id !== actor.school_id) return "School admins can only manage their own school.";
  if (actor.role !== "platform_admin" && input.role === "platform_admin") return "Only a platform admin can create a platform admin.";
  if (!input.password || input.password.length < 8) return "Temporary password must be at least 8 characters.";
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
    password: input.password,
    email_confirm: true,
    user_metadata: {
      display_name: input.display_name
    }
  });
  return { userId: data.user?.id, error: error?.message };
}

async function getStaffProfileById(admin: SupabaseClient, id: string) {
  const { data } = await admin.from("staff_profiles").select("role").eq("id", id).maybeSingle<Pick<StaffProfile, "role">>();
  return data;
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
