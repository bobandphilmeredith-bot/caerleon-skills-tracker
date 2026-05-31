"use client";

import { useEffect, useMemo, useState } from "react";
import { AccessDenied } from "@/components/AccessDenied";
import { PageHeader } from "@/components/PageHeader";
import { progressionSteps } from "@/lib/progression";
import type { AoleConfig, ElementDefinition, FrameworkDefinition, ProgressionStep, SubjectConfig } from "@/lib/types";
import { areaThemes } from "@/lib/theme";
import { defaultSchoolSettings, type BrandingSettings, type FrameworkThemeSetting, useSchoolSettings } from "@/lib/schoolSettings";
import { useCurrentSchool } from "@/lib/currentSchool";
import { useAuth } from "@/lib/auth";
import { isDemoLoginEnabled, supabase } from "@/lib/supabaseClient";

type AdminFramework = { id?: string; schoolId?: string; name: string; shortName: string; active: boolean; displayOrder?: number; strands: AdminStrand[] };
type AdminStrand = { id?: string; schoolId?: string; frameworkId?: string; name: string; shortName?: string | null; description?: string | null; active: boolean; displayOrder?: number; elements: AdminElement[] };
type AdminElement = ElementDefinition & { active: boolean; displayOrder?: number };
type AdminTab = "School" | "Branding" | "Subjects" | "AoLE" | "Frameworks" | "Records";

const adminTabs: AdminTab[] = ["School", "Branding", "Subjects", "AoLE", "Frameworks", "Records"];

export default function AdminPage() {
  const { canManageSchool } = useAuth();
  const { settings, updateBranding, updateFrameworkTheme, resetAllSettings } = useSchoolSettings();
  const { schools, currentSchool, currentSchoolId, data, switchSchool, addSchool, updateSchool, toggleSchoolActive, addSubjectConfig, updateSubjectConfig } = useCurrentSchool();
  const [subjects, setSubjects] = useState<SubjectConfig[]>(data.subjectConfigs);
  const [aoles, setAoles] = useState<AoleConfig[]>(data.aoleConfigs);
  const [frameworks, setFrameworks] = useState<AdminFramework[]>(() => loadAdminFrameworks(data.frameworkLibrary, currentSchoolId));
  const [notice, setNotice] = useState("");
  const [reviewCycle, setReviewCycle] = useState("Termly curriculum review");
  const [academicYears, setAcademicYears] = useState(data.yearGroups.map((year, index) => ({ name: year, active: true, displayOrder: index + 1 })));
  const [termSettings, setTermSettings] = useState(data.terms.map((term, index) => ({ name: term, active: true, displayOrder: index + 1 })));
  const [confirmAction, setConfirmAction] = useState<null | { title: string; body: string; action: () => void }>(null);
  const [practiceMappings, setPracticeMappings] = useState(126);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [activeTab, setActiveTab] = useState<AdminTab>("School");
  const [addSubjectOpen, setAddSubjectOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectAoleId, setNewSubjectAoleId] = useState("");
  const [newSubjectActive, setNewSubjectActive] = useState(true);
  const [newSubjectAppears, setNewSubjectAppears] = useState(true);
  const [subjectFormError, setSubjectFormError] = useState("");
  const [brandingDraft, setBrandingDraft] = useState<BrandingSettings>(settings.branding);
  const [brandingDirty, setBrandingDirty] = useState(false);
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [brandingError, setBrandingError] = useState("");
  const [frameworkThemeDraft, setFrameworkThemeDraft] = useState<Record<string, FrameworkThemeSetting>>(settings.frameworkThemes);
  const [frameworkThemeDirty, setFrameworkThemeDirty] = useState(false);
  const [frameworkThemeSaving, setFrameworkThemeSaving] = useState(false);
  const [frameworkThemeError, setFrameworkThemeError] = useState("");
  const [frameworkSaving, setFrameworkSaving] = useState(false);
  const [frameworkError, setFrameworkError] = useState("");
  const schoolOptions = schools.some((school) => school.id === currentSchoolId) ? schools : [currentSchool, ...schools];

  if (!canManageSchool) {
    return <AccessDenied title="Admin setup restricted" message="Only platform admins and school admins can manage school setup, users, frameworks, branding and practice records." />;
  }

  useEffect(() => {
    setSubjects(data.subjectConfigs);
    setAoles(data.aoleConfigs);
    setFrameworks(loadAdminFrameworks(data.frameworkLibrary, currentSchoolId));
    setPracticeMappings(data.mappings.length);
  }, [currentSchoolId, data]);

  useEffect(() => {
    let cancelled = false;
    async function loadCompleteFrameworkLibrary() {
      if (isDemoLoginEnabled || !supabase) return;
      const result = await loadAdminFrameworksFromSupabase(currentSchool.id);
      if (cancelled) return;
      if (result.ok) {
        setFrameworks(result.frameworks);
      } else {
        setFrameworkError(result.message);
      }
    }
    void loadCompleteFrameworkLibrary();
    return () => {
      cancelled = true;
    };
  }, [currentSchool.id]);

  useEffect(() => {
    setBrandingDraft(settings.branding);
    setBrandingDirty(false);
    setBrandingError("");
  }, [
    currentSchool.id,
    settings.branding.schoolName,
    settings.branding.motto,
    settings.branding.primaryColour,
    settings.branding.secondaryColour,
    settings.branding.logoDataUrl
  ]);

  useEffect(() => {
    setFrameworkThemeDraft(settings.frameworkThemes);
    setFrameworkThemeDirty(false);
    setFrameworkThemeError("");
  }, [currentSchool.id, settings.frameworkThemes]);

  const activeAoles = aoles.filter((aole) => aole.active);
  const subjectCounts = useMemo(
    () => ({
      active: subjects.filter((subject) => subject.active).length,
      mapping: subjects.filter((subject) => subject.active && subject.appearsInMappingDropdowns).length
    }),
    [subjects]
  );

  async function saveNewSubject() {
    const name = newSubjectName.trim();
    if (!name) {
      setSubjectFormError("Subject name is required.");
      return;
    }
    if (subjects.some((subject) => subject.name.trim().toLowerCase() === name.toLowerCase())) {
      setSubjectFormError(`${name} already exists for this school.`);
      return;
    }

    const selectedAole = activeAoles.find((aole) => aole.id === newSubjectAoleId);
    const result = await addSubjectConfig({
      name,
      aoeId: selectedAole?.id ?? null,
      active: newSubjectActive,
      appearsInMappingDropdowns: newSubjectAppears
    });
    if (!result.ok) {
      setSubjectFormError(result.message ?? "Could not add subject.");
      return;
    }
    setAddSubjectOpen(false);
    setNewSubjectName("");
    setNewSubjectAoleId("");
    setNewSubjectActive(true);
    setNewSubjectAppears(true);
    setSubjectFormError("");
    setNotice("Subject added.");
  }

  function updateSubject(id: string, patch: Partial<SubjectConfig>) {
    setSubjects((current) => current.map((subject) => (subject.id === id ? { ...subject, ...patch } : subject)));
    void updateSubjectConfig(id, patch).then((result) => {
      if (!result.ok) setNotice(result.message ?? "Could not save subject setting.");
    });
  }

  function updateBrandingDraft(patch: Partial<BrandingSettings>) {
    setBrandingDraft((current) => ({ ...current, ...patch }));
    setBrandingDirty(true);
    setBrandingError("");
  }

  async function saveBrandingSettings() {
    const nextBranding = {
      ...brandingDraft,
      schoolName: brandingDraft.schoolName.trim() || currentSchool.name,
      motto: brandingDraft.motto.trim()
    };
    if (!/^#[0-9A-Fa-f]{6}$/.test(nextBranding.primaryColour) || !/^#[0-9A-Fa-f]{6}$/.test(nextBranding.secondaryColour)) {
      setBrandingError("Use six-digit hex colours, for example #741B47.");
      return;
    }

    setBrandingSaving(true);
    setBrandingError("");

    if (!isDemoLoginEnabled) {
      if (!supabase) {
        setBrandingSaving(false);
        setBrandingError("Supabase is not configured, so branding could not be saved.");
        return;
      }

      const { error } = await supabase.from("branding_settings").upsert(
        {
          school_id: currentSchool.id,
          school_name: nextBranding.schoolName,
          motto: nextBranding.motto || null,
          logo_url: nextBranding.logoDataUrl,
          primary_colour: nextBranding.primaryColour,
          secondary_colour: nextBranding.secondaryColour
        },
        { onConflict: "school_id" }
      );

      if (error) {
        setBrandingSaving(false);
        setBrandingError(error.message);
        return;
      }
    }

    updateBranding(nextBranding);
    updateSchool(currentSchool.id, {
      name: nextBranding.schoolName,
      motto: nextBranding.motto,
      primaryColour: nextBranding.primaryColour,
      secondaryColour: nextBranding.secondaryColour,
      logoUrl: nextBranding.logoDataUrl
    });
    setBrandingDraft(nextBranding);
    setBrandingDirty(false);
    setBrandingSaving(false);
    setNotice("Branding saved.");
  }

  function updateFrameworkThemeDraft(framework: string, patch: Partial<FrameworkThemeSetting>) {
    setFrameworkThemeDraft((current) => ({
      ...current,
      [framework]: { ...current[framework], ...patch }
    }));
    setFrameworkThemeDirty(true);
    setFrameworkThemeError("");
  }

  async function saveFrameworkColourThemes() {
    const invalidTheme = Object.entries(frameworkThemeDraft).find(([, theme]) => !Object.values(theme).every(isHexColour));
    if (invalidTheme) {
      setFrameworkThemeError(`Check the colour values for ${invalidTheme[0]}. Use six-digit hex colours, for example #EA580C.`);
      return;
    }

    setFrameworkThemeSaving(true);
    setFrameworkThemeError("");

    if (!isDemoLoginEnabled) {
      if (!supabase) {
        setFrameworkThemeSaving(false);
        setFrameworkThemeError("Supabase is not configured, so framework colours could not be saved.");
        return;
      }

      const rows = data.frameworkLibrary
        .map((framework) => {
          const key = frameworkThemeKey(framework.name, framework.shortName);
          const theme = key ? frameworkThemeDraft[key] : undefined;
          return framework.id && theme
            ? {
                school_id: currentSchool.id,
                framework_id: framework.id,
                primary_colour: theme.primary,
                pale_colour: theme.pale,
                badge_colour: theme.badge,
                chart_colour: theme.chart
              }
            : null;
        })
        .filter((row) => row !== null);

      if (rows.length) {
        const { error } = await supabase.from("framework_colour_themes").upsert(rows, { onConflict: "framework_id" });
        if (error) {
          setFrameworkThemeSaving(false);
          setFrameworkThemeError(error.message);
          return;
        }
      }
    }

    Object.entries(frameworkThemeDraft).forEach(([framework, theme]) => updateFrameworkTheme(framework, theme));
    setFrameworkThemeDirty(false);
    setFrameworkThemeSaving(false);
    setNotice("Framework colour themes saved.");
  }

  function addAole() {
    setAoles((current) => [...current, { id: `aole-${Date.now()}`, name: "New AoLE", active: true }]);
  }

  function updateAole(id: string, patch: Partial<AoleConfig>) {
    setAoles((current) => current.map((aole) => (aole.id === id ? { ...aole, ...patch } : aole)));
  }

  function addFramework() {
    setFrameworks((current) => [
      ...current,
      {
        name: "New framework",
        shortName: "New",
        active: true,
        strands: [{ name: "New strand", active: true, elements: [newElement()] }]
      }
    ]);
  }

  function updateFramework(index: number, patch: Partial<AdminFramework>) {
    setFrameworks((current) => current.map((framework, frameworkIndex) => (frameworkIndex === index ? { ...framework, ...patch } : framework)));
  }

  function updateStrand(frameworkIndex: number, strandIndex: number, patch: Partial<AdminStrand>) {
    setFrameworks((current) =>
      current.map((framework, currentFrameworkIndex) =>
        currentFrameworkIndex === frameworkIndex
          ? { ...framework, strands: framework.strands.map((strand, currentStrandIndex) => (currentStrandIndex === strandIndex ? { ...strand, ...patch } : strand)) }
          : framework
      )
    );
  }

  function updateElement(frameworkIndex: number, strandIndex: number, elementIndex: number, patch: Partial<AdminElement>) {
    setFrameworks((current) =>
      current.map((framework, currentFrameworkIndex) =>
        currentFrameworkIndex === frameworkIndex
          ? {
              ...framework,
              strands: framework.strands.map((strand, currentStrandIndex) =>
                currentStrandIndex === strandIndex
                  ? { ...strand, elements: strand.elements.map((element, currentElementIndex) => (currentElementIndex === elementIndex ? { ...element, ...patch } : element)) }
                  : strand
              )
            }
          : framework
      )
    );
  }

  async function toggleFrameworkActive(frameworkIndex: number) {
    const framework = frameworks[frameworkIndex];
    if (!framework) return;
    const nextActive = !framework.active;
    updateFramework(frameworkIndex, { active: nextActive });
    if (framework.id) await persistActiveState("frameworks", framework.id, nextActive, () => updateFramework(frameworkIndex, { active: framework.active }));
  }

  async function toggleStrandActive(frameworkIndex: number, strandIndex: number) {
    const strand = frameworks[frameworkIndex]?.strands[strandIndex];
    if (!strand) return;
    const nextActive = !strand.active;
    updateStrand(frameworkIndex, strandIndex, { active: nextActive });
    if (strand.id) await persistActiveState("strands", strand.id, nextActive, () => updateStrand(frameworkIndex, strandIndex, { active: strand.active }));
  }

  async function toggleElementActive(frameworkIndex: number, strandIndex: number, elementIndex: number) {
    const element = frameworks[frameworkIndex]?.strands[strandIndex]?.elements[elementIndex];
    if (!element) return;
    const nextActive = !element.active;
    updateElement(frameworkIndex, strandIndex, elementIndex, { active: nextActive });
    if (element.id) await persistActiveState("elements", element.id, nextActive, () => updateElement(frameworkIndex, strandIndex, elementIndex, { active: element.active }));
  }

  async function persistActiveState(table: "frameworks" | "strands" | "elements", id: string, active: boolean, revert: () => void) {
    setFrameworkError("");
    if (isDemoLoginEnabled) return;
    if (!supabase) {
      revert();
      setFrameworkError("Supabase is not configured, so archive status could not be saved.");
      return;
    }
    const { error } = await supabase.from(table).update({ active }).eq("id", id).eq("school_id", currentSchool.id);
    if (error) {
      revert();
      setFrameworkError(error.message);
      return;
    }
    setNotice(active ? "Item reactivated." : "Item archived.");
  }

  async function saveFrameworksToSupabase() {
    setFrameworkError("");

    const invalidFramework = frameworks.find((framework) => !framework.name.trim() || !framework.shortName.trim());
    if (invalidFramework) {
      setFrameworkError("Every framework needs a name and short name before saving.");
      return;
    }

    const invalidStrand = frameworks.flatMap((framework) => framework.strands).find((strand) => !strand.name.trim());
    if (invalidStrand) {
      setFrameworkError("Every strand needs a name before saving.");
      return;
    }

    const invalidElement = frameworks.flatMap((framework) => framework.strands.flatMap((strand) => strand.elements)).find((element) => !element.name.trim());
    if (invalidElement) {
      setFrameworkError("Every element needs a name before saving.");
      return;
    }

    if (!isDemoLoginEnabled && !supabase) {
      setFrameworkError("Supabase is not configured, so framework changes could not be saved.");
      return;
    }

    setFrameworkSaving(true);

    if (isDemoLoginEnabled) {
      setFrameworkSaving(false);
      setNotice("Framework changes saved for this demo session.");
      return;
    }

    const savedFrameworks: AdminFramework[] = [];
    const client = supabase!;

    for (const [frameworkIndex, framework] of frameworks.entries()) {
      const frameworkPayload = {
        school_id: currentSchool.id,
        name: framework.name.trim(),
        short_name: framework.shortName.trim(),
        description: null,
        display_order: framework.displayOrder ?? frameworkIndex + 1,
        active: framework.active
      };
      const frameworkResult = framework.id
        ? await client.from("frameworks").update(frameworkPayload).eq("id", framework.id).eq("school_id", currentSchool.id).select("id,school_id,display_order").single()
        : await client.from("frameworks").insert(frameworkPayload).select("id,school_id,display_order").single();

      if (frameworkResult.error || !frameworkResult.data) {
        setFrameworkSaving(false);
        setFrameworkError(frameworkResult.error?.message ?? `Could not save ${framework.name}.`);
        return;
      }

      const savedStrands: AdminStrand[] = [];
      const frameworkId = frameworkResult.data.id;

      for (const [strandIndex, strand] of framework.strands.entries()) {
        const strandPayload = {
          school_id: currentSchool.id,
          framework_id: frameworkId,
          name: strand.name.trim(),
          short_name: strand.shortName?.trim() || strand.name.trim(),
          description: strand.description ?? null,
          display_order: strand.displayOrder ?? strandIndex + 1,
          active: strand.active
        };
        const strandResult = strand.id
          ? await client.from("strands").update(strandPayload).eq("id", strand.id).eq("school_id", currentSchool.id).select("id,school_id,framework_id,display_order").single()
          : await client.from("strands").insert(strandPayload).select("id,school_id,framework_id,display_order").single();

        if (strandResult.error || !strandResult.data) {
          setFrameworkSaving(false);
          setFrameworkError(strandResult.error?.message ?? `Could not save ${strand.name}.`);
          return;
        }

        const savedElements: AdminElement[] = [];
        const strandId = strandResult.data.id;

        for (const [elementIndex, element] of strand.elements.entries()) {
          const explanation = element.explanation?.trim() || element.officialWording?.trim() || element.name.trim();
          const elementPayload = {
            school_id: currentSchool.id,
            strand_id: strandId,
            name: element.name.trim(),
            description: explanation,
            official_wording: element.officialWording?.trim() || element.name.trim(),
            teacher_friendly_explanation: explanation,
            display_order: element.displayOrder ?? elementIndex + 1,
            active: element.active
          };
          const elementResult = element.id
            ? await client.from("elements").update(elementPayload).eq("id", element.id).eq("school_id", currentSchool.id).select("id,school_id,display_order").single()
            : await client.from("elements").insert(elementPayload).select("id,school_id,display_order").single();

          if (elementResult.error || !elementResult.data) {
            setFrameworkSaving(false);
            setFrameworkError(elementResult.error?.message ?? `Could not save ${element.name}.`);
            return;
          }

          const elementId = elementResult.data.id;
          const descriptorRefs = [];

          for (const step of progressionSteps) {
            const text = element.progressionDescriptors?.[step]?.trim() ?? "";
            const existingDescriptor = element.progressionDescriptorRefs?.find((descriptor) => descriptor.progressionStep === step || descriptor.progressionStepNumber === progressionStepNumber(step));

            if (!text) {
              if (existingDescriptor?.id) await client.from("progression_descriptors").update({ active: false }).eq("id", existingDescriptor.id).eq("school_id", currentSchool.id);
              continue;
            }

            const descriptorPayload = {
              school_id: currentSchool.id,
              element_id: elementId,
              progression_step: progressionStepNumber(step),
              descriptor_text: text,
              display_order: progressionStepNumber(step),
              active: true
            };
            const descriptorResult = existingDescriptor?.id
              ? await client.from("progression_descriptors").update(descriptorPayload).eq("id", existingDescriptor.id).eq("school_id", currentSchool.id).select("id").single()
              : await client.from("progression_descriptors").upsert(descriptorPayload, { onConflict: "element_id,progression_step" }).select("id").single();

            if (descriptorResult.error || !descriptorResult.data) {
              setFrameworkSaving(false);
              setFrameworkError(descriptorResult.error?.message ?? `Could not save ${element.name} ${step} descriptor.`);
              return;
            }

            descriptorRefs.push({
              id: descriptorResult.data.id,
              progressionStep: step,
              progressionStepNumber: progressionStepNumber(step),
              descriptorText: text
            });
          }

          savedElements.push({
            ...element,
            id: elementId,
            schoolId: currentSchool.id,
            displayOrder: elementResult.data.display_order ?? element.displayOrder ?? elementIndex + 1,
            progressionDescriptorRefs: descriptorRefs
          });
        }

        savedStrands.push({
          ...strand,
          id: strandId,
          schoolId: currentSchool.id,
          frameworkId,
          displayOrder: strandResult.data.display_order ?? strand.displayOrder ?? strandIndex + 1,
          elements: savedElements
        });
      }

      savedFrameworks.push({
        ...framework,
        id: frameworkId,
        schoolId: currentSchool.id,
        displayOrder: frameworkResult.data.display_order ?? framework.displayOrder ?? frameworkIndex + 1,
        strands: savedStrands
      });
    }

    if (typeof window !== "undefined") window.localStorage.removeItem(`skills-tracker-admin-frameworks-${currentSchoolId}`);
    setFrameworks(savedFrameworks);
    setFrameworkSaving(false);
    setNotice("Frameworks, strands, elements and progression descriptors saved to Supabase.");
  }

  function addStrand(frameworkIndex: number) {
    setFrameworks((current) =>
      current.map((framework, currentFrameworkIndex) =>
        currentFrameworkIndex === frameworkIndex ? { ...framework, strands: [...framework.strands, { name: "New strand", active: true, elements: [newElement()] }] } : framework
      )
    );
  }

  function addElement(frameworkIndex: number, strandIndex: number) {
    setFrameworks((current) =>
      current.map((framework, currentFrameworkIndex) =>
        currentFrameworkIndex === frameworkIndex
          ? {
              ...framework,
              strands: framework.strands.map((strand, currentStrandIndex) =>
                currentStrandIndex === strandIndex ? { ...strand, elements: [...strand.elements, newElement()] } : strand
              )
            }
          : framework
      )
    );
  }

  function handleLogoUpload(file?: File) {
    if (!file) return;
    const allowed = ["image/png", "image/jpeg", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      setNotice("Please upload a PNG, JPG or SVG logo.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateBrandingDraft({ logoDataUrl: String(reader.result) });
    reader.readAsDataURL(file);
  }

  function handleSchoolLogoUpload(schoolId: string, file?: File) {
    if (!file) return;
    const allowed = ["image/png", "image/jpeg", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      setNotice("Please upload a PNG, JPG or SVG logo.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateSchool(schoolId, { logoUrl: String(reader.result) });
    reader.readAsDataURL(file);
  }

  function confirmPracticeAction(title: string, body: string, action: () => void) {
    setConfirmAction({ title, body, action });
  }

  function runConfirmedAction() {
    confirmAction?.action();
    setConfirmAction(null);
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Admin Setup"
        eyebrow="Subject-first system configuration"
        description="Manage local structures for curriculum mapping. Subjects are the main organising unit; AoLE is optional reporting metadata."
        accent={areaThemes.overview.accent}
      />

      {notice ? (
        <div className="rounded-lg border border-[#e8cfe0] bg-[#f7edf3] p-4 text-sm font-semibold text-[#571435]">
          {notice}
          <button className="focus-ring ml-4 rounded-md bg-white px-3 py-1 text-xs font-bold" type="button" onClick={() => setNotice("")}>
            Dismiss
          </button>
        </div>
      ) : null}

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-900 shadow-sm">
        Manage sample curriculum records used in dashboards, framework views and reports.
      </section>

      <div className="rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {adminTabs.map((tab) => (
            <button
              key={tab}
              className={`focus-ring rounded-md px-4 py-2 text-sm font-bold ${activeTab === tab ? "bg-[#741B47] text-white" : "bg-gray-50 text-gray-700 hover:bg-[#f7edf3]"}`}
              type="button"
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <section className={adminPanelClass(activeTab, "School")}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">School Management</h2>
            <p className="mt-1 text-sm text-gray-600">Switch schools to check that branding, subjects, mappings, frameworks and reports remain separated.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <select className="focus-ring rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold" value={currentSchoolId} onChange={(event) => switchSchool(event.target.value)}>
              {schoolOptions.filter((school) => school.active).map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
            <button className="focus-ring btn btn-primary" type="button" onClick={() => { const school = addSchool(); setNotice(`${school.name} added. Use the fields below to edit its setup.`); }}>
              Add school
            </button>
            <button className="focus-ring btn btn-secondary" type="button" onClick={() => setWizardOpen(true)}>
              New School Setup Wizard
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {schools.map((school) => (
            <article key={school.id} className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-md border border-gray-200 bg-white p-1.5">
                  <img src={school.logoUrl} alt="" className="h-full w-full object-contain" />
                </div>
                <div className="grid flex-1 gap-3 md:grid-cols-2">
                  <LabelledInput label="School name" value={school.name} onChange={(value) => updateSchool(school.id, { name: value })} />
                  <LabelledInput label="Slug" value={school.slug} onChange={(value) => updateSchool(school.id, { slug: value.toLowerCase().replace(/[^a-z0-9-]+/g, "-") })} />
                  <LabelledInput label="Motto" value={school.motto} onChange={(value) => updateSchool(school.id, { motto: value })} />
                  <label>
                    <span className="mb-1 block text-sm font-semibold text-gray-700">Logo</span>
                    <input className="focus-ring w-full rounded-md border border-gray-300 px-3 py-2 text-sm" type="file" accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml" onChange={(event) => handleSchoolLogoUpload(school.id, event.target.files?.[0])} />
                  </label>
                  <ColourInput label="Primary colour" value={school.primaryColour} onChange={(value) => updateSchool(school.id, { primaryColour: value })} />
                  <ColourInput label="Secondary colour" value={school.secondaryColour} onChange={(value) => updateSchool(school.id, { secondaryColour: value })} />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">ID: {school.id}</span>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">Created: {school.createdAt}</span>
                <button className="focus-ring btn btn-muted text-xs" type="button" onClick={() => toggleSchoolActive(school.id)}>
                  {school.active ? "Deactivate school" : "Reactivate school"}
                </button>
                <button className="focus-ring btn btn-secondary text-xs" type="button" onClick={() => switchSchool(school.id)} disabled={!school.active}>
                  Switch to this school
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={adminPanelClass(activeTab, "School")}>
        <h2 className="text-lg font-bold text-gray-900">Current School Context</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ContextCard label="Current school" value={currentSchool.name} />
          <ContextCard label="Subjects visible" value={String(data.subjects.length)} />
          <ContextCard label="Mapped opportunities" value={String(data.mappings.length)} />
          <ContextCard label="Frameworks" value={String(data.frameworkLibrary.length)} />
        </div>
      </section>

      <section className={adminPanelClass(activeTab, "Branding")}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">School Branding</h2>
            <p className="mt-1 text-sm text-gray-600">Branding is used across the sidebar, page headers and printable reports. Changes are saved only when you press Save branding.</p>
          </div>
          <div className="grid h-24 w-24 place-items-center rounded-md border border-gray-200 bg-white p-2">
            <img src={brandingDraft.logoDataUrl} alt="School logo preview" className="h-full w-full object-contain" />
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <LabelledInput label="School name" value={brandingDraft.schoolName} onChange={(value) => updateBrandingDraft({ schoolName: value })} />
          <LabelledInput label="Motto / tagline" value={brandingDraft.motto} onChange={(value) => updateBrandingDraft({ motto: value })} />
          <ColourInput label="Primary colour" value={brandingDraft.primaryColour} onChange={(value) => updateBrandingDraft({ primaryColour: value })} />
          <ColourInput label="Secondary colour" value={brandingDraft.secondaryColour} onChange={(value) => updateBrandingDraft({ secondaryColour: value })} />
          <label className="lg:col-span-2">
            <span className="mb-1 block text-sm font-semibold text-gray-700">Logo upload</span>
            <input className="focus-ring w-full rounded-md border border-gray-300 px-3 py-2" type="file" accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml" onChange={(event) => handleLogoUpload(event.target.files?.[0])} />
          </label>
        </div>
        {brandingError ? <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{brandingError}</p> : null}
        <div className="mt-4 flex flex-wrap gap-3">
          <button className="focus-ring btn btn-primary" type="button" onClick={saveBrandingSettings} disabled={brandingSaving || !brandingDirty}>
            {brandingSaving ? "Saving..." : "Save branding"}
          </button>
          <button
            className="focus-ring btn btn-secondary"
            type="button"
            onClick={() => {
              setBrandingDraft(defaultSchoolSettings.branding);
              setBrandingDirty(true);
              setBrandingError("");
            }}
          >
            Load default branding
          </button>
          <button
            className="focus-ring btn btn-muted"
            type="button"
            onClick={() => {
              setBrandingDraft(settings.branding);
              setBrandingDirty(false);
              setBrandingError("");
            }}
          >
            Discard changes
          </button>
        </div>
      </section>

      <section className={adminPanelClass(activeTab, "Branding")}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Framework Colour Themes</h2>
            <p className="mt-1 text-sm text-gray-600">These colours are used for Literacy, Numeracy, DCF and theme reporting across dashboards and reports.</p>
          </div>
          <button className="focus-ring btn btn-primary" type="button" onClick={saveFrameworkColourThemes} disabled={frameworkThemeSaving || !frameworkThemeDirty}>
            {frameworkThemeSaving ? "Saving..." : "Save framework colours"}
          </button>
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {Object.entries(frameworkThemeDraft).map(([framework, theme]) => (
            <article key={framework} className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-bold text-gray-900">{framework}</h3>
                <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: theme.pale, color: theme.badge }}>
                  Preview
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <ColourInput label="Primary colour" value={theme.primary} onChange={(value) => updateFrameworkThemeDraft(framework, { primary: value })} />
                <ColourInput label="Pale background colour" value={theme.pale} onChange={(value) => updateFrameworkThemeDraft(framework, { pale: value })} />
                <ColourInput label="Badge colour" value={theme.badge} onChange={(value) => updateFrameworkThemeDraft(framework, { badge: value })} />
                <ColourInput label="Chart colour" value={theme.chart} onChange={(value) => updateFrameworkThemeDraft(framework, { chart: value })} />
              </div>
            </article>
          ))}
        </div>
        {frameworkThemeError ? <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{frameworkThemeError}</p> : null}
        <div className="mt-4 flex flex-wrap gap-3">
          <button className="focus-ring btn btn-secondary" type="button" onClick={() => { setFrameworkThemeDraft(defaultSchoolSettings.frameworkThemes); setFrameworkThemeDirty(true); setFrameworkThemeError(""); }}>
            Load default framework colours
          </button>
          <button className="focus-ring btn btn-muted" type="button" onClick={() => { setFrameworkThemeDraft(settings.frameworkThemes); setFrameworkThemeDirty(false); setFrameworkThemeError(""); }}>
            Discard changes
          </button>
        </div>
      </section>

      <section className={adminPanelClass(activeTab, "Records")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Curriculum Records</h2>
            <p className="mt-1 text-sm text-gray-600">{practiceMappings} curriculum mapping entries currently represented in planning.</p>
          </div>
          <span className="rounded-full bg-[#f7edf3] px-3 py-1 text-xs font-bold text-[#571435]">Planning records</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <PracticeButton label="Add curriculum records" onClick={() => confirmPracticeAction("Add curriculum records", "This will add subjects, frameworks, strands, elements, curriculum entries, recent activity and review dates.", () => { setPracticeMappings((value) => value + 48); setNotice("Curriculum records added."); })} />
          <PracticeButton label="Clear curriculum records" onClick={() => confirmPracticeAction("Clear curriculum records", "This will remove curriculum mappings only and keep branding, subjects, frameworks and admin settings.", () => { setPracticeMappings(0); setNotice("Curriculum mappings cleared."); })} />
          <PracticeButton label="Reset curriculum records" onClick={() => confirmPracticeAction("Reset curriculum records", "This will reset branding, framework colours and curriculum records to the current school setup.", () => { resetAllSettings(); setSubjects(data.subjectConfigs); setAoles(data.aoleConfigs); setPracticeMappings(data.mappings.length); setNotice("Curriculum records reset."); })} />
          <PracticeButton label="Restore default Caerleon records" onClick={() => confirmPracticeAction("Restore default Caerleon records", "This will switch back to the Caerleon school and reload its curriculum mappings.", () => { switchSchool("school_caerleon"); resetAllSettings(); setNotice("Default Caerleon records restored."); })} />
        </div>
      </section>

      <section className={adminPanelClass(activeTab, "Subjects")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Subjects</h2>
            <p className="mt-1 text-sm text-gray-600">
              {subjectCounts.active} active subjects · {subjectCounts.mapping} shown in curriculum mapping dropdowns
            </p>
          </div>
          <button
            className="focus-ring btn btn-primary"
            type="button"
            onClick={() => {
              setAddSubjectOpen(true);
              setSubjectFormError("");
            }}
          >
            Add subject
          </button>
        </div>
        {addSubjectOpen ? (
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_minmax(220px,0.8fr)_auto_auto]">
              <label>
                <span className="mb-1 block text-sm font-semibold text-gray-700">Subject name</span>
                <input className="focus-ring w-full rounded-md border border-gray-300 bg-white px-3 py-2" value={newSubjectName} onChange={(event) => setNewSubjectName(event.target.value)} />
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-gray-700">Optional AoLE</span>
                <select className="focus-ring w-full rounded-md border border-gray-300 bg-white px-3 py-2" value={newSubjectAoleId} onChange={(event) => setNewSubjectAoleId(event.target.value)}>
                  <option value="">No AoLE selected</option>
                  {activeAoles.map((aole) => (
                    <option key={aole.id} value={aole.id}>
                      {aole.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-end gap-2 pb-2 text-sm font-semibold text-gray-700">
                <input type="checkbox" checked={newSubjectAppears} onChange={(event) => setNewSubjectAppears(event.target.checked)} />
                Show in mapping
              </label>
              <label className="flex items-end gap-2 pb-2 text-sm font-semibold text-gray-700">
                <input type="checkbox" checked={newSubjectActive} onChange={(event) => setNewSubjectActive(event.target.checked)} />
                Active
              </label>
            </div>
            {subjectFormError ? <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{subjectFormError}</p> : null}
            <div className="mt-4 flex flex-wrap gap-3">
              <button className="focus-ring btn btn-primary" type="button" onClick={saveNewSubject}>
                Save subject
              </button>
              <button
                className="focus-ring btn btn-muted"
                type="button"
                onClick={() => {
                  setAddSubjectOpen(false);
                  setNewSubjectName("");
                  setNewSubjectAoleId("");
                  setNewSubjectActive(true);
                  setNewSubjectAppears(true);
                  setSubjectFormError("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="py-3 pr-3 font-bold">Display order</th>
                <th className="py-3 pr-3 font-bold">Subject</th>
                <th className="py-3 pr-3 font-bold">Optional AoLE</th>
                <th className="py-3 pr-3 font-bold">Mapping dropdown</th>
                <th className="py-3 pr-3 font-bold">Status</th>
                <th className="py-3 pr-3 font-bold">Action</th>
              </tr>
            </thead>
            <tbody>
              {[...subjects].sort((a, b) => a.displayOrder - b.displayOrder).map((subject) => (
                <tr key={subject.id} className="border-b border-gray-100">
                  <td className="py-3 pr-3">
                    <input className="focus-ring w-20 rounded-md border border-gray-300 px-2 py-1" type="number" value={subject.displayOrder} onChange={(event) => updateSubject(subject.id, { displayOrder: Number(event.target.value) })} />
                  </td>
                  <td className="py-3 pr-3">
                    <input className="focus-ring w-full rounded-md border border-gray-300 px-3 py-2" value={subject.name} onChange={(event) => updateSubject(subject.id, { name: event.target.value })} />
                  </td>
                  <td className="py-3 pr-3">
                    <select
                      className="focus-ring w-full rounded-md border border-gray-300 bg-white px-3 py-2"
                      value={subject.aoeId ?? ""}
                      onChange={(event) => {
                        const selectedAole = activeAoles.find((aole) => aole.id === event.target.value);
                        updateSubject(subject.id, { aoeId: selectedAole?.id ?? null, aole: selectedAole?.name });
                      }}
                    >
                      <option value="">No AoLE selected</option>
                      {activeAoles.map((aole) => (
                        <option key={aole.id} value={aole.id}>
                          {aole.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 pr-3">
                    <label className="inline-flex items-center gap-2 font-semibold text-gray-700">
                      <input type="checkbox" checked={subject.appearsInMappingDropdowns} onChange={(event) => updateSubject(subject.id, { appearsInMappingDropdowns: event.target.checked })} />
                      Appears
                    </label>
                  </td>
                  <td className="py-3 pr-3">
                    <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: subject.active ? "#ecfdf3" : "#f3f4f6", color: subject.active ? "#166534" : "#4b5563" }}>
                      {subject.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-3 pr-3">
                    <button className="focus-ring btn btn-secondary text-xs" type="button" onClick={() => updateSubject(subject.id, { active: !subject.active })}>
                      {subject.active ? "Archive" : "Reactivate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={activeTab === "Subjects" ? "grid gap-5 xl:grid-cols-2" : "hidden"}>
        <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Review Cycle Settings</h2>
          <label className="mt-4 block">
            <span className="mb-1 block text-sm font-semibold text-gray-700">Review cycle</span>
            <select className="focus-ring w-full rounded-md border border-gray-300 bg-white px-3 py-2" value={reviewCycle} onChange={(event) => setReviewCycle(event.target.value)}>
              <option>Half-termly curriculum review</option>
              <option>Termly curriculum review</option>
              <option>Annual curriculum review</option>
            </select>
          </label>
          <button className="focus-ring btn btn-secondary mt-4" type="button" onClick={() => setNotice(`${reviewCycle} saved.`)}>
            Save review cycle
          </button>
        </article>

        <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Academic Year Settings</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {academicYears.map((year, index) => (
              <label key={year.name} className="flex items-center justify-between gap-3 rounded-md bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700">
                <span>{year.name}</span>
                <input type="checkbox" checked={year.active} onChange={(event) => setAcademicYears((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, active: event.target.checked } : item)))} />
              </label>
            ))}
            {termSettings.map((term, index) => (
              <label key={term.name} className="flex items-center justify-between gap-3 rounded-md bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700">
                <span>{term.name}</span>
                <input type="checkbox" checked={term.active} onChange={(event) => setTermSettings((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, active: event.target.checked } : item)))} />
              </label>
            ))}
          </div>
        </article>
      </section>

      <section className={adminPanelClass(activeTab, "AoLE")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">AoLE Metadata</h2>
            <p className="mt-1 text-sm text-gray-600">AoLE is optional metadata for filtering and reports. It does not control the main app structure.</p>
          </div>
          <button className="focus-ring btn btn-primary" type="button" onClick={addAole}>
            Add AoLE
          </button>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {aoles.map((aole) => (
            <article key={aole.id} className="rounded-lg border border-gray-200 p-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <input className="focus-ring rounded-md border border-gray-300 px-3 py-2 font-semibold" value={aole.name} onChange={(event) => updateAole(aole.id, { name: event.target.value })} />
                <button className="focus-ring btn btn-secondary text-xs" type="button" onClick={() => updateAole(aole.id, { active: !aole.active })}>
                  {aole.active ? "Archive" : "Reactivate"}
                </button>
              </div>
              <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-gray-500">Subjects assigned</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {subjects.filter((subject) => subject.aole === aole.name).map((subject) => (
                  <span key={subject.id} className="rounded-full bg-[#f7edf3] px-3 py-1 text-xs font-semibold text-[#571435]">
                    {subject.name}
                  </span>
                ))}
                {!subjects.some((subject) => subject.aole === aole.name) ? <span className="text-sm text-gray-500">No subjects assigned yet.</span> : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={adminPanelClass(activeTab, "Frameworks")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Framework Library</h2>
            <p className="mt-1 text-sm text-gray-600">Edit frameworks, strands, elements and progression descriptors in Supabase. Add Curriculum uses these saved records.</p>
          </div>
          <button className="focus-ring btn btn-primary" type="button" onClick={addFramework}>
            Add framework
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {frameworks.map((framework, frameworkIndex) => (
            <details key={`${framework.name}-${frameworkIndex}`} className="rounded-lg border border-gray-200 p-4">
              <summary className="cursor-pointer font-bold text-gray-900">
                <span>{framework.name}</span>
                <StatusBadge active={framework.active} />
              </summary>
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_160px_auto]">
                <input className="focus-ring rounded-md border border-gray-300 px-3 py-2 font-semibold" value={framework.name} onChange={(event) => updateFramework(frameworkIndex, { name: event.target.value })} />
                <input className="focus-ring rounded-md border border-gray-300 px-3 py-2" value={framework.shortName} onChange={(event) => updateFramework(frameworkIndex, { shortName: event.target.value })} />
                <button className="focus-ring btn btn-secondary text-xs" type="button" onClick={() => void toggleFrameworkActive(frameworkIndex)}>
                  {framework.active ? "Archive" : "Reactivate"}
                </button>
              </div>

              <div className="mt-4 space-y-4">
                {framework.strands.map((strand, strandIndex) => (
                  <div key={`${strand.name}-${strandIndex}`} className="rounded-lg bg-gray-50 p-4">
                    <div className="grid gap-3 sm:grid-cols-[1fr_220px_auto_auto]">
                      <input className="focus-ring rounded-md border border-gray-300 px-3 py-2 font-semibold" value={strand.name} onChange={(event) => updateStrand(frameworkIndex, strandIndex, { name: event.target.value })} />
                      <input className="focus-ring rounded-md border border-gray-300 px-3 py-2" value={strand.shortName ?? ""} onChange={(event) => updateStrand(frameworkIndex, strandIndex, { shortName: event.target.value })} placeholder="Short label" />
                      <button className="focus-ring btn btn-muted text-xs" type="button" onClick={() => addElement(frameworkIndex, strandIndex)}>
                        Add element
                      </button>
                      <button className="focus-ring btn btn-secondary text-xs" type="button" onClick={() => void toggleStrandActive(frameworkIndex, strandIndex)}>
                        {strand.active ? "Archive" : "Reactivate"}
                      </button>
                    </div>
                    <div className="mt-2">
                      <StatusBadge active={strand.active} />
                    </div>
                    <div className="mt-3 space-y-3">
                      {strand.elements.map((element, elementIndex) => (
                        <div key={`${element.name}-${elementIndex}`} className="rounded-md border border-gray-200 bg-white p-3">
                          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
                            <input className="focus-ring rounded-md border border-gray-300 px-3 py-2 font-semibold" value={element.name} onChange={(event) => updateElement(frameworkIndex, strandIndex, elementIndex, { name: event.target.value })} />
                            <input
                              className="focus-ring rounded-md border border-gray-300 px-3 py-2"
                              value={element.examples.join(", ")}
                              onChange={(event) => updateElement(frameworkIndex, strandIndex, elementIndex, { examples: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })}
                              placeholder="Example classroom opportunities"
                            />
                            <button className="focus-ring btn btn-secondary text-xs" type="button" onClick={() => void toggleElementActive(frameworkIndex, strandIndex, elementIndex)}>
                              {element.active ? "Archive" : "Reactivate"}
                            </button>
                          </div>
                          <div className="mt-2">
                            <StatusBadge active={element.active} />
                          </div>
                          <textarea
                            className="focus-ring mt-3 min-h-20 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                            value={element.explanation}
                            onChange={(event) => updateElement(frameworkIndex, strandIndex, elementIndex, { explanation: event.target.value })}
                            placeholder="Teacher-friendly explanation"
                          />
                          <div className="mt-3 grid gap-3 lg:grid-cols-5">
                            {progressionSteps.map((step) => (
                              <label key={step}>
                                <span className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-gray-500">{step} descriptor</span>
                                <textarea
                                  className="focus-ring min-h-28 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                  value={element.progressionDescriptors?.[step] ?? ""}
                                  onChange={(event) =>
                                    updateElement(frameworkIndex, strandIndex, elementIndex, {
                                      progressionDescriptors: { ...element.progressionDescriptors, [step]: event.target.value }
                                    })
                                  }
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button className="focus-ring mt-4 rounded-md border border-gray-300 px-3 py-2 text-sm font-bold text-gray-700" type="button" onClick={() => addStrand(frameworkIndex)}>
                Add strand
              </button>
            </details>
          ))}
        </div>
      </section>

      {frameworkError && activeTab === "Frameworks" ? <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{frameworkError}</p> : null}
      <button className={activeTab === "Frameworks" ? "focus-ring btn btn-secondary" : "hidden"} type="button" onClick={saveFrameworksToSupabase} disabled={frameworkSaving}>
        {frameworkSaving ? "Saving..." : "Save framework changes"}
      </button>

      {wizardOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 px-4 py-6" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl rounded-lg bg-white p-5 shadow-xl">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#741B47]">New School Setup Wizard</p>
                <h2 className="mt-1 text-2xl font-bold text-gray-950">Step {wizardStep} of 6</h2>
              </div>
              <button className="focus-ring btn btn-muted" type="button" onClick={() => setWizardOpen(false)}>
                Close
              </button>
            </div>
            <div className="mt-5 rounded-lg bg-gray-50 p-5">
              <WizardStep step={wizardStep} />
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button className="focus-ring btn btn-muted" type="button" onClick={() => setWizardStep((step) => Math.max(1, step - 1))}>
                Previous
              </button>
              <button className="focus-ring btn btn-primary" type="button" onClick={() => wizardStep < 6 ? setWizardStep((step) => step + 1) : (setWizardOpen(false), setWizardStep(1), setNotice("New school setup steps saved."))}>
                {wizardStep < 6 ? "Next step" : "Finish setup"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmAction ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 px-4 py-6" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
            <h2 className="text-xl font-bold text-gray-950">{confirmAction.title}</h2>
            <p className="mt-2 text-sm leading-6 text-gray-700">{confirmAction.body}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button className="focus-ring btn btn-primary" type="button" onClick={runConfirmedAction}>
                Confirm
              </button>
              <button className="focus-ring btn btn-muted" type="button" onClick={() => setConfirmAction(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ContextCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">{label}</p>
      <p className="mt-2 text-xl font-bold text-gray-950">{value}</p>
    </div>
  );
}

function adminPanelClass(activeTab: AdminTab, tab: AdminTab) {
  return activeTab === tab ? "rounded-lg border border-gray-200 bg-white p-5 shadow-sm" : "hidden";
}

function isHexColour(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

function frameworkThemeKey(name: string, shortName?: string | null) {
  const label = `${name} ${shortName ?? ""}`.toLowerCase();
  if (label.includes("literacy")) return "Literacy";
  if (label.includes("numeracy")) return "Numeracy";
  if (label.includes("digital") || label.includes("dcf")) return "DCF";
  if (label.includes("cross") || label.includes("theme")) return "Cross-cutting themes";
  return null;
}

function WizardStep({ step }: { step: number }) {
  const content = [
    ["School details", "Enter the school name, slug and motto before creating the school record."],
    ["Branding", "Choose the logo and colours that will appear in the sidebar, dashboard headers and reports."],
    ["Subject list", "Add the subjects used by the school. AoLE remains optional metadata."],
    ["Framework setup", "Choose the curriculum frameworks, strands and elements available for mapping."],
    ["Admin user", "Record who will manage school setup when database accounts are added."],
    ["Sample records", "Choose whether to add sample curriculum mappings or start with an empty school map."]
  ][step - 1];
  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900">{content[0]}</h3>
      <p className="mt-2 text-sm leading-6 text-gray-700">{content[1]}</p>
      <p className="mt-4 rounded-md border border-[#e8cfe0] bg-white p-3 text-sm font-semibold text-[#571435]">These choices are kept with the current school setup.</p>
    </div>
  );
}

function LabelledInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="mb-1 block text-sm font-semibold text-gray-700">{label}</span>
      <input className="focus-ring w-full rounded-md border border-gray-300 px-3 py-2" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function ColourInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="mb-1 block text-sm font-semibold text-gray-700">{label}</span>
      <div className="flex gap-2">
        <input className="h-10 w-12 rounded-md border border-gray-300 bg-white" type="color" value={normaliseColour(value)} onChange={(event) => onChange(event.target.value)} />
        <input className="focus-ring min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2" value={value} onChange={(event) => onChange(event.target.value)} />
      </div>
    </label>
  );
}

function PracticeButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="focus-ring btn btn-secondary" type="button" onClick={onClick}>
      {label}
    </button>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`ml-3 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${active ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-800"}`}>
      {active ? "Active" : "Archived / deprecated"}
    </span>
  );
}

function normaliseColour(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#741B47";
}

function progressionStepNumber(step: ProgressionStep) {
  return Number(step.replace("Step ", ""));
}

function newElement(): AdminElement {
  return {
    name: "New element",
    officialWording: "New element: represented in planning through purposeful classroom activity.",
    explanation: "Add a teacher-friendly explanation.",
    examples: ["Example classroom opportunity"],
    progressionDescriptors: {
      "Step 1": "Add Step 1 descriptor.",
      "Step 2": "Add Step 2 descriptor.",
      "Step 3": "Add Step 3 descriptor.",
      "Step 4": "Add Step 4 descriptor.",
      "Step 5": "Add Step 5 descriptor."
    },
    searchKeywords: ["new element"],
    relatedConnections: ["Curriculum connections"],
    active: true
  };
}

function loadAdminFrameworks(frameworkLibrary: Parameters<typeof normaliseFrameworks>[0], schoolId: string): AdminFramework[] {
  if (typeof window !== "undefined") window.localStorage.removeItem(`skills-tracker-admin-frameworks-${schoolId}`);
  return normaliseFrameworks(frameworkLibrary);
}

async function loadAdminFrameworksFromSupabase(schoolId: string): Promise<{ ok: true; frameworks: AdminFramework[] } | { ok: false; message: string }> {
  if (!supabase) return { ok: false, message: "Supabase is not configured, so frameworks could not be loaded." };

  const [frameworksResult, strandsResult, elementsResult, descriptorsResult] = await Promise.all([
    supabase
      .from("frameworks")
      .select("id, school_id, name, short_name, display_order, active")
      .eq("school_id", schoolId)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("strands")
      .select("id, school_id, framework_id, name, short_name, description, display_order, active")
      .eq("school_id", schoolId)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("elements")
      .select("id, school_id, strand_id, name, description, official_wording, teacher_friendly_explanation, display_order, active")
      .eq("school_id", schoolId)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("progression_descriptors")
      .select("id, element_id, progression_step, descriptor_text, display_order, active")
      .eq("school_id", schoolId)
      .order("progression_step", { ascending: true })
  ]);

  const error = frameworksResult.error ?? strandsResult.error ?? elementsResult.error ?? descriptorsResult.error;
  if (error) return { ok: false, message: error.message };

  type FrameworkRow = { id: string; school_id?: string; name: string; short_name?: string | null; display_order?: number | null; active?: boolean | null };
  type StrandRow = { id: string; school_id?: string; framework_id: string; name: string; short_name?: string | null; description?: string | null; display_order?: number | null; active?: boolean | null };
  type ElementRow = {
    id: string;
    school_id?: string;
    strand_id: string;
    name: string;
    description?: string | null;
    official_wording?: string | null;
    teacher_friendly_explanation?: string | null;
    display_order?: number | null;
    active?: boolean | null;
  };
  type DescriptorRow = { id: string; element_id: string; progression_step: number; descriptor_text?: string | null; active?: boolean | null };

  const frameworks = (frameworksResult.data ?? []) as FrameworkRow[];
  const strands = (strandsResult.data ?? []) as StrandRow[];
  const elements = (elementsResult.data ?? []) as ElementRow[];
  const descriptors = (descriptorsResult.data ?? []) as DescriptorRow[];
  const descriptorsByElementId = new Map<string, DescriptorRow[]>();
  descriptors.forEach((descriptor) => descriptorsByElementId.set(descriptor.element_id, [...(descriptorsByElementId.get(descriptor.element_id) ?? []), descriptor]));

  return {
    ok: true,
    frameworks: frameworks.map((framework, frameworkIndex) => ({
      id: framework.id,
      schoolId: framework.school_id,
      name: framework.name,
      shortName: framework.short_name ?? framework.name,
      active: framework.active ?? true,
      displayOrder: framework.display_order ?? frameworkIndex + 1,
      strands: strands
        .filter((strand) => strand.framework_id === framework.id)
        .map((strand, strandIndex) => ({
          id: strand.id,
          schoolId: strand.school_id,
          frameworkId: framework.id,
          name: strand.name,
          shortName: strand.short_name,
          description: strand.description,
          active: strand.active ?? true,
          displayOrder: strand.display_order ?? strandIndex + 1,
          elements: elements
            .filter((element) => element.strand_id === strand.id)
            .map((element, elementIndex) => {
              const elementDescriptors = descriptorsByElementId.get(element.id) ?? [];
              const progressionDescriptors = Object.fromEntries(
                progressionSteps.map((step) => {
                  const stepNumber = progressionStepNumber(step);
                  const descriptor = elementDescriptors.find((item) => item.progression_step === stepNumber);
                  return [step, descriptor?.descriptor_text ?? ""];
                })
              ) as Record<ProgressionStep, string>;
              return {
                id: element.id,
                schoolId: element.school_id,
                name: element.name,
                officialWording: element.official_wording ?? element.description ?? element.teacher_friendly_explanation ?? element.name,
                explanation: element.teacher_friendly_explanation ?? element.description ?? "",
                examples: [],
                progressionDescriptors,
                progressionDescriptorRefs: elementDescriptors.map((descriptor) => {
                  const stepNumber = descriptor.progression_step;
                  return {
                    id: descriptor.id,
                    progressionStep: `Step ${stepNumber}` as ProgressionStep,
                    progressionStepNumber: stepNumber,
                    descriptorText: descriptor.descriptor_text ?? ""
                  };
                }),
                searchKeywords: [],
                relatedConnections: [],
                active: element.active ?? true,
                displayOrder: element.display_order ?? elementIndex + 1
              };
            })
        }))
    }))
  };
}

function normaliseFrameworks(frameworkLibrary: FrameworkDefinition[]): AdminFramework[] {
  return frameworkLibrary.map((framework, frameworkIndex) => ({
    ...framework,
    displayOrder: (framework as FrameworkDefinition & { displayOrder?: number }).displayOrder ?? frameworkIndex + 1,
    active: (framework as FrameworkDefinition & { active?: boolean }).active ?? true,
    strands: framework.strands.map((strand, strandIndex) => ({
      ...strand,
      displayOrder: (strand as typeof strand & { displayOrder?: number }).displayOrder ?? strandIndex + 1,
      active: (strand as typeof strand & { active?: boolean }).active ?? true,
      elements: strand.elements.map((element, elementIndex) => ({
        ...element,
        displayOrder: (element as typeof element & { displayOrder?: number }).displayOrder ?? elementIndex + 1,
        progressionDescriptors: element.progressionDescriptors ?? newElement().progressionDescriptors,
        active: (element as typeof element & { active?: boolean }).active ?? true
      }))
    }))
  }));
}
