import { NextResponse } from "next/server";
import { bearerToken, getActorProfile, getSupabaseAdmin } from "@/app/api/admin/users/_helpers";

export const dynamic = "force-dynamic";

type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdmin>>;
type CsvRow = Record<string, string>;
type ReferenceData = Awaited<ReturnType<typeof loadReferenceData>>;
type ImportGroup = {
  key: string;
  rows: number[];
  subject: string;
  subjectId?: string;
  yearGroup: string;
  term: string;
  moduleCode: string;
  moduleTitle: string;
  curriculumIntent: string;
  sourceDetails: string[];
  frameworkLinks: FrameworkPreviewLink[];
  themeLinks: ThemePreviewLink[];
  unresolved: string[];
  errors: string[];
  existingMappingId?: string;
};
type FrameworkPreviewLink = {
  frameworkId: string;
  strandId: string;
  elementId: string;
  progressionDescriptorId: string;
  progressionStep: number;
  label: string;
  notes: string;
};
type ThemePreviewLink = {
  themeId: string;
  themeElementId: string;
  label: string;
  notes: string;
};

const requiredColumns = ["subject", "year_group", "term", "module_code", "module_title", "curriculum_intent"];

export async function POST(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Supabase admin is not configured." }, { status: 500 });
  const actor = await getActorProfile(admin, bearerToken(request));
  if ("error" in actor) return NextResponse.json({ error: actor.error }, { status: 401 });
  if (!canImport(actor.profile.role)) return NextResponse.json({ error: "Only school admins and platform admins can import curriculum mappings." }, { status: 403 });

  const payload = (await request.json().catch(() => ({}))) as { csv?: string; fileName?: string; action?: string; batchId?: string };
  if (payload.action === "undo") return undoImport(admin, actor.profile.id, actor.profile.school_id, String(payload.batchId ?? ""));
  if (payload.action === "history") return listBatches(admin, actor.profile.school_id);
  if (!payload.csv?.trim()) return NextResponse.json({ error: "Upload a CSV before previewing." }, { status: 400 });

  const refs = await loadReferenceData(admin, actor.profile.school_id);
  const preview = buildPreview(payload.csv, refs);
  if (payload.action !== "import") return NextResponse.json({ preview });

  const result = await runImport(admin, actor.profile.school_id, actor.profile.id, payload.fileName ?? "curriculum-import.csv", preview);
  return NextResponse.json({ preview, result });
}

async function loadReferenceData(admin: AdminClient, schoolId: string) {
  const [subjects, frameworks, strands, elements, descriptors, themes, themeElements, existingMappings] = await Promise.all([
    admin.from("subjects").select("id,name").eq("school_id", schoolId).order("name", { ascending: true }),
    admin.from("frameworks").select("id,name,short_name").eq("school_id", schoolId).eq("active", true),
    admin.from("strands").select("id,framework_id,name,short_name").eq("school_id", schoolId).eq("active", true),
    admin.from("elements").select("id,strand_id,name").eq("school_id", schoolId).eq("active", true),
    admin.from("progression_descriptors").select("id,element_id,progression_step,descriptor_text").eq("school_id", schoolId).eq("active", true),
    admin.from("cross_cutting_themes").select("id,name").eq("school_id", schoolId).eq("active", true),
    admin.from("cross_cutting_theme_elements").select("id,theme_id,name").eq("school_id", schoolId).eq("active", true),
    admin.from("curriculum_mappings").select("id,subject_id,year_group,term,scheme_reference").eq("school_id", schoolId)
  ]);
  return {
    subjects: (subjects.data ?? []) as { id: string; name: string }[],
    frameworks: (frameworks.data ?? []) as { id: string; name: string; short_name: string | null }[],
    strands: (strands.data ?? []) as { id: string; framework_id: string; name: string; short_name: string | null }[],
    elements: (elements.data ?? []) as { id: string; strand_id: string; name: string }[],
    descriptors: (descriptors.data ?? []) as { id: string; element_id: string; progression_step: number | string; descriptor_text: string | null }[],
    themes: (themes.data ?? []) as { id: string; name: string }[],
    themeElements: (themeElements.data ?? []) as { id: string; theme_id: string; name: string }[],
    existingMappings: (existingMappings.data ?? []) as { id: string; subject_id: string; year_group: string; term: string; scheme_reference: string }[]
  };
}

function buildPreview(csv: string, refs: ReferenceData) {
  const parsed = parseCsv(csv);
  const rows = parsed.rows;
  const headerSet = new Set(parsed.headers.map(normaliseHeader));
  const missingColumns = requiredColumns.filter((column) => !headerSet.has(column));
  const groups = new Map<string, ImportGroup>();
  let duplicateFrameworkLinks = 0;
  let duplicateThemeLinks = 0;

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const subjectName = value(row, "subject");
    const yearGroup = normaliseYearGroup(value(row, "year_group"));
    const term = normaliseTerm(value(row, "term"));
    const moduleCode = value(row, "module_code");
    const moduleTitle = value(row, "module_title");
    const curriculumIntent = value(row, "curriculum_intent");
    const groupKey = [normaliseText(subjectName), yearGroup, term, normaliseText(moduleCode), normaliseText(moduleTitle)].join("::");
    const subject = refs.subjects.find((candidate) => same(candidate.name, subjectName));
    const group =
      groups.get(groupKey) ??
      {
        key: groupKey,
        rows: [],
        subject: subjectName,
        subjectId: subject?.id,
        yearGroup,
        term,
        moduleCode,
        moduleTitle,
        curriculumIntent,
        sourceDetails: sourceDetails(row),
        frameworkLinks: [],
        themeLinks: [],
        unresolved: [],
        errors: [],
        existingMappingId: undefined
      };

    group.rows.push(rowNumber);
    if (!subject) group.errors.push(`Row ${rowNumber}: subject "${subjectName}" was not found.`);
    for (const column of requiredColumns) if (!value(row, column)) group.errors.push(`Row ${rowNumber}: ${column} is required.`);
    const existing = subject
      ? refs.existingMappings.find((mapping) => mapping.subject_id === subject.id && same(mapping.year_group, yearGroup) && same(mapping.term, term) && same(mapping.scheme_reference, moduleCode))
      : undefined;
    if (existing) group.existingMappingId = existing.id;

    const notes = combineNotes(value(row, "mapping_description"), value(row, "notes"));
    const frameworkLink = matchFrameworkLink(row, refs, rowNumber, notes);
    if (frameworkLink.link) {
      const before = group.frameworkLinks.length;
      group.frameworkLinks = mergeFrameworkLink(group.frameworkLinks, frameworkLink.link);
      if (group.frameworkLinks.length === before) duplicateFrameworkLinks += 1;
    }
    group.unresolved.push(...frameworkLink.unresolved);

    const themeLink = matchThemeLink(row, refs, rowNumber, notes);
    if (themeLink.link) {
      const before = group.themeLinks.length;
      group.themeLinks = mergeThemeLink(group.themeLinks, themeLink.link);
      if (group.themeLinks.length === before) duplicateThemeLinks += 1;
    }
    group.unresolved.push(...themeLink.unresolved);

    groups.set(groupKey, group);
  });

  const groupList = [...groups.values()].map((group) => ({ ...group, unresolved: unique(group.unresolved), errors: unique(group.errors) }));
  const frameworkLinkCount = groupList.reduce((sum, group) => sum + group.frameworkLinks.length, 0);
  const themeLinkCount = groupList.reduce((sum, group) => sum + group.themeLinks.length, 0);
  const existingCount = groupList.filter((group) => group.existingMappingId).length;
  return {
    summary: {
      rowsRead: rows.length,
      groupedMappings: groupList.length,
      frameworkLinksToCreate: frameworkLinkCount,
      cctElementLinksToCreate: themeLinkCount,
      duplicateLinksSkipped: duplicateFrameworkLinks + duplicateThemeLinks,
      unresolvedRows: groupList.filter((group) => group.unresolved.length).length,
      errors: missingColumns.length + groupList.reduce((sum, group) => sum + group.errors.length, 0),
      warnings: groupList.reduce((sum, group) => sum + group.unresolved.length, 0),
      existingMappingsSkipped: existingCount,
      missingColumns
    },
    groups: groupList
  };
}

async function runImport(admin: AdminClient, schoolId: string, userId: string, fileName: string, preview: ReturnType<typeof buildPreview>) {
  const importableGroups = preview.groups.filter((group) => !group.existingMappingId && !group.errors.length);
  const batch = await admin
    .from("curriculum_import_batches")
    .insert({
      school_id: schoolId,
      uploaded_by: userId,
      file_name: fileName,
      row_count: preview.summary.rowsRead,
      grouped_mapping_count: importableGroups.length,
      framework_link_count: importableGroups.reduce((sum, group) => sum + group.frameworkLinks.length, 0),
      theme_link_count: importableGroups.reduce((sum, group) => sum + group.themeLinks.length, 0)
    })
    .select("id")
    .single();
  if (batch.error || !batch.data) return { ok: false, message: batch.error?.message ?? "Could not create import batch." };

  const items: { batch_id: string; table_name: string; row_id: string; action: string }[] = [];
  let mappingsInserted = 0;
  let frameworkLinksInserted = 0;
  let themeLinksInserted = 0;

  for (const group of importableGroups) {
    if (!group.subjectId) continue;
    const mapping = await admin
      .from("curriculum_mappings")
      .insert({
        school_id: schoolId,
        subject_id: group.subjectId,
        year_group: group.yearGroup,
        term: group.term,
        scheme_reference: group.moduleCode,
        activity_title: group.moduleTitle,
        activity_description: group.curriculumIntent,
        task_description: "",
        created_by: userId
      })
      .select("id")
      .single();
    if (mapping.error || !mapping.data) continue;
    mappingsInserted += 1;
    items.push({ batch_id: batch.data.id, table_name: "curriculum_mappings", row_id: mapping.data.id, action: "inserted" });

    if (group.frameworkLinks.length) {
      const frameworkRows = group.frameworkLinks.map((link) => ({
        mapping_id: mapping.data.id,
        framework_id: link.frameworkId,
        strand_id: link.strandId,
        element_id: link.elementId,
        progression_descriptor_id: link.progressionDescriptorId,
        progression_step: link.progressionStep,
        notes: link.notes || null
      }));
      const inserted = await admin.from("curriculum_mapping_framework_links").insert(frameworkRows).select("id");
      for (const row of inserted.data ?? []) items.push({ batch_id: batch.data.id, table_name: "curriculum_mapping_framework_links", row_id: row.id, action: "inserted" });
      frameworkLinksInserted += inserted.data?.length ?? 0;
    }

    if (group.themeLinks.length) {
      const themeRows = group.themeLinks.map((link) => ({
        mapping_id: mapping.data.id,
        theme_id: link.themeId,
        theme_element_id: link.themeElementId,
        notes: link.notes || null,
        created_by: userId
      }));
      const inserted = await admin.from("curriculum_mapping_theme_links").insert(themeRows).select("id");
      for (const row of inserted.data ?? []) items.push({ batch_id: batch.data.id, table_name: "curriculum_mapping_theme_links", row_id: row.id, action: "inserted" });
      themeLinksInserted += inserted.data?.length ?? 0;
    }
  }

  if (items.length) await admin.from("curriculum_import_batch_items").insert(items);
  return { ok: true, batchId: batch.data.id, mappingsInserted, frameworkLinksInserted, themeLinksInserted, skippedExisting: preview.summary.existingMappingsSkipped };
}

async function listBatches(admin: AdminClient, schoolId: string) {
  const { data, error } = await admin
    .from("curriculum_import_batches")
    .select("id,file_name,row_count,grouped_mapping_count,framework_link_count,theme_link_count,status,created_at,undone_at")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) return NextResponse.json({ batches: [], error: error.message });
  return NextResponse.json({ batches: data ?? [] });
}

async function undoImport(admin: AdminClient, userId: string, schoolId: string, batchId: string) {
  if (!looksLikeUuid(batchId)) return NextResponse.json({ error: "Invalid import batch." }, { status: 400 });
  const batch = await admin.from("curriculum_import_batches").select("id,school_id,undone_at").eq("id", batchId).eq("school_id", schoolId).maybeSingle();
  if (batch.error || !batch.data) return NextResponse.json({ error: "Import batch was not found." }, { status: 404 });
  if (batch.data.undone_at) return NextResponse.json({ error: "This import has already been undone." }, { status: 400 });
  const items = await admin.from("curriculum_import_batch_items").select("table_name,row_id").eq("batch_id", batchId);
  if (items.error) return NextResponse.json({ error: items.error.message }, { status: 400 });
  const rows = (items.data ?? []) as { table_name: string; row_id: string }[];
  for (const table of ["curriculum_mapping_theme_links", "curriculum_mapping_framework_links", "curriculum_mappings"]) {
    const ids = rows.filter((row) => row.table_name === table).map((row) => row.row_id);
    if (ids.length) await admin.from(table).delete().in("id", ids);
  }
  await admin.from("curriculum_import_batches").update({ status: "undone", undone_at: new Date().toISOString(), undone_by: userId }).eq("id", batchId);
  return NextResponse.json({ ok: true });
}

function matchFrameworkLink(row: CsvRow, refs: ReferenceData, rowNumber: number, notes: string) {
  const unresolved: string[] = [];
  const framework = detectFramework(row, refs);
  if (!framework) return { unresolved, link: null };
  const rawStrand = stripFrameworkPrefix(value(row, "strand_name"));
  const strand = refs.strands.find((candidate) => candidate.framework_id === framework.id && (same(candidate.name, rawStrand) || same(candidate.short_name ?? "", rawStrand)));
  if (!strand) return { unresolved: [`Row ${rowNumber}: strand "${value(row, "strand_name")}" was not matched.`], link: null };
  const rawElement = stripLeadingCode(value(row, "element_name"));
  const element = refs.elements.find((candidate) => candidate.strand_id === strand.id && same(candidate.name, rawElement));
  if (!element) return { unresolved: [`Row ${rowNumber}: element "${value(row, "element_name")}" was not matched.`], link: null };
  const step = Number(String(value(row, "progression_step")).match(/[1-5]/)?.[0]);
  const descriptor = refs.descriptors.find((candidate) => candidate.element_id === element.id && Number(candidate.progression_step) === step && candidate.descriptor_text?.trim());
  if (!descriptor) return { unresolved: [`Row ${rowNumber}: progression step "${value(row, "progression_step")}" was not matched for ${element.name}.`], link: null };
  return {
    unresolved,
    link: {
      frameworkId: framework.id,
      strandId: strand.id,
      elementId: element.id,
      progressionDescriptorId: descriptor.id,
      progressionStep: step,
      label: `${framework.short_name ?? framework.name}: ${strand.short_name ?? strand.name} → ${element.name} → Step ${step}`,
      notes
    }
  };
}

function matchThemeLink(row: CsvRow, refs: ReferenceData, rowNumber: number, notes: string) {
  const frameworkType = value(row, "framework_type");
  const themeFocus = value(row, "cross_cutting_theme_focus") || value(row, "strand_name");
  const elementText = stripLeadingCode(value(row, "element_name"));
  const shouldTry = same(frameworkType, "CCT") || Boolean(value(row, "cross_cutting_theme_focus"));
  if (!shouldTry) return { unresolved: [], link: null };
  const theme = refs.themes.find((candidate) => same(candidate.name, themeFocus));
  if (!theme) return { unresolved: [`Row ${rowNumber}: CCT theme "${themeFocus}" was not matched.`], link: null };
  const element = refs.themeElements.find((candidate) => candidate.theme_id === theme.id && same(candidate.name, elementText));
  if (!element) return { unresolved: [`Row ${rowNumber}: CCT element "${value(row, "element_name")}" was not matched.`], link: null };
  return { unresolved: [], link: { themeId: theme.id, themeElementId: element.id, label: `${theme.name}: ${element.name}`, notes } };
}

function detectFramework(row: CsvRow, refs: ReferenceData) {
  const frameworkType = normaliseText(value(row, "framework_type"));
  const strandName = normaliseText(value(row, "strand_name"));
  let target = "";
  if (frameworkType === "dcf") target = "Digital Competence Framework";
  else if (frameworkType === "literacy" || strandName.startsWith("literacy ")) target = "Literacy Framework";
  else if (frameworkType === "numeracy" || strandName.startsWith("numeracy ")) target = "Numeracy Framework";
  else if (frameworkType === "lnf" && strandName.startsWith("literacy ")) target = "Literacy Framework";
  else if (frameworkType === "lnf" && strandName.startsWith("numeracy ")) target = "Numeracy Framework";
  if (!target) return null;
  return refs.frameworks.find((framework) => same(framework.name, target) || same(framework.short_name ?? "", target)) ?? null;
}

function mergeFrameworkLink(links: FrameworkPreviewLink[], link: FrameworkPreviewLink) {
  const existing = links.find((item) => item.frameworkId === link.frameworkId && item.strandId === link.strandId && item.elementId === link.elementId && item.progressionDescriptorId === link.progressionDescriptorId);
  if (!existing) return [...links, link];
  existing.notes = combineNotes(existing.notes, link.notes);
  return links;
}

function mergeThemeLink(links: ThemePreviewLink[], link: ThemePreviewLink) {
  const existing = links.find((item) => item.themeId === link.themeId && item.themeElementId === link.themeElementId);
  if (!existing) return [...links, link];
  existing.notes = combineNotes(existing.notes, link.notes);
  return links;
}

function parseCsv(csv: string) {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;
  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];
    if (char === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  row.push(field);
  if (row.some((cell) => cell.trim())) rows.push(row);
  const headers = (rows.shift() ?? []).map(normaliseHeader);
  return { headers, rows: rows.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index]?.trim() ?? ""]))) };
}

function value(row: CsvRow, column: string) {
  return String(row[normaliseHeader(column)] ?? "").trim();
}

function normaliseHeader(header: string) {
  return header.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function normaliseText(text: string) {
  return text.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function same(a: string, b: string) {
  return Boolean(a && b && normaliseText(a) === normaliseText(b));
}

function normaliseYearGroup(value: string) {
  const number = value.match(/\d+/)?.[0];
  return number ? `Y${number}` : value.trim();
}

function normaliseTerm(value: string) {
  const text = value.trim().toLowerCase();
  if (text.startsWith("aut")) return "Autumn";
  if (text.startsWith("spr")) return "Spring";
  if (text.startsWith("sum")) return "Summer";
  return value.trim();
}

function stripFrameworkPrefix(value: string) {
  return value.replace(/^(literacy|numeracy)\s*[-:]\s*/i, "").trim();
}

function stripLeadingCode(value: string) {
  return value.replace(/^\s*\d+(?:\.\d+)*\s*/, "").trim();
}

function combineNotes(...notes: string[]) {
  return unique(notes.map((note) => note.trim()).filter(Boolean)).join("\n");
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function sourceDetails(row: CsvRow) {
  return ["key_stage", "links_within_aole", "links_across_aoles", "source_file"].map((column) => {
    const cell = value(row, column);
    return cell ? `${column.replace(/_/g, " ")}: ${cell}` : "";
  }).filter(Boolean);
}

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function canImport(role: string) {
  return role === "platform_admin" || role === "school_admin";
}
