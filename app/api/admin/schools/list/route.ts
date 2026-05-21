import { NextResponse } from "next/server";
import { bearerToken, canManageUsers, getActorProfile, getSupabaseAdmin, type StaffProfile } from "../../users/_helpers";

type SchoolRow = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
};

export async function GET(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Supabase admin is not configured." }, { status: 500 });

  const actor = await getActorProfile(admin, bearerToken(request));
  if ("error" in actor) return NextResponse.json({ error: actor.error, debug: actor.debug }, { status: 401 });
  if (!canManageUsers(actor.profile)) {
    return NextResponse.json({ error: "Only platform admins and school admins can load schools for user management.", debug: debugFor(actor.profile, "Role is not allowed to manage users.") }, { status: 403 });
  }

  const query = admin.from("schools").select("id,name,slug,active").eq("active", true).order("name", { ascending: true });
  const { data, error } = actor.profile.role === "platform_admin" ? await query.returns<SchoolRow[]>() : await query.eq("id", actor.profile.school_id).returns<SchoolRow[]>();

  if (error) return NextResponse.json({ error: "Could not load schools.", debug: debugFor(actor.profile, "Supabase schools query failed.") }, { status: 400 });
  return NextResponse.json({ schools: data ?? [] });
}

function debugFor(profile: StaffProfile, reason: string) {
  return {
    authenticated_user_id: profile.id,
    authenticated_email: profile.email,
    staff_profile_found: true,
    staff_profile_role: profile.role,
    staff_profile_school_id: profile.school_id,
    staff_profile_active: profile.active,
    reason
  };
}
