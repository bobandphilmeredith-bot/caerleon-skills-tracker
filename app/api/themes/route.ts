import { NextResponse, type NextRequest } from "next/server";
import { bearerToken, getActorProfile, getSupabaseAdmin } from "@/app/api/admin/users/_helpers";
import { readAllRows } from "@/lib/readAllRows";

export const dynamic = "force-dynamic";

type ThemeRow = {
  id: string;
  school_id: string;
  name: string;
  description: string | null;
  active: boolean | null;
};

type ThemeElementRow = {
  id: string;
  school_id: string;
  theme_id: string;
  name: string;
  description: string | null;
  display_order: number | null;
  active: boolean | null;
};

export async function GET(request: NextRequest) {
  const client = getSupabaseAdmin();
  if (!client) return NextResponse.json({ error: "Theme data service is not configured." }, { status: 503 });

  const token = bearerToken(request) || request.cookies.get("caerleon-supabase-access-token")?.value || "";
  const actor = await getActorProfile(client, token);
  if ("error" in actor) return NextResponse.json({ error: actor.error }, { status: 401 });

  const url = new URL(request.url);
  const requestedSchoolId = url.searchParams.get("schoolId");
  if (!requestedSchoolId || !looksLikeUuid(requestedSchoolId)) return NextResponse.json({ error: "A valid school is required." }, { status: 400 });
  if (actor.profile.role !== "platform_admin" && actor.profile.school_id !== requestedSchoolId) {
    return NextResponse.json({ error: "You can only read themes for your own school." }, { status: 403 });
  }
  const schoolId = requestedSchoolId;

  const [themesResult, elementsResult] = await Promise.all([
    readAllRows(client
    .from("cross_cutting_themes")
    .select("id,school_id,name,description,active")
    .eq("school_id", schoolId)
    .eq("active", true)
    .order("name", { ascending: true }).order("id")
    .returns<ThemeRow[]>()),
    readAllRows(client
      .from("cross_cutting_theme_elements")
      .select("id,school_id,theme_id,name,description,display_order,active")
      .eq("school_id", schoolId)
      .eq("active", true)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true }).order("id")
      .returns<ThemeElementRow[]>())
  ]);

  if (themesResult.error || elementsResult.error) return NextResponse.json({ error: "The school theme catalogue could not be loaded completely." }, { status: 502 });
  const elements = elementsResult.data ?? [];
  const themes = (themesResult.data ?? []).map((theme) => ({
    ...theme,
    elements: elements.filter((element) => element.theme_id === theme.id)
  }));
  return NextResponse.json({ themes, elements }, { headers: { "Cache-Control": "private, no-store" } });
}

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
