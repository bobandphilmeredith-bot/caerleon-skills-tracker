import { NextResponse } from "next/server";
import { bearerToken, canManageUsers, getActorProfile, getSupabaseAdmin, listManagedUsers } from "../_helpers";

export async function GET(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Supabase admin is not configured." }, { status: 500 });

  const actor = await getActorProfile(admin, bearerToken(request));
  if ("error" in actor) return NextResponse.json({ error: actor.error }, { status: 401 });
  if (!canManageUsers(actor.profile)) return NextResponse.json({ error: "Only platform admins and school admins can manage users." }, { status: 403 });

  const result = await listManagedUsers(admin, actor.profile);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({ users: result.users ?? [] });
}
