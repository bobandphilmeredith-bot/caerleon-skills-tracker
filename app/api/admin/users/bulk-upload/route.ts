import { NextResponse } from "next/server";
import type { UserRole } from "@/lib/auth";
import { bearerToken, canManageUsers, getActorProfile, getSupabaseAdmin, normaliseStaffInput, upsertStaffUser } from "../_helpers";

type UploadRow = {
  display_name: string;
  email: string;
  role: string;
  assigned_subjects: string;
  active: string;
  password: string;
};

const validRoles: UserRole[] = ["platform_admin", "school_admin", "teacher", "subject_lead", "viewer"];

export async function POST(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Supabase admin is not configured." }, { status: 500 });

  const actor = await getActorProfile(admin, bearerToken(request));
  if ("error" in actor) return NextResponse.json({ error: actor.error }, { status: 401 });
  if (!canManageUsers(actor.profile)) return NextResponse.json({ error: "Only platform admins and school admins can manage users." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const csv = typeof body?.csv === "string" ? body.csv : "";
  const schoolId = typeof body?.school_id === "string" ? body.school_id : actor.profile.school_id;
  if (!csv.trim()) return NextResponse.json({ error: "CSV content is required." }, { status: 400 });

  const rows = parseCsv(csv);
  const [header, ...records] = rows;
  const expected = ["display_name", "email", "role", "assigned_subjects", "active", "password"];
  if (!header || expected.some((column, index) => header[index]?.trim() !== column)) {
    return NextResponse.json({ error: `CSV header must be: ${expected.join(",")}` }, { status: 400 });
  }

  const results = [];
  for (let index = 0; index < records.length; index += 1) {
    const record = recordFromRow(records[index]);
    if (!record.email && !record.display_name) continue;

    if (!record.display_name || !record.email || !record.role || !record.password) {
      results.push({ row: index + 2, email: record.email, success: false, message: "Missing required fields." });
      continue;
    }
    if (!validRoles.includes(record.role as UserRole)) {
      results.push({ row: index + 2, email: record.email, success: false, message: "Invalid role." });
      continue;
    }

    const input = normaliseStaffInput(
      {
        display_name: record.display_name,
        email: record.email,
        password: record.password,
        role: record.role as UserRole,
        assigned_subjects: record.assigned_subjects ? record.assigned_subjects.split(";").map((item) => item.trim()).filter(Boolean) : [],
        active: record.active.toLowerCase() !== "false",
        school_id: schoolId
      },
      actor.profile
    );
    const result = await upsertStaffUser(admin, actor.profile, input);
    results.push({ row: index + 2, email: input.email, success: result.success, message: result.message });
  }

  return NextResponse.json({ results });
}

function recordFromRow(row: string[]): UploadRow {
  return {
    display_name: row[0]?.trim() ?? "",
    email: row[1]?.trim() ?? "",
    role: row[2]?.trim() ?? "",
    assigned_subjects: row[3]?.trim() ?? "",
    active: row[4]?.trim() ?? "true",
    password: row[5]?.trim() ?? ""
  };
}

function parseCsv(csv: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((item) => item.trim())) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }

  row.push(cell);
  if (row.some((item) => item.trim())) rows.push(row);
  return rows;
}
