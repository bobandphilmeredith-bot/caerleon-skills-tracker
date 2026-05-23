"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useSchoolSettings } from "@/lib/schoolSettings";
import { buildBundle, createEmptySchoolData, defaultSchoolId, sampleSchools, schoolDataById, type SchoolDataBundle } from "@/lib/multiSchoolData";
import { isDemoLoginEnabled, supabase } from "@/lib/supabaseClient";
import type { CrossCuttingTheme, MappingEntry, ProgressionReference, ProgressionStep, School, SubjectConfig } from "@/lib/types";

type MappingMutationResult = {
  ok: boolean;
  message?: string;
};

type LiveDataDiagnostics = {
  schoolId: string;
  schoolSlug: string;
  subjectQuerySelect: string;
  subjectQueryCount: number;
  subjectQueryError: string | null;
  frameworkQueryCount: number;
  frameworkQueryError: string | null;
  strandQueryCount: number;
  strandQueryError: string | null;
  elementQueryCount: number;
  elementQueryError: string | null;
  descriptorQueryCount: number;
  descriptorQueryError: string | null;
};

type CurrentSchoolContextValue = {
  schools: School[];
  currentSchool: School;
  currentSchoolId: string;
  data: SchoolDataBundle;
  liveDiagnostics?: LiveDataDiagnostics | null;
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
  const [liveSchool, setLiveSchool] = useState<School | null>(null);
  const [liveDiagnostics, setLiveDiagnostics] = useState<LiveDataDiagnostics | null>(null);

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

  const localCurrentSchool = schools.find((school) => school.id === currentSchoolId) ?? schools[0] ?? sampleSchools[0];
  const currentSchool = !isDemoLoginEnabled && liveSchool ? liveSchool : localCurrentSchool;
  const baseData = customData[currentSchool.id] ?? schoolDataById[currentSchool.id] ?? createEmptySchoolData(currentSchool.id);
  const liveSchoolId = isDemoLoginEnabled ? currentSchool.id : (liveSchool?.id ?? currentUser?.schoolId ?? "caerleon");
  const useLiveData = !isDemoLoginEnabled && Boolean(liveReferenceMaps);
  const currentMappings = useLiveData ? liveMappings : (mappingOverrides[currentSchool.id] ?? baseData.mappings);
  const currentFrameworkLibrary = useLiveData ? (liveReferenceMaps?.frameworkLibrary ?? []) : baseData.frameworkLibrary;
  const currentSubjectConfigs = useLiveData ? (liveReferenceMaps?.subjectConfigs ?? []) : baseData.subjectConfigs;
  const currentCrossCuttingThemes = isDemoLoginEnabled ? baseData.crossCuttingThemes : (liveReferenceMaps?.crossCuttingThemes ?? []);
  const data = useMemo(
    () =>
      buildBundle({
        schoolId: currentSchool.id,
        subjectConfigs: currentSubjectConfigs,
        aoleConfigs: baseData.aoleConfigs,
        frameworkLibrary: currentFrameworkLibrary,
        crossCuttingThemes: currentCrossCuttingThemes,
        mappings: currentMappings
      }),
    [baseData.aoleConfigs, currentCrossCuttingThemes, currentFrameworkLibrary, currentMappings, currentSchool.id, currentSubjectConfigs]
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
    const refs = await loadLiveReferenceMaps(client, liveSchoolId, localCurrentSchool);
    if (refs.school) setLiveSchool(refs.school);
    setLiveDiagnostics(refs.diagnostics);
    const { data: rows, error } = await client
      .from("curriculum_mappings")
      .select("id,school_id,subject_id,year_group,term,scheme_reference,activity_title,activity_description,task_description,created_at,updated_at")
      .eq("school_id", refs.diagnostics.schoolId)
      .order("created_at", { ascending: false });

    if (error) {
      setLiveMappings([]);
      setLiveReferenceMaps(refs);
      return;
    }

    setLiveReferenceMaps(refs);
    setLiveMappings(((rows ?? []) as CurriculumMappingRow[]).map((row) => curriculumRowToMapping(row, refs)));
  }, [liveSchoolId, localCurrentSchool]);

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
      liveDiagnostics,
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
          const refs = liveReferenceMaps ?? (await loadLiveReferenceMaps(client, liveSchoolId, localCurrentSchool));
          const schoolIdForWrite = refs.diagnostics.schoolId;
          const ids = resolveSubjectId(entry, refs);
          if (!ids.ok) return { ok: false, message: ids.message };
          const frameworkRefs = resolveLiveReferences(entry, refs);
          if (!frameworkRefs.ok) return { ok: false, message: frameworkRefs.message };

          const { data: insertedRows, error } = await client.from("curriculum_mappings").insert({
            school_id: schoolIdForWrite,
            subject_id: ids.subjectId,
            year_group: entry.year,
            term: entry.term,
            activity_title: entry.unit || entry.context,
            activity_description: entry.activityDescription,
            task_description: entry.taskDescription ?? entry.activityDescription,
            scheme_reference: entry.schemeReference,
            created_by: currentUser?.id ?? null
          }).select("id").single();

          if (error) return { ok: false, message: error.message };
          const frameworkLinkResult = await replaceFrameworkLinks(client, insertedRows.id, frameworkRefs.references);
          if (!frameworkLinkResult.ok) return frameworkLinkResult;
          const linkResult = await replaceThemeLinks(client, insertedRows.id, entry.crossCuttingThemeIds ?? [], entry.crossCuttingThemeNotes ?? "", currentUser?.id);
          if (!linkResult.ok) return linkResult;
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
          const refs = liveReferenceMaps ?? (await loadLiveReferenceMaps(client, liveSchoolId, localCurrentSchool));
          const schoolIdForWrite = refs.diagnostics.schoolId;
          const ids = resolveSubjectId(merged, refs);
          if (!ids.ok) return { ok: false, message: ids.message };
          const frameworkRefs = resolveLiveReferences(merged, refs);
          if (!frameworkRefs.ok) return { ok: false, message: frameworkRefs.message };

          const { error } = await client
            .from("curriculum_mappings")
            .update({
              subject_id: ids.subjectId,
              year_group: merged.year,
              term: merged.term,
              activity_title: merged.unit || merged.context,
              activity_description: merged.activityDescription,
              task_description: merged.taskDescription ?? merged.activityDescription,
              scheme_reference: merged.schemeReference,
              updated_at: new Date().toISOString()
            })
            .eq("id", entryId)
            .eq("school_id", schoolIdForWrite);

          if (error) return { ok: false, message: error.message };
          const frameworkLinkResult = await replaceFrameworkLinks(client, entryId, frameworkRefs.references);
          if (!frameworkLinkResult.ok) return frameworkLinkResult;
          const linkResult = await replaceThemeLinks(client, entryId, merged.crossCuttingThemeIds ?? [], merged.crossCuttingThemeNotes ?? "", currentUser?.id);
          if (!linkResult.ok) return linkResult;
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

          const { error } = await supabase.from("curriculum_mappings").delete().eq("id", entryId).eq("school_id", liveSchool?.id ?? liveSchoolId);
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
    [currentSchool, currentUser?.id, data, liveDiagnostics, liveMappings, liveReferenceMaps, liveSchool?.id, liveSchoolId, loadLiveMappings, localCurrentSchool, schools]
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
  active?: boolean;
};

type SubjectReferenceRow = ReferenceRow & {
  school_id: string;
};

type FrameworkReferenceRow = ReferenceRow & {
  school_id: string;
  short_name: string | null;
  description: string | null;
  display_order: number | null;
  active?: boolean;
};

type StrandReferenceRow = ReferenceRow & {
  school_id: string;
  framework_id: string;
  short_name: string | null;
  description: string | null;
  display_order: number | null;
  active?: boolean;
};

type ElementReferenceRow = ReferenceRow & {
  school_id: string;
  strand_id: string;
  description: string | null;
  official_wording: string | null;
  teacher_friendly_explanation: string | null;
  display_order: number | null;
  active?: boolean;
};

type ProgressionDescriptorRow = {
  id: string;
  school_id: string;
  element_id: string;
  progression_step: number | string;
  descriptor_text: string | null;
  active?: boolean;
  display_order: number | null;
};

type ThemeReferenceRow = {
  id: string;
  school_id: string | null;
  name: string;
  description: string | null;
  active: boolean | null;
  display_order: number | null;
};

type LiveReferenceMaps = {
  school?: School;
  diagnostics: LiveDataDiagnostics;
  subjectsByName: Map<string, SubjectReferenceRow>;
  subjectsById: Map<string, SubjectReferenceRow>;
  frameworksByName: Map<string, FrameworkReferenceRow>;
  frameworksById: Map<string, FrameworkReferenceRow>;
  strandsByKey: Map<string, StrandReferenceRow>;
  strandsById: Map<string, StrandReferenceRow>;
  elementsByKey: Map<string, ElementReferenceRow>;
  elementsById: Map<string, ElementReferenceRow>;
  progressionDescriptorByElementAndStep: Map<string, ProgressionDescriptorRow>;
  frameworkLibrary: SchoolDataBundle["frameworkLibrary"];
  subjectConfigs: SubjectConfig[];
  crossCuttingThemes: CrossCuttingTheme[];
  frameworkLinksByMappingId: Map<string, FrameworkLinkRow[]>;
  themeNamesByMappingId: Map<string, string[]>;
  themeIdsByMappingId: Map<string, string[]>;
  themeNotesByMappingId: Map<string, string>;
};

type CurriculumMappingRow = {
  id: string;
  school_id: string;
  subject_id: string;
  year_group: string | null;
  term: string | null;
  activity_title: string | null;
  activity_description: string | null;
  task_description: string | null;
  scheme_reference: string;
  created_at: string;
  updated_at: string;
};

type FrameworkLinkRow = {
  id: string;
  mapping_id: string;
  framework_id: string;
  strand_id: string;
  element_id: string;
  progression_descriptor_id: string | null;
  progression_step: number | null;
  notes: string | null;
};

async function loadLiveReferenceMaps(client: SupabaseClient, schoolId: string, fallbackSchool?: School): Promise<LiveReferenceMaps> {
  const resolvedSchool = await resolveLiveSchool(client, schoolId, fallbackSchool);
  const querySchoolId = resolvedSchool?.id ?? schoolId;
  const subjectQuerySelect = "id, school_id, name";
  const frameworkQuerySelect = "id, school_id, name, short_name, description, display_order, active";
  const strandQuerySelect = "id, school_id, framework_id, name, short_name, description, display_order, active";
  const elementQuerySelect = "id, school_id, strand_id, name, description, official_wording, teacher_friendly_explanation, display_order, active";
  const descriptorQuerySelect = "id, school_id, element_id, progression_step, descriptor_text, display_order, active";
  const [subjectsResult, frameworksResult, strandsResult, elementsResult, descriptorsResult] = await Promise.all([
    client
      .from("subjects")
      .select(subjectQuerySelect)
      .eq("school_id", querySchoolId)
      .order("name", { ascending: true }),
    client
      .from("frameworks")
      .select(frameworkQuerySelect)
      .eq("school_id", querySchoolId)
      .eq("active", true)
      .order("display_order", { ascending: true }),
    client
      .from("strands")
      .select(strandQuerySelect)
      .eq("school_id", querySchoolId)
      .eq("active", true)
      .order("display_order", { ascending: true }),
    client
      .from("elements")
      .select(elementQuerySelect)
      .eq("school_id", querySchoolId)
      .eq("active", true)
      .order("display_order", { ascending: true }),
    client
      .from("progression_descriptors")
      .select(descriptorQuerySelect)
      .eq("school_id", querySchoolId)
      .eq("active", true)
      .order("progression_step", { ascending: true })
  ]);
  const themeRows = await loadThemeRows(client, querySchoolId);

  const subjects = ((subjectsResult.data ?? []) as SubjectReferenceRow[]).map(normaliseReferenceName);
  const frameworks = ((frameworksResult.data ?? []) as FrameworkReferenceRow[]).map(normaliseReferenceName);
  const strands = ((strandsResult.data ?? []) as StrandReferenceRow[]).map(normaliseReferenceName);
  const elements = ((elementsResult.data ?? []) as ElementReferenceRow[]).map(normaliseReferenceName);
  const descriptorRows = ((descriptorsResult.data ?? []) as ProgressionDescriptorRow[]).filter((descriptor) => descriptorText(descriptor));
  const crossCuttingThemes: CrossCuttingTheme[] = themeRows.map((theme) => ({
    id: theme.id,
    schoolId: theme.school_id ?? null,
    name: theme.name.trim(),
    description: theme.description,
    active: theme.active ?? true,
    displayOrder: theme.display_order ?? 0
  }));
  const { data: mappingRows } = await client.from("curriculum_mappings").select("id").eq("school_id", querySchoolId);
  const mappingIds = ((mappingRows ?? []) as { id: string }[]).map((row) => row.id);
  const { data: frameworkLinkRows } = mappingIds.length
    ? await client.from("curriculum_mapping_framework_links").select("id,mapping_id,framework_id,strand_id,element_id,progression_descriptor_id,progression_step,notes").in("mapping_id", mappingIds)
    : { data: [] as FrameworkLinkRow[] };
  const { data: linkRows } = mappingIds.length
    ? await client
    .from("curriculum_mapping_theme_links")
    .select("mapping_id,theme_id,notes,cross_cutting_themes(id,name)")
        .in("mapping_id", mappingIds)
    : { data: [] as ThemeLinkRow[] };

  const frameworksById = new Map(frameworks.map((row) => [row.id, row]));
  const strandsById = new Map(strands.map((row) => [row.id, row]));
  const strandsByKey = new Map<string, StrandReferenceRow>();
  const elementsByKey = new Map<string, ElementReferenceRow>();
  const progressionDescriptorByElementAndStep = new Map<string, ProgressionDescriptorRow>();

  for (const descriptor of descriptorRows) {
    progressionDescriptorByElementAndStep.set(referenceKey(descriptor.element_id, String(descriptor.progression_step)), descriptor);
  }

  for (const strand of strands) {
    const framework = frameworksById.get(strand.framework_id);
    if (framework) strandsByKey.set(referenceKey(framework.name, strand.name), strand);
  }

  for (const element of elements) {
    const strand = strandsById.get(element.strand_id);
    const framework = strand ? frameworksById.get(strand.framework_id) : undefined;
    if (framework && strand) elementsByKey.set(referenceKey(framework.name, strand.name, element.name), element);
  }

  const frameworkLibrary = frameworks.filter((framework) => framework.active !== false).map((framework) => ({
    id: framework.id,
    schoolId: querySchoolId,
    name: framework.name,
    shortName: framework.short_name ?? framework.name,
    strands: strands
      .filter((strand) => strand.framework_id === framework.id && strand.active !== false)
      .map((strand) => ({
        id: strand.id,
        schoolId: querySchoolId,
        name: strand.name,
        shortName: strand.short_name,
        elements: elements
          .filter((element) => element.strand_id === strand.id && element.active !== false)
          .map((element) => ({
            id: element.id,
            schoolId: querySchoolId,
            name: element.name,
            officialWording: element.official_wording ?? element.description ?? element.teacher_friendly_explanation ?? element.name,
            explanation: element.teacher_friendly_explanation ?? element.description ?? "",
            examples: [],
            progressionDescriptors: Object.fromEntries(
              (["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"] as ProgressionStep[]).map((step) => {
                const descriptor = progressionDescriptorByElementAndStep.get(referenceKey(element.id, step.replace("Step ", ""))) ?? progressionDescriptorByElementAndStep.get(referenceKey(element.id, step));
                return [step, descriptorText(descriptor) ?? ""];
              })
            ) as Record<ProgressionStep, string>,
            progressionDescriptorRefs: (["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"] as ProgressionStep[])
              .map((step) => {
                const descriptor = progressionDescriptorByElementAndStep.get(referenceKey(element.id, step.replace("Step ", ""))) ?? progressionDescriptorByElementAndStep.get(referenceKey(element.id, step));
                const stepNumber = Number(step.replace("Step ", ""));
                const text = descriptorText(descriptor);
                return descriptor && text
                  ? {
                      id: descriptor.id,
                      progressionStep: step,
                      progressionStepNumber: stepNumber,
                      descriptorText: text
                    }
                  : null;
              })
              .filter((descriptor) => descriptor !== null),
            searchKeywords: [],
            relatedConnections: []
          }))
      }))
  }));

  const subjectConfigs = subjects.map((subject, index) => ({
    schoolId: subject.school_id,
    id: subject.id,
    name: subject.name,
    shortName: subject.name,
    aoeId: null,
    active: true,
    displayOrder: index + 1,
    appearsInMappingDropdowns: true
  }));

  return {
    school: resolvedSchool,
    diagnostics: {
      schoolId: querySchoolId,
      schoolSlug: resolvedSchool?.slug ?? fallbackSchool?.slug ?? "",
      subjectQuerySelect,
      subjectQueryCount: subjectsResult.data?.length ?? 0,
      subjectQueryError: subjectsResult.error?.message ?? null,
      frameworkQueryCount: frameworksResult.data?.length ?? 0,
      frameworkQueryError: frameworksResult.error?.message ?? null,
      strandQueryCount: strandsResult.data?.length ?? 0,
      strandQueryError: strandsResult.error?.message ?? null,
      elementQueryCount: elementsResult.data?.length ?? 0,
      elementQueryError: elementsResult.error?.message ?? null,
      descriptorQueryCount: descriptorRows.length,
      descriptorQueryError: descriptorsResult.error?.message ?? null
    },
    subjectsByName: new Map(subjects.map((row) => [row.name, row])),
    subjectsById: new Map(subjects.map((row) => [row.id, row])),
    frameworksByName: new Map(frameworks.map((row) => [row.name, row])),
    frameworksById,
    strandsByKey,
    strandsById,
    elementsByKey,
    elementsById: new Map(elements.map((row) => [row.id, row])),
    progressionDescriptorByElementAndStep,
    frameworkLibrary,
    subjectConfigs,
    crossCuttingThemes,
    frameworkLinksByMappingId: buildFrameworkLinkMap((frameworkLinkRows ?? []) as FrameworkLinkRow[]),
    themeNamesByMappingId: buildThemeNameMap(linkRows ?? []),
    themeIdsByMappingId: buildThemeIdMap(linkRows ?? []),
    themeNotesByMappingId: buildThemeNotesMap(linkRows ?? [])
  };
}

type ThemeLinkRow = {
  mapping_id: string;
  theme_id: string;
  notes: string | null;
  cross_cutting_themes?: { id: string; name: string } | { id: string; name: string }[] | null;
};

async function loadThemeRows(client: SupabaseClient, schoolId: string): Promise<ThemeReferenceRow[]> {
  for (const tableName of ["cross_cutting_themes", "themes"]) {
    const schoolRows = await client
      .from(tableName)
      .select("id,school_id,name,description,active,display_order")
      .eq("school_id", schoolId)
      .eq("active", true)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    if (!schoolRows.error && schoolRows.data?.length) return schoolRows.data as ThemeReferenceRow[];

    const sharedRows = await client
      .from(tableName)
      .select("id,school_id,name,description,active,display_order")
      .or(`school_id.eq.${schoolId},school_id.is.null`)
      .eq("active", true)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    if (!sharedRows.error && sharedRows.data?.length) return sharedRows.data as ThemeReferenceRow[];
  }

  return [];
}

function buildFrameworkLinkMap(rows: FrameworkLinkRow[]) {
  const map = new Map<string, FrameworkLinkRow[]>();
  for (const row of rows) map.set(row.mapping_id, [...(map.get(row.mapping_id) ?? []), row]);
  return map;
}

function buildThemeNameMap(rows: ThemeLinkRow[]) {
  const map = new Map<string, string[]>();
  for (const row of rows) {
    const theme = Array.isArray(row.cross_cutting_themes) ? row.cross_cutting_themes[0] : row.cross_cutting_themes;
    if (!theme?.name) continue;
    map.set(row.mapping_id, [...(map.get(row.mapping_id) ?? []), theme.name]);
  }
  return map;
}

function buildThemeIdMap(rows: ThemeLinkRow[]) {
  const map = new Map<string, string[]>();
  for (const row of rows) map.set(row.mapping_id, [...(map.get(row.mapping_id) ?? []), row.theme_id]);
  return map;
}

function buildThemeNotesMap(rows: ThemeLinkRow[]) {
  const map = new Map<string, string>();
  for (const row of rows) {
    if (row.notes && !map.has(row.mapping_id)) map.set(row.mapping_id, row.notes);
  }
  return map;
}

function normaliseReferenceName<T extends ReferenceRow>(row: T): T {
  return { ...row, name: row.name.trim() };
}

async function resolveLiveSchool(client: SupabaseClient, schoolId: string, fallbackSchool?: School): Promise<School | undefined> {
  const { data: row } = await client.from("schools").select("id, slug, name, motto, active").eq("slug", "caerleon").single();

  if (!row) return undefined;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    motto: row.motto ?? fallbackSchool?.motto ?? "Curriculum visibility",
    logoUrl: fallbackSchool?.logoUrl ?? "/schlogo.png",
    primaryColour: fallbackSchool?.primaryColour ?? "#741B47",
    secondaryColour: fallbackSchool?.secondaryColour ?? "#571435",
    active: row.active ?? true,
    createdAt: fallbackSchool?.createdAt ?? new Date().toISOString().slice(0, 10)
  };
}

function referenceKey(...parts: string[]) {
  return parts.map((part) => part.trim().toLowerCase()).join("::");
}

function resolveSubjectId(entry: MappingEntry, refs: LiveReferenceMaps):
  | { ok: true; subjectId: string }
  | { ok: false; message: string } {
  if (!entry.subjectId) {
    return { ok: false, message: "Subject ID is missing. Reload the page and select the subject again." };
  }

  const subject = refs.subjectsById.get(entry.subjectId);
  if (!subject) return { ok: false, message: `Subject ID not found in Supabase: ${entry.subjectId}` };
  return { ok: true, subjectId: subject.id };
}

function resolveLiveReferences(entry: MappingEntry, refs: LiveReferenceMaps):
  | { ok: true; references: ResolvedFrameworkLink[] }
  | { ok: false; message: string } {
  const entryReferences = entry.frameworkReferences?.length
    ? entry.frameworkReferences
    : entry.frameworkId && entry.strandId && entry.elementId
      ? [
          {
            frameworkId: entry.frameworkId,
            strandId: entry.strandId,
            elementId: entry.elementId,
            progressionDescriptorId: entry.progressionDescriptorId,
            progressionReference: entry.progressionReference,
            framework: entry.framework,
            strand: entry.strand,
            element: entry.element
          }
        ]
      : [];

  if (!entryReferences.length) return { ok: true, references: [] };

  const references: ResolvedFrameworkLink[] = [];
  for (const reference of entryReferences) {
    if (!reference.frameworkId || !reference.strandId || !reference.elementId) {
      return { ok: false, message: "Framework reference IDs are missing. Reload the page and select the framework, strand and element again." };
    }

    const framework = refs.frameworksById.get(reference.frameworkId);
    if (!framework) return { ok: false, message: `Framework not found in Supabase: ${reference.framework}` };

    const strand = refs.strandsById.get(reference.strandId);
    if (!strand) return { ok: false, message: `Strand not found in Supabase: ${reference.framework} -> ${reference.strand}` };

    const element = refs.elementsById.get(reference.elementId);
    if (!element) return { ok: false, message: `Element not found in Supabase: ${reference.framework} -> ${reference.strand} -> ${reference.element}` };

    const progressionStep = reference.progressionStep ?? progressionStepNumber(reference.progressionReference);
    const progressionDescriptorId =
      reference.progressionDescriptorId ??
      (progressionStep ? refs.progressionDescriptorByElementAndStep.get(referenceKey(element.id, String(progressionStep)))?.id : undefined) ??
      null;

    references.push({
      frameworkId: framework.id,
      strandId: strand.id,
      elementId: element.id,
      progressionDescriptorId,
      progressionStep,
      notes: reference.notes
    });
  }

  return { ok: true, references };
}

type ResolvedFrameworkLink = {
  frameworkId: string;
  strandId: string;
  elementId: string;
  progressionDescriptorId: string | null;
  progressionStep: number | null;
  notes?: string;
};

function curriculumRowToMapping(row: CurriculumMappingRow, refs: LiveReferenceMaps): MappingEntry {
  const subject = refs.subjectsById.get(row.subject_id)?.name ?? "Unknown subject";
  const frameworkLinks = refs.frameworkLinksByMappingId.get(row.id) ?? [];
  const frameworkReferences = frameworkLinks.map((link) => frameworkLinkToReference(link, refs));
  const primaryReference = frameworkReferences[0];
  const activityTitle = row.activity_title ?? row.task_description ?? "Untitled activity";
  const activityDescription = row.activity_description ?? row.task_description ?? activityTitle;

  return {
    schoolId: row.school_id,
    id: row.id,
    subjectId: row.subject_id,
    frameworkId: primaryReference?.frameworkId,
    strandId: primaryReference?.strandId,
    elementId: primaryReference?.elementId,
    progressionDescriptorId: primaryReference?.progressionDescriptorId ?? undefined,
    frameworkReferences,
    subject,
    framework: primaryReference?.framework ?? "No framework reference",
    strand: primaryReference?.strand ?? "No strand reference",
    element: primaryReference?.element ?? "No element reference",
    context: activityTitle,
    year: row.year_group ?? "Year 7",
    term: row.term ?? "Autumn",
    unit: activityTitle,
    activityDescription,
    taskDescription: row.task_description ?? activityDescription,
    schemeReference: row.scheme_reference,
    progressionReference: primaryReference?.progressionReference ?? "Not specified",
    note: "",
    crossCuttingThemeIds: refs.themeIdsByMappingId.get(row.id) ?? [],
    crossCuttingThemes: refs.themeNamesByMappingId.get(row.id) ?? [],
    crossCuttingThemeNotes: refs.themeNotesByMappingId.get(row.id) ?? "",
    lastMappedDate: row.updated_at?.slice(0, 10) || row.created_at.slice(0, 10)
  };
}

function frameworkLinkToReference(link: FrameworkLinkRow, refs: LiveReferenceMaps) {
  const framework = refs.frameworksById.get(link.framework_id);
  const strand = refs.strandsById.get(link.strand_id);
  const element = refs.elementsById.get(link.element_id);
  const descriptor = link.progression_descriptor_id ? [...refs.progressionDescriptorByElementAndStep.values()].find((item) => item.id === link.progression_descriptor_id) : undefined;
  const progressionStep = link.progression_step ?? progressionStepNumberFromDescriptor(descriptor);
  const progressionReference = progressionStep ? (`Step ${progressionStep}` as ProgressionReference) : "Not specified";

  return {
    id: link.id,
    frameworkId: link.framework_id,
    strandId: link.strand_id,
    elementId: link.element_id,
    progressionDescriptorId: link.progression_descriptor_id,
    progressionStep,
    framework: framework?.name ?? "Unknown framework",
    frameworkShortName: framework?.short_name ?? framework?.name ?? "Unknown framework",
    strand: strand?.name ?? "Unknown strand",
    strandShortName: strand?.short_name ?? strand?.name ?? "Unknown strand",
    element: element?.name ?? "Unknown element",
    progressionReference,
    descriptor: descriptorText(descriptor),
    notes: link.notes ?? ""
  };
}

async function replaceFrameworkLinks(client: SupabaseClient, mappingId: string, references: ResolvedFrameworkLink[]): Promise<MappingMutationResult> {
  const { error: deleteError } = await client.from("curriculum_mapping_framework_links").delete().eq("mapping_id", mappingId);
  if (deleteError) return { ok: false, message: deleteError.message };
  if (!references.length) return { ok: true };
  const { error } = await client.from("curriculum_mapping_framework_links").insert(
    references.map((reference) => ({
      mapping_id: mappingId,
      framework_id: reference.frameworkId,
      strand_id: reference.strandId,
      element_id: reference.elementId,
      progression_descriptor_id: reference.progressionDescriptorId,
      progression_step: reference.progressionStep,
      notes: reference.notes?.trim() || null
    }))
  );
  return error ? { ok: false, message: error.message } : { ok: true };
}

async function replaceThemeLinks(client: SupabaseClient, mappingId: string, themeIds: string[], notes: string, userId?: string): Promise<MappingMutationResult> {
  const { error: deleteError } = await client.from("curriculum_mapping_theme_links").delete().eq("mapping_id", mappingId);
  if (deleteError) return { ok: false, message: deleteError.message };
  const uniqueThemeIds = Array.from(new Set(themeIds.filter(Boolean)));
  if (!uniqueThemeIds.length) return { ok: true };
  if (uniqueThemeIds.some((themeId) => !looksLikeUuid(themeId))) {
    return { ok: false, message: "Theme data is still using prototype IDs. Reload cross-cutting themes from Supabase." };
  }
  const { error } = await client.from("curriculum_mapping_theme_links").insert(
    uniqueThemeIds.map((themeId) => ({
      mapping_id: mappingId,
      theme_id: themeId,
      notes: notes.trim() || null,
      created_by: userId ?? null
    }))
  );
  return error ? { ok: false, message: error.message } : { ok: true };
}

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function progressionStepNumber(reference: ProgressionReference | undefined) {
  if (!reference || reference === "Not specified") return null;
  const match = reference.match(/Step ([1-5])/);
  return match ? Number(match[1]) : null;
}

function progressionStepNumberFromDescriptor(descriptor: ProgressionDescriptorRow | undefined) {
  if (!descriptor) return null;
  const value = Number(descriptor.progression_step);
  return Number.isFinite(value) ? value : progressionStepNumber(String(descriptor.progression_step) as ProgressionReference);
}

function descriptorText(descriptor: ProgressionDescriptorRow | undefined) {
  const text = descriptor?.descriptor_text ?? undefined;
  return text?.trim() ? text : undefined;
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
