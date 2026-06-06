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

  const payload = await readUploadPayload(request);
  const csv = payload.csv;
  const requestedSchoolId = payload.schoolId;
  const actor = await getActorProfile(admin, bearerToken(request), requestedSchoolId);
  if ("error" in actor) return NextResponse.json({ error: actor.error, debug: actor.debug }, { status: 401 });
  if (!canManageUsers(actor.profile)) {
    return NextResponse.json({ error: "Only platform admins and school admins can manage users.", debug: debugFor(actor.profile, requestedSchoolId) }, { status: 403 });
  }

  const schoolId = requestedSchoolId ?? actor.profile.school_id;
  if (!csv.trim()) return NextResponse.json({ error: "CSV content is required." }, { status: 400 });

  const rows = parseCsv(csv);
  const { records, startRow } = rowsWithOptionalHeader(rows);
  const expected = ["display_name", "email", "role", "assigned_subjects", "active", "password"];
  if (!records.length) {
    return NextResponse.json({ error: `CSV content is required. Paste rows with or without this header: ${expected.join(",")}` }, { status: 400 });
  }

  const results = [];
  for (let index = 0; index < records.length; index += 1) {
    const record = recordFromRow(records[index]);
    if (!record.email && !record.display_name) continue;

    if (!record.display_name || !record.email || !record.role || !record.password) {
      results.push({ row: startRow + index, email: record.email, success: false, message: "Missing required fields." });
      continue;
    }
    if (!validRoles.includes(record.role as UserRole)) {
      results.push({ row: startRow + index, email: record.email, success: false, message: "Invalid role." });
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
    results.push({ row: startRow + index, email: input.email, success: result.success, message: result.message });
  }

  return NextResponse.json({ results });
}

async function readUploadPayload(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file");
    const schoolIdValue = formData.get("school_id");
    const csvValue = formData.get("csv");
    const fileText = hasTextMethod(file) ? await file.text() : "";
    return {
      csv: fileText || (typeof csvValue === "string" ? csvValue : ""),
      schoolId: typeof schoolIdValue === "string" ? schoolIdValue : null
    };
  }

  const body = await request.json().catch(() => null);
  return {
    csv: typeof body?.csv === "string" ? body.csv : "",
    schoolId: typeof body?.school_id === "string" ? body.school_id : null
  };
}

function hasTextMethod(value: FormDataEntryValue | null): value is File {
  return Boolean(value && typeof value !== "string" && typeof value.text === "function");
}

function debugFor(profile: { id: string; email: string; role: string; school_id: string }, targetSchoolId: string | null) {
  return {
    authenticated_user_id: profile.id,
    authenticated_email: profile.email,
    staff_profile_role: profile.role,
    staff_profile_school_id: profile.school_id,
    target_school_id: targetSchoolId
  };
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

function rowsWithOptionalHeader(rows: string[][]) {
  const expected = ["display_name", "email", "role", "assigned_subjects", "active", "password"];
  const firstRow = rows[0] ?? [];
  const firstRowLooksLikeHeader = expected.every((column, index) => firstRow[index]?.trim().toLowerCase() === column);

  return firstRowLooksLikeHeader
    ? { records: rows.slice(1), startRow: 2 }
    : { records: rows, startRow: 1 };
}
