"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { type FrameworkThemeSetting, useSchoolSettings } from "@/lib/schoolSettings";
import { buildBundle, createEmptySchoolData, defaultSchoolId, sampleSchools, schoolDataById, type SchoolDataBundle } from "@/lib/multiSchoolData";
import { isDemoLoginEnabled, supabase } from "@/lib/supabaseClient";
import type { AoleConfig, CrossCuttingTheme, CrossCuttingThemeElement, MappingEntry, ProgressionReference, ProgressionStep, School, SelectedCctElement, SubjectConfig } from "@/lib/types";

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
  addSubjectConfig: (subject: Pick<SubjectConfig, "name"> & Partial<Pick<SubjectConfig, "aoeId" | "active" | "appearsInMappingDropdowns">>) => Promise<MappingMutationResult>;
  updateSubjectConfig: (subjectId: string, patch: Partial<SubjectConfig>) => Promise<MappingMutationResult>;
};

const CurrentSchoolContext = createContext<CurrentSchoolContextValue | null>(null);

export function CurrentSchoolProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const { updateBranding, updateFrameworkTheme } = useSchoolSettings();
  const [schools, setSchools] = useState<School[]>(sampleSchools);
  const [currentSchoolId, setCurrentSchoolId] = useState(defaultSchoolId);
  const [customData, setCustomData] = useState<Record<string, SchoolDataBundle>>({});
  const [mappingOverrides, setMappingOverrides] = useState<Record<string, MappingEntry[]>>({});
  const [liveMappings, setLiveMappings] = useState<MappingEntry[]>([]);
  const [liveReferenceMaps, setLiveReferenceMaps] = useState<LiveReferenceMaps | null>(null);
  const [liveSchool, setLiveSchool] = useState<School | null>(null);
  const [liveDiagnostics, setLiveDiagnostics] = useState<LiveDataDiagnostics | null>(null);

  useEffect(() => {
    if (!isDemoLoginEnabled) return;
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
  const baseData = isDemoLoginEnabled
    ? customData[currentSchool.id] ?? schoolDataById[currentSchool.id] ?? createEmptySchoolData(currentSchool.id)
    : buildBundle({ schoolId: currentSchool.id, subjectConfigs: [], aoleConfigs: [], frameworkLibrary: [], crossCuttingThemes: [], mappings: [] });
  const liveSchoolId = isDemoLoginEnabled ? currentSchool.id : (currentUser?.schoolId ?? "");
  const currentMappings = isDemoLoginEnabled ? (mappingOverrides[currentSchool.id] ?? baseData.mappings) : liveMappings;
  const currentFrameworkLibrary = isDemoLoginEnabled ? baseData.frameworkLibrary : (liveReferenceMaps?.frameworkLibrary ?? []);
  const currentSubjectConfigs = isDemoLoginEnabled ? baseData.subjectConfigs : (liveReferenceMaps?.subjectConfigs ?? []);
  const currentAoleConfigs = isDemoLoginEnabled ? baseData.aoleConfigs : (liveReferenceMaps?.aoleConfigs ?? []);
  const currentCrossCuttingThemes = isDemoLoginEnabled ? baseData.crossCuttingThemes : (liveReferenceMaps?.crossCuttingThemes ?? []);
  const data = useMemo(
    () =>
      buildBundle({
        schoolId: currentSchool.id,
        subjectConfigs: currentSubjectConfigs,
        aoleConfigs: currentAoleConfigs,
        frameworkLibrary: currentFrameworkLibrary,
        crossCuttingThemes: currentCrossCuttingThemes,
        mappings: currentMappings
      }),
    [currentAoleConfigs, currentCrossCuttingThemes, currentFrameworkLibrary, currentMappings, currentSchool.id, currentSubjectConfigs]
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
    Object.entries(refs.frameworkColourThemes).forEach(([framework, theme]) => updateFrameworkTheme(framework, theme));
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
  }, [liveSchoolId, localCurrentSchool, updateFrameworkTheme]);

  useEffect(() => {
    void loadLiveMappings();
  }, [loadLiveMappings]);

  useEffect(() => {
    if (!isDemoLoginEnabled) return;
    window.localStorage.setItem("skills-tracker-schools", JSON.stringify(schools));
  }, [schools]);

  useEffect(() => {
    if (isDemoLoginEnabled) window.localStorage.setItem("skills-tracker-current-school", currentSchool.id);
    if (!isDemoLoginEnabled && !liveSchool) return;
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
        if (!isDemoLoginEnabled) return currentSchool;
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
        if (!isDemoLoginEnabled && liveSchool && (schoolId === liveSchool.id || schoolId === localCurrentSchool.id)) {
          setLiveSchool((current) => (current ? { ...current, ...patch } : current));
          const livePatch = schoolPatchToLiveSchoolPatch(patch);
          if (supabase && Object.keys(livePatch).length) {
            void supabase.from("schools").update(livePatch).eq("id", liveSchool.id).then(({ error }) => {
              if (error) console.error("Could not update school details", error.message);
            });
          }
          const brandingPatch = schoolPatchToBrandingPatch(patch, liveSchool);
          if (supabase && brandingPatch) {
            void supabase.from("branding_settings").upsert(brandingPatch, { onConflict: "school_id" }).then(({ error }) => {
              if (error) console.error("Could not update school branding", error.message);
            });
          }
        }
      },
      toggleSchoolActive: (schoolId) => {
        const targetSchool = schools.find((school) => school.id === schoolId);
        const nextActive = !(targetSchool?.active ?? true);
        setSchools((current) => current.map((school) => (school.id === schoolId ? { ...school, active: nextActive } : school)));
        if (!isDemoLoginEnabled && liveSchool && (schoolId === liveSchool.id || schoolId === localCurrentSchool.id) && supabase) {
          setLiveSchool((current) => (current ? { ...current, active: nextActive } : current));
          void supabase.from("schools").update({ active: nextActive }).eq("id", liveSchool.id).then(({ error }) => {
            if (error) console.error("Could not update school active status", error.message);
          });
        }
      },
      resolveSchoolBySlug: (slug) => schools.find((school) => school.slug === slug),
      addMapping: async (entry) => {
        if (!isDemoLoginEnabled) {
          if (!supabase) return { ok: false, message: "Supabase environment variables are missing." };
          if (!liveSchoolId) return { ok: false, message: "No live school is linked to this account." };

          const client = supabase;
          let refs = liveReferenceMaps ?? (await loadLiveReferenceMaps(client, liveSchoolId, localCurrentSchool));
          if (entry.subjectId && !refs.subjectsById.has(entry.subjectId)) {
            refs = await loadLiveReferenceMaps(client, liveSchoolId, localCurrentSchool);
          }
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
          const linkResult = await replaceThemeLinks(client, insertedRows.id, themeLinksForEntry(entry), entry.crossCuttingThemeNotes ?? "", currentUser?.id);
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
          let refs = liveReferenceMaps ?? (await loadLiveReferenceMaps(client, liveSchoolId, localCurrentSchool));
          if (merged.subjectId && !refs.subjectsById.has(merged.subjectId)) {
            refs = await loadLiveReferenceMaps(client, liveSchoolId, localCurrentSchool);
          }
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
          const shouldReplaceThemeLinks =
            "crossCuttingThemeElementLinks" in patch ||
            "crossCuttingThemeElementIds" in patch ||
            "crossCuttingThemeIds" in patch ||
            "crossCuttingThemeNotes" in patch;
          if (shouldReplaceThemeLinks) {
            const linkResult = await replaceThemeLinks(client, entryId, themeLinksForEntry(merged), merged.crossCuttingThemeNotes ?? "", currentUser?.id);
            if (!linkResult.ok) return linkResult;
          }
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

          const { error: themeLinkError } = await supabase.from("curriculum_mapping_theme_links").delete().eq("mapping_id", entryId);
          if (themeLinkError) return { ok: false, message: themeLinkError.message };
          const { error: frameworkLinkError } = await supabase.from("curriculum_mapping_framework_links").delete().eq("mapping_id", entryId);
          if (frameworkLinkError) return { ok: false, message: frameworkLinkError.message };
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
      },
      addSubjectConfig: async (subject) => {
        const requestedName = subject.name.trim();
        if (!requestedName) return { ok: false, message: "Subject name is required." };
        if (!isDemoLoginEnabled) {
          if (!supabase) return { ok: false, message: "Supabase environment variables are missing." };
          const refs = liveReferenceMaps ?? (await loadLiveReferenceMaps(supabase, liveSchoolId, localCurrentSchool));
          if (hasSubjectName(requestedName, refs.subjectConfigs.map((item) => item.name))) {
            return { ok: false, message: `${requestedName} already exists for this school.` };
          }
          const { error } = await supabase.from("subjects").insert({
            school_id: refs.diagnostics.schoolId,
            name: requestedName,
            aole_id: subject.aoeId ?? null,
            active: subject.active ?? true,
            appears_in_mapping_dropdowns: subject.appearsInMappingDropdowns ?? true
          });
          if (error) return { ok: false, message: error.message };
          await loadLiveMappings();
          return { ok: true };
        }

        setCustomData((current) => {
          const existing = current[currentSchool.id] ?? data;
          if (hasSubjectName(requestedName, existing.subjectConfigs.map((item) => item.name))) return current;
          const newSubject: SubjectConfig = {
            schoolId: currentSchool.id,
            id: `subject-${Date.now()}`,
            name: requestedName,
            aoeId: subject.aoeId ?? null,
            aole: undefined,
            active: subject.active ?? true,
            displayOrder: existing.subjectConfigs.length + 1,
            appearsInMappingDropdowns: subject.appearsInMappingDropdowns ?? true
          };
          return {
            ...current,
            [currentSchool.id]: {
              ...existing,
              subjectConfigs: [...existing.subjectConfigs, newSubject]
            }
          };
        });
        return { ok: true };
      },
      updateSubjectConfig: async (subjectId, patch) => {
        if (!isDemoLoginEnabled) {
          if (!supabase) return { ok: false, message: "Supabase environment variables are missing." };
          const refs = liveReferenceMaps ?? (await loadLiveReferenceMaps(supabase, liveSchoolId, localCurrentSchool));
          const subject = refs.subjectsById.get(subjectId);
          if (!subject) return { ok: false, message: "Subject not found in Supabase." };

          const updatePayload: {
            name?: string;
            aole_id?: string | null;
            display_order?: number;
            active?: boolean;
            appears_in_mapping_dropdowns?: boolean;
          } = {};
          if ("name" in patch) updatePayload.name = patch.name;
          if ("aoeId" in patch) updatePayload.aole_id = patch.aoeId ?? null;
          if ("displayOrder" in patch) updatePayload.display_order = patch.displayOrder;
          if ("active" in patch) updatePayload.active = patch.active;
          if ("appearsInMappingDropdowns" in patch) updatePayload.appears_in_mapping_dropdowns = patch.appearsInMappingDropdowns;

          const { error } = await supabase.from("subjects").update(updatePayload).eq("id", subject.id).eq("school_id", refs.diagnostics.schoolId);
          if (error) return { ok: false, message: "Could not save subject setting." };
          await loadLiveMappings();
          return { ok: true };
        }

        setCustomData((current) => {
          const existing = current[currentSchool.id] ?? data;
          return {
            ...current,
            [currentSchool.id]: {
              ...existing,
              subjectConfigs: existing.subjectConfigs.map((subject) => (subject.id === subjectId ? { ...subject, ...patch } : subject))
            }
          };
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
  aole_id: string | null;
  display_order: number | null;
  active?: boolean;
  appears_in_mapping_dropdowns?: boolean | null;
};

type AoleReferenceRow = ReferenceRow & {
  school_id: string;
  display_order: number | null;
  active?: boolean;
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

type ThemeElementReferenceRow = {
  id: string;
  school_id: string | null;
  theme_id: string;
  name: string;
  description: string | null;
  active: boolean | null;
  display_order: number | null;
};

type BrandingSettingsRow = {
  school_name: string | null;
  motto: string | null;
  logo_url: string | null;
  primary_colour: string | null;
  secondary_colour: string | null;
};

type FrameworkColourThemeRow = {
  framework_id: string;
  primary_colour: string;
  pale_colour: string;
  badge_colour: string;
  chart_colour: string;
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
  frameworkColourThemes: Record<string, FrameworkThemeSetting>;
  subjectConfigs: SubjectConfig[];
  aoleConfigs: AoleConfig[];
  crossCuttingThemes: CrossCuttingTheme[];
  frameworkLinksByMappingId: Map<string, FrameworkLinkRow[]>;
  themeNamesByMappingId: Map<string, string[]>;
  themeIdsByMappingId: Map<string, string[]>;
  themeElementIdsByMappingId: Map<string, string[]>;
  themeElementLinksByMappingId: Map<string, SelectedCctElement[]>;
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
  const subjectQuerySelect = "id, school_id, name, aole_id, display_order, active, appears_in_mapping_dropdowns";
  const aoleQuerySelect = "id, school_id, name, display_order, active";
  const frameworkQuerySelect = "id, school_id, name, short_name, description, display_order, active";
  const strandQuerySelect = "id, school_id, framework_id, name, short_name, description, display_order, active";
  const elementQuerySelect = "id, school_id, strand_id, name, description, official_wording, teacher_friendly_explanation, display_order, active";
  const descriptorQuerySelect = "id, school_id, element_id, progression_step, descriptor_text, display_order, active";
  const [subjectsResult, aolesResult, frameworksResult, strandsResult, elementsResult, descriptorsResult, frameworkColourThemesResult] = await Promise.all([
    client
      .from("subjects")
      .select(subjectQuerySelect)
      .eq("school_id", querySchoolId)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true }),
    client
      .from("aoles")
      .select(aoleQuerySelect)
      .eq("school_id", querySchoolId)
      .eq("active", true)
      .order("display_order", { ascending: true })
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
      .order("progression_step", { ascending: true }),
    client
      .from("framework_colour_themes")
      .select("framework_id,primary_colour,pale_colour,badge_colour,chart_colour")
      .eq("school_id", querySchoolId)
  ]);
  const { themes: themeRows, elements: themeElementRows } = await loadThemeRows(client, querySchoolId);

  const subjects = ((subjectsResult.data ?? []) as SubjectReferenceRow[]).map(normaliseReferenceName);
  const aoles = ((aolesResult.data ?? []) as AoleReferenceRow[]).map(normaliseReferenceName);
  const frameworks = ((frameworksResult.data ?? []) as FrameworkReferenceRow[]).map(normaliseReferenceName);
  const strands = ((strandsResult.data ?? []) as StrandReferenceRow[]).map(normaliseReferenceName);
  const elements = ((elementsResult.data ?? []) as ElementReferenceRow[]).map(normaliseReferenceName);
  const descriptorRows = ((descriptorsResult.data ?? []) as ProgressionDescriptorRow[]).filter((descriptor) => descriptorText(descriptor));
  const themeElementsByThemeId = buildThemeElementsByThemeId(themeElementRows);
  const crossCuttingThemes: CrossCuttingTheme[] = themeRows.map((theme, index) => ({
    id: theme.id,
    schoolId: theme.school_id ?? null,
    name: theme.name.trim(),
    description: theme.description,
    active: theme.active ?? true,
    displayOrder: theme.display_order ?? index + 1,
    elements: themeElementsByThemeId.get(theme.id) ?? []
  }));
  const aoleConfigs: AoleConfig[] = aoles.map((aole, index) => ({
    schoolId: aole.school_id,
    id: aole.id,
    name: aole.name,
    active: aole.active ?? true,
    displayOrder: aole.display_order ?? index + 1
  }));
  const aolesById = new Map(aoles.map((aole) => [aole.id, aole]));
  const { data: mappingRows } = await client.from("curriculum_mappings").select("id").eq("school_id", querySchoolId);
  const mappingIds = ((mappingRows ?? []) as { id: string }[]).map((row) => row.id);
  const { data: frameworkLinkRows } = mappingIds.length
    ? await client.from("curriculum_mapping_framework_links").select("id,mapping_id,framework_id,strand_id,element_id,progression_descriptor_id,progression_step,notes").in("mapping_id", mappingIds)
    : { data: [] as FrameworkLinkRow[] };
  const { data: linkRows } = mappingIds.length
    ? await client
    .from("curriculum_mapping_theme_links")
    .select("id,mapping_id,theme_id,theme_element_id,notes")
        .in("mapping_id", mappingIds)
    : { data: [] as ThemeLinkRow[] };

  const frameworksById = new Map(frameworks.map((row) => [row.id, row]));
  const frameworkColourThemes = buildFrameworkColourThemeSettings((frameworkColourThemesResult.data ?? []) as FrameworkColourThemeRow[], frameworksById);
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
    aoeId: subject.aole_id,
    aole: subject.aole_id ? aolesById.get(subject.aole_id)?.name : undefined,
    active: subject.active ?? true,
    displayOrder: subject.display_order ?? index + 1,
    appearsInMappingDropdowns: subject.appears_in_mapping_dropdowns ?? true
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
    frameworkColourThemes,
    subjectConfigs,
    aoleConfigs,
    crossCuttingThemes,
    frameworkLinksByMappingId: buildFrameworkLinkMap((frameworkLinkRows ?? []) as FrameworkLinkRow[]),
    themeNamesByMappingId: buildThemeNameMap(linkRows ?? [], themeRows, themeElementRows),
    themeIdsByMappingId: buildThemeIdMap(linkRows ?? []),
    themeElementIdsByMappingId: buildThemeElementIdMap(linkRows ?? []),
    themeElementLinksByMappingId: buildThemeElementLinkMap(linkRows ?? []),
    themeNotesByMappingId: buildThemeNotesMap(linkRows ?? [])
  };
}

type ThemeLinkRow = {
  id?: string;
  mapping_id: string;
  theme_id: string;
  theme_element_id?: string | null;
  notes: string | null;
};

async function loadThemeRows(client: SupabaseClient, schoolId: string): Promise<{ themes: ThemeReferenceRow[]; elements: ThemeElementReferenceRow[] }> {
  const [crossCuttingRows, elementRows] = await Promise.all([
    client
    .from("cross_cutting_themes")
    .select("id,school_id,name,description,active")
    .eq("school_id", schoolId)
    .eq("active", true)
    .order("name", { ascending: true }),
    client
      .from("cross_cutting_theme_elements")
      .select("id,school_id,theme_id,name,description,display_order,active")
      .eq("school_id", schoolId)
      .eq("active", true)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true })
  ]);
  return { themes: (crossCuttingRows.data ?? []) as ThemeReferenceRow[], elements: (elementRows.data ?? []) as ThemeElementReferenceRow[] };
}

function buildFrameworkLinkMap(rows: FrameworkLinkRow[]) {
  const map = new Map<string, FrameworkLinkRow[]>();
  for (const row of rows) map.set(row.mapping_id, [...(map.get(row.mapping_id) ?? []), row]);
  return map;
}

function buildThemeNameMap(rows: ThemeLinkRow[], themes: ThemeReferenceRow[], elements: ThemeElementReferenceRow[]) {
  const map = new Map<string, string[]>();
  const themeById = new Map(themes.map((theme) => [theme.id, theme]));
  const elementById = new Map(elements.map((element) => [element.id, element]));
  for (const row of rows) {
    const theme = themeById.get(row.theme_id);
    const element = row.theme_element_id ? elementById.get(row.theme_element_id) : undefined;
    if (!theme?.name) continue;
    map.set(row.mapping_id, [...(map.get(row.mapping_id) ?? []), element?.name ? `${theme.name}: ${element.name}` : theme.name]);
  }
  return map;
}

function buildThemeIdMap(rows: ThemeLinkRow[]) {
  const map = new Map<string, string[]>();
  for (const row of rows) map.set(row.mapping_id, [...(map.get(row.mapping_id) ?? []), row.theme_id]);
  return map;
}

function buildThemeElementIdMap(rows: ThemeLinkRow[]) {
  const map = new Map<string, string[]>();
  for (const row of rows) {
    if (row.theme_element_id) map.set(row.mapping_id, [...(map.get(row.mapping_id) ?? []), row.theme_element_id]);
  }
  return map;
}

function buildThemeElementLinkMap(rows: ThemeLinkRow[]) {
  const map = new Map<string, SelectedCctElement[]>();
  for (const row of rows) {
    if (row.theme_element_id) map.set(row.mapping_id, [...(map.get(row.mapping_id) ?? []), { themeId: row.theme_id, elementId: row.theme_element_id }]);
  }
  return map;
}

function buildThemeNotesMap(rows: ThemeLinkRow[]) {
  const map = new Map<string, string>();
  for (const row of rows) {
    if (row.notes && !map.has(row.mapping_id)) map.set(row.mapping_id, row.notes);
  }
  return map;
}

function buildThemeElementsByThemeId(rows: ThemeElementReferenceRow[]) {
  const map = new Map<string, CrossCuttingThemeElement[]>();
  for (const row of rows) {
    const element = {
      id: row.id,
      schoolId: row.school_id,
      themeId: row.theme_id,
      name: row.name.trim(),
      description: row.description,
      displayOrder: row.display_order ?? 0,
      active: row.active ?? true
    };
    map.set(row.theme_id, [...(map.get(row.theme_id) ?? []), element]);
  }
  return map;
}

function buildFrameworkColourThemeSettings(rows: FrameworkColourThemeRow[], frameworksById: Map<string, FrameworkReferenceRow>) {
  const themes: Record<string, FrameworkThemeSetting> = {};
  for (const row of rows) {
    const framework = frameworksById.get(row.framework_id);
    if (!framework) continue;
    const key = frameworkThemeKey(framework.name, framework.short_name);
    if (!key) continue;
    themes[key] = {
      primary: row.primary_colour,
      pale: row.pale_colour,
      badge: row.badge_colour,
      chart: row.chart_colour
    };
  }
  return themes;
}

function frameworkThemeKey(name: string, shortName?: string | null) {
  const label = `${name} ${shortName ?? ""}`.toLowerCase();
  if (label.includes("literacy")) return "Literacy";
  if (label.includes("numeracy")) return "Numeracy";
  if (label.includes("digital") || label.includes("dcf")) return "DCF";
  if (label.includes("cross") || label.includes("theme")) return "Cross-cutting themes";
  return null;
}

function normaliseReferenceName<T extends ReferenceRow>(row: T): T {
  return { ...row, name: row.name.trim() };
}

async function resolveLiveSchool(client: SupabaseClient, schoolId: string, fallbackSchool?: School): Promise<School | undefined> {
  const { data: row } = await client.from("schools").select("id, slug, name, motto, active").eq("slug", "caerleon").single();

  if (!row) return undefined;
  const { data: branding } = await client
    .from("branding_settings")
    .select("school_name,motto,logo_url,primary_colour,secondary_colour")
    .eq("school_id", row.id)
    .maybeSingle<BrandingSettingsRow>();

  return {
    id: row.id,
    slug: row.slug,
    name: branding?.school_name?.trim() || row.name,
    motto: branding?.motto?.trim() || row.motto || fallbackSchool?.motto || "Curriculum visibility",
    logoUrl: branding?.logo_url || fallbackSchool?.logoUrl || "/schlogo.png",
    primaryColour: branding?.primary_colour || fallbackSchool?.primaryColour || "#741B47",
    secondaryColour: branding?.secondary_colour || fallbackSchool?.secondaryColour || "#571435",
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
    crossCuttingThemeElementIds: refs.themeElementIdsByMappingId.get(row.id) ?? [],
    crossCuttingThemeElementLinks: refs.themeElementLinksByMappingId.get(row.id) ?? [],
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

async function replaceThemeLinks(client: SupabaseClient, mappingId: string, themeLinks: SelectedCctElement[], notes: string, userId?: string): Promise<MappingMutationResult> {
  const uniqueLinks = Array.from(new Map(themeLinks.filter((link) => link.themeId && link.elementId).map((link) => [`${link.themeId}:${link.elementId}`, link])).values());
  if (!looksLikeUuid(mappingId) || uniqueLinks.some((link) => !looksLikeUuid(link.themeId) || !looksLikeUuid(link.elementId))) {
    return { ok: false, message: "Cross-cutting theme data is not using database IDs. Reload cross-cutting themes from Supabase." };
  }

  const { data: existingRows, error: existingError } = await client
    .from("curriculum_mapping_theme_links")
    .select("id,mapping_id,theme_id,theme_element_id,notes")
    .eq("mapping_id", mappingId);
  if (existingError) return { ok: false, message: existingError.message };

  const existing = (existingRows ?? []) as ThemeLinkRow[];
  if (!uniqueLinks.length) {
    const { error: deleteError } = await client.from("curriculum_mapping_theme_links").delete().eq("mapping_id", mappingId);
    return deleteError ? { ok: false, message: deleteError.message } : { ok: true };
  }

  const desiredKeys = new Set(uniqueLinks.map((link) => cctLinkKey(link.themeId, link.elementId)));
  const existingKeys = new Set(existing.filter((row) => row.theme_element_id).map((row) => cctLinkKey(row.theme_id, row.theme_element_id ?? "")));
  const missingLinks = uniqueLinks.filter((link) => !existingKeys.has(cctLinkKey(link.themeId, link.elementId)));

  if (missingLinks.length) {
    const { error } = await client.from("curriculum_mapping_theme_links").insert(
      missingLinks.map((link) => ({
      mapping_id: mappingId,
      theme_id: link.themeId,
      theme_element_id: link.elementId,
      notes: notes.trim() || null,
      created_by: userId ?? null
      }))
    );
    if (error) return { ok: false, message: error.message };
  }

  const obsoleteIds = existing
    .filter((row) => row.id)
    .filter((row) => !row.theme_element_id || !desiredKeys.has(cctLinkKey(row.theme_id, row.theme_element_id)))
    .map((row) => row.id as string);
  const existingDesiredIds = existing
    .filter((row) => row.id && row.theme_element_id && desiredKeys.has(cctLinkKey(row.theme_id, row.theme_element_id)))
    .map((row) => row.id as string);

  if (existingDesiredIds.length) {
    const { error: updateError } = await client
      .from("curriculum_mapping_theme_links")
      .update({ notes: notes.trim() || null })
      .in("id", existingDesiredIds);
    if (updateError) return { ok: false, message: updateError.message };
  }

  if (obsoleteIds.length) {
    const { error: deleteError } = await client.from("curriculum_mapping_theme_links").delete().in("id", obsoleteIds);
    if (deleteError) return { ok: false, message: deleteError.message };
  }

  return verifyThemeLinksSaved(client, mappingId, desiredKeys);
}

function themeLinksForEntry(entry: MappingEntry): SelectedCctElement[] {
  if (entry.crossCuttingThemeElementLinks?.length) return entry.crossCuttingThemeElementLinks;
  return [];
}

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function cctLinkKey(themeId: string, elementId: string) {
  return `${themeId}:${elementId}`;
}

async function verifyThemeLinksSaved(client: SupabaseClient, mappingId: string, desiredKeys: Set<string>): Promise<MappingMutationResult> {
  const { data, error } = await client
    .from("curriculum_mapping_theme_links")
    .select("theme_id,theme_element_id")
    .eq("mapping_id", mappingId);

  if (error) {
    return {
      ok: false,
      message: `Cross-cutting theme selections could not be checked after saving: ${error.message}`
    };
  }

  const savedKeys = new Set(
    ((data ?? []) as Pick<ThemeLinkRow, "theme_id" | "theme_element_id">[])
      .filter((row) => row.theme_element_id)
      .map((row) => cctLinkKey(row.theme_id, row.theme_element_id ?? ""))
  );
  const missingKeys = Array.from(desiredKeys).filter((key) => !savedKeys.has(key));

  if (missingKeys.length) {
    return {
      ok: false,
      message: "Cross-cutting theme selections were not saved by Supabase. Check the curriculum_mapping_theme_links.theme_element_id column and table permissions."
    };
  }

  return { ok: true };
}

function hasSubjectName(subjectName: string, existingNames: string[]) {
  const normalised = subjectName.trim().toLowerCase();
  return existingNames.some((name) => name.trim().toLowerCase() === normalised);
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

function schoolPatchToLiveSchoolPatch(patch: Partial<School>) {
  const livePatch: { name?: string; slug?: string; motto?: string; active?: boolean } = {};
  if (typeof patch.name === "string") livePatch.name = patch.name;
  if (typeof patch.slug === "string") livePatch.slug = patch.slug;
  if (typeof patch.motto === "string") livePatch.motto = patch.motto;
  if (typeof patch.active === "boolean") livePatch.active = patch.active;
  return livePatch;
}

function schoolPatchToBrandingPatch(patch: Partial<School>, currentSchool: School) {
  const hasBrandingChange = ["name", "motto", "logoUrl", "primaryColour", "secondaryColour"].some((key) => key in patch);
  if (!hasBrandingChange) return null;
  return {
    school_id: currentSchool.id,
    school_name: patch.name ?? currentSchool.name,
    motto: patch.motto ?? currentSchool.motto,
    logo_url: patch.logoUrl ?? currentSchool.logoUrl,
    primary_colour: patch.primaryColour ?? currentSchool.primaryColour,
    secondary_colour: patch.secondaryColour ?? currentSchool.secondaryColour
  };
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
