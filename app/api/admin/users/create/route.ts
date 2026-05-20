import { NextResponse } from "next/server";
import { bearerToken, canManageUsers, getActorProfile, getSupabaseAdmin, normaliseStaffInput, upsertStaffUser } from "../_helpers";

export async function POST(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Supabase admin is not configured." }, { status: 500 });

  const actor = await getActorProfile(admin, bearerToken(request));
  if ("error" in actor) return NextResponse.json({ error: actor.error }, { status: 401 });
  if (!canManageUsers(actor.profile)) return NextResponse.json({ error: "Only platform admins and school admins can manage users." }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const input = normaliseStaffInput(body, actor.profile);
  const result = await upsertStaffUser(admin, actor.profile, input);

  if (!result.success) return NextResponse.json({ error: result.message }, { status: 400 });
  return NextResponse.json(result);
}
