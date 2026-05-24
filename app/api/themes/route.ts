import { NextResponse } from "next/server";
import { getSupabaseAdmin, getSupabaseAuthClient } from "@/app/api/admin/users/_helpers";

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

export async function GET(request: Request) {
  const client = getSupabaseAdmin() ?? getSupabaseAuthClient();
  if (!client) return NextResponse.json({ themes: [], elements: [] });

  const url = new URL(request.url);
  const requestedSchoolId = url.searchParams.get("schoolId");
  if (!requestedSchoolId || !looksLikeUuid(requestedSchoolId)) return NextResponse.json({ themes: [], elements: [] });
  const schoolId = requestedSchoolId;

  const [themesResult, elementsResult] = await Promise.all([
    client
    .from("cross_cutting_themes")
    .select("id,school_id,name,description,active")
    .eq("school_id", schoolId)
    .eq("active", true)
    .order("name", { ascending: true })
    .returns<ThemeRow[]>(),
    client
      .from("cross_cutting_theme_elements")
      .select("id,school_id,theme_id,name,description,display_order,active")
      .eq("school_id", schoolId)
      .eq("active", true)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true })
      .returns<ThemeElementRow[]>()
  ]);

  if (themesResult.error || elementsResult.error) return NextResponse.json({ themes: [], elements: [] });
  const elements = elementsResult.data ?? [];
  const themes = (themesResult.data ?? []).map((theme) => ({
    ...theme,
    elements: elements.filter((element) => element.theme_id === theme.id)
  }));
  return NextResponse.json({ themes, elements });
}

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
