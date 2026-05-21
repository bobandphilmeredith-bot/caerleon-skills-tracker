"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useSchoolSettings } from "@/lib/schoolSettings";
import { buildBundle, createEmptySchoolData, defaultSchoolId, sampleSchools, schoolDataById, type SchoolDataBundle } from "@/lib/multiSchoolData";
import { isDemoLoginEnabled, supabase } from "@/lib/supabaseClient";
import type { MappingEntry, ProgressionReference, School, SubjectConfig } from "@/lib/types";

type MappingMutationResult = {
  ok: boolean;
  message?: string;
};

type CurrentSchoolContextValue = {
  schools: School[];
  currentSchool: School;
  currentSchoolId: string;
  data: SchoolDataBundle;
  switchSchool: (schoolId: string) => void;
  addSchool: () => School;
  updateSchool: (schoolId: string, patch: Partial<School>) => void;
  toggleSchoolActive: (schoolId: string) => void;
  resolveSchoolBySlug: (slug: string) => School | undefined;
  addMapping: (entry: MappingEntry) => Promise<MappingMutationResult>;
  updateMapping: (entryId: string, patch: Partial<MappingEntry>) => Promise<MappingMutationResult>;
  deleteMapping: (entryId: string) => Promise<MappingMutationResult>;
};

const CurrentSchoolContext = createContext<CurrentSchoolContextValue | null>(null);

export function CurrentSchoolProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const { updateBranding } = useSchoolSettings();
  const [schools, setSchools] = useState<School[]>(sampleSchools);
  const [currentSchoolId, setCurrentSchoolId] = useState(defaultSchoolId);
  const [customData, setCustomData] = useState<Record<string, SchoolDataBundle>>({});
  const [mappingOverrides, setMappingOverrides] = useState<Record<string, MappingEntry[]>>({});
  const [liveMappings, setLiveMappings] = useState<MappingEntry[]>([]);
  const [liveReferenceMaps, setLiveReferenceMaps] = useState<LiveReferenceMaps | null>(null);

  useEffect(() => {
    const savedSchools = window.localStorage.getItem("skills-tracker-schools");
    const savedCurrent = window.localStorage.getItem("skills-tracker-current-school");
    if (savedSchools) {
      try {
        setSchools(JSON.parse(savedSchools));
      } catch {
        setSchools(sampleSchools);
      }
    }
    if (savedCurrent) setCurrentSchoolId(savedCurrent);
  }, []);

  const currentSchool = schools.find((school) => school.id === currentSchoolId) ?? schools[0] ?? sampleSchools[0];
  const baseData = customData[currentSchool.id] ?? schoolDataById[currentSchool.id] ?? createEmptySchoolData(currentSchool.id);
  const liveSchoolId = isDemoLoginEnabled ? currentSchool.id : currentUser?.schoolId;
  const currentMappings = isDemoLoginEnabled ? (mappingOverrides[currentSchool.id] ?? baseData.mappings) : liveMappings;
  const data = useMemo(
    () =>
      buildBundle({
        schoolId: currentSchool.id,
        subjectConfigs: baseData.subjectConfigs,
        aoleConfigs: baseData.aoleConfigs,
        frameworkLibrary: baseData.frameworkLibrary,
        mappings: currentMappings
      }),
    [baseData, currentMappings, currentSchool.id]
  );

  useEffect(() => {
    if (!isDemoLoginEnabled) return;
    const savedMappings = window.localStorage.getItem(mappingStorageKey(currentSchool.id));
    if (!savedMappings) return;
    try {
      const parsed = JSON.parse(savedMappings) as MappingEntry[];
      setMappingOverrides((current) => ({ ...current, [currentSchool.id]: parsed }));
    } catch {
      window.localStorage.removeItem(mappingStorageKey(currentSchool.id));
    }
  }, [currentSchool.id]);

  const loadLiveMappings = useCallback(async () => {
    if (isDemoLoginEnabled || !supabase || !liveSchoolId) {
      if (!isDemoLoginEnabled) setLiveMappings([]);
      return;
    }

    const client = supabase;
    const refs = await loadLiveReferenceMaps(client, liveSchoolId);
    const { data: rows, error } = await client
      .from("curriculum_entries")
      .select(
        "id,school_id,subject_id,framework_id,strand_id,element_id,year_group,term,unit_topic,learning_activity_description,scheme_reference,progression_reference,optional_note,last_mapped_date,created_at,updated_at"
      )
      .eq("school_id", liveSchoolId)
      .order("last_mapped_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      setLiveMappings([]);
      setLiveReferenceMaps(refs);
      return;
    }

    setLiveReferenceMaps(refs);
    setLiveMappings(((rows ?? []) as CurriculumEntryRow[]).map((row) => curriculumRowToMapping(row, refs)));
  }, [liveSchoolId]);

  useEffect(() => {
    void loadLiveMappings();
  }, [loadLiveMappings]);

  useEffect(() => {
    window.localStorage.setItem("skills-tracker-schools", JSON.stringify(schools));
  }, [schools]);

  useEffect(() => {
    window.localStorage.setItem("skills-tracker-current-school", currentSchool.id);
    updateBranding({
      schoolName: currentSchool.name,
      motto: currentSchool.motto,
      primaryColour: currentSchool.primaryColour,
      secondaryColour: currentSchool.secondaryColour,
      logoDataUrl: currentSchool.logoUrl
    });
  }, [currentSchool.id, currentSchool.name, currentSchool.motto, currentSchool.primaryColour, currentSchool.secondaryColour, currentSchool.logoUrl]);

  useEffect(() => {
    if (!isDemoLoginEnabled) return;
    const mappings = mappingOverrides[currentSchool.id];
    if (mappings) window.localStorage.setItem(mappingStorageKey(currentSchool.id), JSON.stringify(mappings));
  }, [currentSchool.id, mappingOverrides]);

  const value = useMemo<CurrentSchoolContextValue>(
    () => ({
      schools,
      currentSchool,
      currentSchoolId: currentSchool.id,
      data,
      switchSchool: (schoolId) => {
        const next = schools.find((school) => school.id === schoolId && school.active);
        if (next) setCurrentSchoolId(next.id);
      },
      addSchool: () => {
        const id = `school_${Date.now()}`;
        const newSchool: School = {
          id,
          slug: `school-${schools.length + 1}`,
          name: "New School",
          motto: "Curriculum visibility",
          logoUrl: "/schlogo.png",
          primaryColour: "#1D3557",
          secondaryColour: "#0F2238",
          active: true,
          createdAt: new Date().toISOString().slice(0, 10)
        };
        setSchools((current) => [...current, newSchool]);
        setCustomData((current) => ({
          ...current,
          [id]: createEmptySchoolData(id, defaultNewSchoolSubjects(id))
        }));
        return newSchool;
      },
      updateSchool: (schoolId, patch) => {
        setSchools((current) => current.map((school) => (school.id === schoolId ? { ...school, ...patch } : school)));
      },
      toggleSchoolActive: (schoolId) => {
        setSchools((current) => current.map((school) => (school.id === schoolId ? { ...school, active: !school.active } : school)));
      },
      resolveSchoolBySlug: (slug) => schools.find((school) => school.slug === slug),
      addMapping: async (entry) => {
        if (!isDemoLoginEnabled) {
          if (!supabase) return { ok: false, message: "Supabase environment variables are missing." };
          if (!liveSchoolId) return { ok: false, message: "No live school is linked to this account." };

          const client = supabase;
          const refs = liveReferenceMaps ?? (await loadLiveReferenceMaps(client, liveSchoolId));
          const ids = resolveLiveIds(entry, refs);
          if (!ids.ok) return { ok: false, message: ids.message };

          const { error } = await client.from("curriculum_entries").insert({
            school_id: liveSchoolId,
            subject_id: ids.subjectId,
            framework_id: ids.frameworkId,
            strand_id: ids.strandId,
            element_id: ids.elementId,
            year_group: entry.year,
            term: entry.term,
            unit_topic: entry.unit || entry.context,
            learning_activity_description: entry.activityDescription,
            scheme_reference: entry.schemeReference,
            progression_reference: toDatabaseProgression(entry.progressionReference),
            optional_note: entry.note?.trim() || null,
            last_mapped_date: entry.lastMappedDate,
            created_by: currentUser?.id ?? null,
            updated_by: currentUser?.id ?? null
          });

          if (error) return { ok: false, message: error.message };
          await loadLiveMappings();
          return { ok: true };
        }

        setMappingOverrides((current) => {
          const existing = current[currentSchool.id] ?? data.mappings;
          return { ...current, [currentSchool.id]: [{ ...entry, schoolId: currentSchool.id }, ...existing] };
        });
        return { ok: true };
      },
      updateMapping: async (entryId, patch) => {
        if (!isDemoLoginEnabled) {
          if (!supabase) return { ok: false, message: "Supabase environment variables are missing." };
          if (!liveSchoolId) return { ok: false, message: "No live school is linked to this account." };

          const existing = liveMappings.find((entry) => entry.id === entryId);
          if (!existing) return { ok: false, message: "Mapping entry not found." };

          const merged = { ...existing, ...patch };
          const client = supabase;
          const refs = liveReferenceMaps ?? (await loadLiveReferenceMaps(client, liveSchoolId));
          const ids = resolveLiveIds(merged, refs);
          if (!ids.ok) return { ok: false, message: ids.message };

          const { error } = await client
            .from("curriculum_entries")
            .update({
              subject_id: ids.subjectId,
              framework_id: ids.frameworkId,
              strand_id: ids.strandId,
              element_id: ids.elementId,
              year_group: merged.year,
              term: merged.term,
              unit_topic: merged.unit || merged.context,
              learning_activity_description: merged.activityDescription,
              scheme_reference: merged.schemeReference,
              progression_reference: toDatabaseProgression(merged.progressionReference),
              optional_note: merged.note?.trim() || null,
              last_mapped_date: merged.lastMappedDate,
              updated_by: currentUser?.id ?? null
            })
            .eq("id", entryId)
            .eq("school_id", liveSchoolId);

          if (error) return { ok: false, message: error.message };
          await loadLiveMappings();
          return { ok: true };
        }

        setMappingOverrides((current) => {
          const existing = current[currentSchool.id] ?? data.mappings;
          return { ...current, [currentSchool.id]: existing.map((entry) => (entry.id === entryId ? { ...entry, ...patch, schoolId: currentSchool.id } : entry)) };
        });
        return { ok: true };
      },
      deleteMapping: async (entryId) => {
        if (!isDemoLoginEnabled) {
          if (!supabase) return { ok: false, message: "Supabase environment variables are missing." };
          if (!liveSchoolId) return { ok: false, message: "No live school is linked to this account." };

          const { error } = await supabase.from("curriculum_entries").delete().eq("id", entryId).eq("school_id", liveSchoolId);
          if (error) return { ok: false, message: error.message };
          await loadLiveMappings();
          return { ok: true };
        }

        setMappingOverrides((current) => {
          const existing = current[currentSchool.id] ?? data.mappings;
          return { ...current, [currentSchool.id]: existing.filter((entry) => entry.id !== entryId) };
        });
        return { ok: true };
      }
    }),
    [currentSchool, currentUser?.id, data, liveMappings, liveReferenceMaps, liveSchoolId, loadLiveMappings, schools]
  );

  return <CurrentSchoolContext.Provider value={value}>{children}</CurrentSchoolContext.Provider>;
}

function mappingStorageKey(schoolId: string) {
  return `skills-tracker-mappings-${schoolId}`;
}

type SupabaseClient = NonNullable<typeof supabase>;

type ReferenceRow = {
  id: string;
  name: string;
};

type StrandReferenceRow = ReferenceRow & {
  framework_id: string;
};

type ElementReferenceRow = ReferenceRow & {
  strand_id: string;
};

type LiveReferenceMaps = {
  subjectsByName: Map<string, ReferenceRow>;
  subjectsById: Map<string, ReferenceRow>;
  frameworksByName: Map<string, ReferenceRow>;
  frameworksById: Map<string, ReferenceRow>;
  strandsByKey: Map<string, StrandReferenceRow>;
  strandsById: Map<string, StrandReferenceRow>;
  elementsByKey: Map<string, ElementReferenceRow>;
  elementsById: Map<string, ElementReferenceRow>;
};

type CurriculumEntryRow = {
  id: string;
  school_id: string;
  subject_id: string;
  framework_id: string;
  strand_id: string;
  element_id: string;
  year_group: string;
  term: string;
  unit_topic: string;
  learning_activity_description: string;
  scheme_reference: string;
  progression_reference: string;
  optional_note: string | null;
  last_mapped_date: string;
  created_at: string;
  updated_at: string;
};

async function loadLiveReferenceMaps(client: SupabaseClient, schoolId: string): Promise<LiveReferenceMaps> {
  const [subjectsResult, frameworksResult, strandsResult, elementsResult] = await Promise.all([
    client.from("subjects").select("id,name").eq("school_id", schoolId).eq("active", true),
    client.from("frameworks").select("id,name").eq("school_id", schoolId).eq("active", true),
    client.from("strands").select("id,name,framework_id").eq("school_id", schoolId).eq("active", true),
    client.from("elements").select("id,name,strand_id").eq("school_id", schoolId).eq("active", true)
  ]);

  const subjects = ((subjectsResult.data ?? []) as ReferenceRow[]).map(normaliseReferenceName);
  const frameworks = ((frameworksResult.data ?? []) as ReferenceRow[]).map(normaliseReferenceName);
  const strands = ((strandsResult.data ?? []) as StrandReferenceRow[]).map(normaliseReferenceName);
  const elements = ((elementsResult.data ?? []) as ElementReferenceRow[]).map(normaliseReferenceName);

  const frameworksById = new Map(frameworks.map((row) => [row.id, row]));
  const strandsById = new Map(strands.map((row) => [row.id, row]));
  const strandsByKey = new Map<string, StrandReferenceRow>();
  const elementsByKey = new Map<string, ElementReferenceRow>();

  for (const strand of strands) {
    const framework = frameworksById.get(strand.framework_id);
    if (framework) strandsByKey.set(referenceKey(framework.name, strand.name), strand);
  }

  for (const element of elements) {
    const strand = strandsById.get(element.strand_id);
    const framework = strand ? frameworksById.get(strand.framework_id) : undefined;
    if (framework && strand) elementsByKey.set(referenceKey(framework.name, strand.name, element.name), element);
  }

  return {
    subjectsByName: new Map(subjects.map((row) => [row.name, row])),
    subjectsById: new Map(subjects.map((row) => [row.id, row])),
    frameworksByName: new Map(frameworks.map((row) => [row.name, row])),
    frameworksById,
    strandsByKey,
    strandsById,
    elementsByKey,
    elementsById: new Map(elements.map((row) => [row.id, row]))
  };
}

function normaliseReferenceName<T extends ReferenceRow>(row: T): T {
  return { ...row, name: row.name.trim() };
}

function referenceKey(...parts: string[]) {
  return parts.map((part) => part.trim().toLowerCase()).join("::");
}

function resolveLiveIds(entry: MappingEntry, refs: LiveReferenceMaps):
  | { ok: true; subjectId: string; frameworkId: string; strandId: string; elementId: string }
  | { ok: false; message: string } {
  const subject = refs.subjectsByName.get(entry.subject.trim());
  if (!subject) return { ok: false, message: `Subject not found in Supabase: ${entry.subject}` };

  const framework = refs.frameworksByName.get(entry.framework.trim());
  if (!framework) return { ok: false, message: `Framework not found in Supabase: ${entry.framework}` };

  const strand = refs.strandsByKey.get(referenceKey(entry.framework, entry.strand));
  if (!strand) return { ok: false, message: `Strand not found in Supabase: ${entry.framework} → ${entry.strand}` };

  const element = refs.elementsByKey.get(referenceKey(entry.framework, entry.strand, entry.element));
  if (!element) return { ok: false, message: `Element not found in Supabase: ${entry.framework} → ${entry.strand} → ${entry.element}` };

  return { ok: true, subjectId: subject.id, frameworkId: framework.id, strandId: strand.id, elementId: element.id };
}

function curriculumRowToMapping(row: CurriculumEntryRow, refs: LiveReferenceMaps): MappingEntry {
  const subject = refs.subjectsById.get(row.subject_id)?.name ?? "Unknown subject";
  const framework = refs.frameworksById.get(row.framework_id)?.name ?? "Unknown framework";
  const strand = refs.strandsById.get(row.strand_id)?.name ?? "Unknown strand";
  const element = refs.elementsById.get(row.element_id)?.name ?? "Unknown element";

  return {
    schoolId: row.school_id,
    id: row.id,
    subject,
    framework,
    strand,
    element,
    context: row.unit_topic,
    year: row.year_group,
    term: row.term,
    unit: row.unit_topic,
    activityDescription: row.learning_activity_description,
    schemeReference: row.scheme_reference,
    progressionReference: fromDatabaseProgression(row.progression_reference),
    note: row.optional_note ?? "",
    lastMappedDate: row.last_mapped_date || row.updated_at?.slice(0, 10) || row.created_at.slice(0, 10)
  };
}

function toDatabaseProgression(reference: ProgressionReference | undefined) {
  if (reference === "Step 3–4") return "Step 3-4";
  if (reference === "Step 4–5") return "Step 4-5";
  return reference ?? "Not specified";
}

function fromDatabaseProgression(reference: string): ProgressionReference {
  if (reference === "Step 3-4") return "Step 3–4";
  if (reference === "Step 4-5") return "Step 4–5";
  if (["Step 1", "Step 2", "Step 3", "Step 4", "Step 5", "Not specified"].includes(reference)) return reference as ProgressionReference;
  return "Not specified";
}

export function useCurrentSchool() {
  const value = useContext(CurrentSchoolContext);
  if (!value) throw new Error("useCurrentSchool must be used within CurrentSchoolProvider");
  return value;
}

export function useCurrentSchoolData() {
  return useCurrentSchool().data;
}

function defaultNewSchoolSubjects(schoolId: string): SubjectConfig[] {
  return ["English", "Maths", "Science", "Humanities", "Technology"].map((name, index) => ({
    schoolId,
    id: `${schoolId}-${name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
    aole: undefined,
    active: true,
    displayOrder: index + 1,
    appearsInMappingDropdowns: true
  }));
}
