import { NextResponse } from "next/server";
import { bearerToken, getActorProfile, getSupabaseAdmin } from "../../users/_helpers";

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
  if ("error" in actor) return NextResponse.json({ error: actor.error }, { status: 401 });

  const query = admin.from("schools").select("id,name,slug,active").order("name", { ascending: true });
  const { data, error } = actor.profile.role === "platform_admin" ? await query.returns<SchoolRow[]>() : await query.eq("id", actor.profile.school_id).returns<SchoolRow[]>();

  if (error) return NextResponse.json({ error: "Could not load schools." }, { status: 400 });
  return NextResponse.json({ schools: data ?? [] });
}
