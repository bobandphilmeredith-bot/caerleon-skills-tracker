import { NextResponse } from "next/server";
import { getSupabaseAdmin, getSupabaseAuthClient } from "@/app/api/admin/users/_helpers";

const caerleonSchoolId = "657f5a77-ae52-48ea-b459-290f86bbd2f0";

type ThemeRow = {
  id: string;
  school_id: string;
  name: string;
  description: string | null;
  active: boolean | null;
};

export async function GET(request: Request) {
  const client = getSupabaseAdmin() ?? getSupabaseAuthClient();
  if (!client) return NextResponse.json({ themes: [] });

  const url = new URL(request.url);
  const requestedSchoolId = url.searchParams.get("schoolId");
  const schoolId = requestedSchoolId && looksLikeUuid(requestedSchoolId) ? requestedSchoolId : caerleonSchoolId;

  const { data, error } = await client
    .from("themes")
    .select("id,school_id,name,description,active")
    .eq("school_id", schoolId)
    .eq("active", true)
    .order("name", { ascending: true })
    .returns<ThemeRow[]>();

  if (error) return NextResponse.json({ themes: [] });
  return NextResponse.json({ themes: data ?? [] });
}

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
