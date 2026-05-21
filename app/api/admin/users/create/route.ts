import { NextResponse } from "next/server";
import { bearerToken, canManageUsers, getActorProfile, getSupabaseAdmin, normaliseStaffInput, upsertStaffUser } from "../_helpers";

export async function POST(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Supabase admin is not configured." }, { status: 500 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const targetSchoolId = typeof body.school_id === "string" ? body.school_id : null;
  const actor = await getActorProfile(admin, bearerToken(request), targetSchoolId);
  if ("error" in actor) return NextResponse.json({ error: actor.error, debug: actor.debug }, { status: 401 });
  if (!canManageUsers(actor.profile)) {
    return NextResponse.json({
      error: "Only platform admins and school admins can manage users.",
      debug: debugFor(actor.profile, targetSchoolId, "Authenticated staff profile is active but role is not allowed to manage users.")
    }, { status: 403 });
  }

  const input = normaliseStaffInput(body, actor.profile);
  const result = await upsertStaffUser(admin, actor.profile, input);

  if (!result.success) return NextResponse.json({ error: result.message }, { status: 400 });
  return NextResponse.json(result);
}

function debugFor(profile: { id: string; email: string; role: string; school_id: string; active: boolean }, targetSchoolId: string | null, reason: string) {
  return {
    authenticated_user_id: profile.id,
    authenticated_email: profile.email,
    staff_profile_found: true,
    staff_profile_role: profile.role,
    staff_profile_school_id: profile.school_id,
    staff_profile_active: profile.active,
    target_school_id: targetSchoolId,
    reason
  };
}
