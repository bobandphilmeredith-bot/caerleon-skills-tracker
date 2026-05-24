"use client";

import { useEffect, useMemo, useState } from "react";
import { AccessDenied } from "@/components/AccessDenied";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/lib/auth";
import { useCurrentSchool } from "@/lib/currentSchool";
import { areaThemes } from "@/lib/theme";
import type { CrossCuttingTheme, MappingEntry } from "@/lib/types";

const caerleonSchoolId = "657f5a77-ae52-48ea-b459-290f86bbd2f0";

export default function AddCctPage() {
  const { canEditMappings, currentUser } = useAuth();
  const { currentSchoolId, data, addMapping } = useCurrentSchool();
  const { subjectConfigs, terms, yearGroups } = data;
  const activeSubjects = useMemo(
    () => subjectConfigs.filter((subject) => subject.active && subject.appearsInMappingDropdowns).sort((a, b) => a.name.localeCompare(b.name)),
    [subjectConfigs]
  );

  const [subjectId, setSubjectId] = useState("");
  const [yearGroup, setYearGroup] = useState("Year 7");
  const [term, setTerm] = useState(terms[0] ?? "Autumn");
  const [activityTitle, setActivityTitle] = useState("");
  const [schemeReference, setSchemeReference] = useState("");
  const [activityDescription, setActivityDescription] = useState("");
  const [selectedThemeIds, setSelectedThemeIds] = useState<string[]>([]);
  const [themeNotes, setThemeNotes] = useState("");
  const [themeRows, setThemeRows] = useState<CrossCuttingTheme[]>([]);
  const [showValidation, setShowValidation] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const themeOptions = useMemo(() => themeRows.filter((themeItem) => themeItem.active && looksLikeUuid(themeItem.id)), [themeRows]);
  const selectedThemes = useMemo(() => themeOptions.filter((themeItem) => selectedThemeIds.includes(themeItem.id)), [themeOptions, selectedThemeIds]);
  const selectedSubject = activeSubjects.find((subject) => subject.id === subjectId);
  const hasSubjectRestrictedRole = currentUser?.role === "teacher" || currentUser?.role === "subject_lead";
  const hasEditableSubjects = !hasSubjectRestrictedRole || currentUser.assignedSubjects.length > 0;
  const canEditSelectedSubject =
    !selectedSubject ||
    currentUser?.role === "platform_admin" ||
    currentUser?.role === "school_admin" ||
    hasAssignedSubject(currentUser?.assignedSubjects ?? [], selectedSubject.name);

  useEffect(() => {
    const optionIds = new Set(themeOptions.map((themeItem) => themeItem.id));
    setSelectedThemeIds((current) => current.filter((id) => optionIds.has(id)));
  }, [themeOptions]);

  useEffect(() => {
    const schoolIdForThemes = looksLikeUuid(currentSchoolId) ? currentSchoolId : caerleonSchoolId;
    let cancelled = false;
    void fetch(`/api/themes?schoolId=${encodeURIComponent(schoolIdForThemes)}`)
      .then((response) => (response.ok ? response.json() : { themes: [] }))
      .then(({ themes }: { themes?: Array<{ id: string; school_id: string; name: string; description: string | null; active: boolean | null }> }) => {
        if (cancelled) return;
        setThemeRows(
          (themes ?? []).map((row, index) => ({
            id: row.id,
            schoolId: row.school_id,
            name: row.name,
            description: row.description,
            active: row.active ?? true,
            displayOrder: index + 1
          }))
        );
      })
      .catch(() => {
        if (!cancelled) setThemeRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [currentSchoolId]);

  if (!canEditMappings) {
    return <AccessDenied title="Map CCT restricted" message="Your current role is read-only. Switch to a teacher, subject lead or school admin account to map cross-cutting themes." />;
  }

  const trimmedActivityTitle = activityTitle.trim();
  const trimmedActivityDescription = activityDescription.trim();
  const trimmedSchemeReference = schemeReference.trim();
  const formError =
    hasSubjectRestrictedRole && !hasEditableSubjects
      ? "No editable subjects are assigned to your account. Contact a school administrator."
      : activeSubjects.length === 0
        ? "No subjects found for this school. Add subjects in Admin first."
        : !selectedSubject
          ? "Select a subject."
          : !canEditSelectedSubject
            ? "You can view this subject, but you do not have permission to edit it."
            : !yearGroup
              ? "Select a year group."
              : !term
                ? "Select a term."
                : !trimmedActivityTitle
                  ? "Activity title cannot be blank."
                  : !trimmedSchemeReference
                    ? "Scheme of learning reference cannot be blank."
                    : !trimmedActivityDescription
                      ? "Brief description cannot be blank."
                      : selectedThemes.length === 0
                        ? "Select at least one cross-cutting theme."
                        : "";

  function buildMappingEntry(): MappingEntry {
    return {
      schoolId: currentSchoolId,
      subjectId: selectedSubject?.id,
      frameworkReferences: [],
      id: `cct-${currentSchoolId}-${Date.now()}`,
      subject: selectedSubject?.name ?? "",
      framework: "Cross-cutting themes",
      strand: "No strand reference",
      element: "No element reference",
      context: trimmedActivityTitle,
      year: yearGroup,
      term,
      unit: trimmedActivityTitle,
      activityDescription: trimmedActivityDescription,
      taskDescription: "",
      schemeReference: trimmedSchemeReference,
      progressionReference: "Not specified",
      crossCuttingThemeIds: selectedThemes.map((themeItem) => themeItem.id),
      crossCuttingThemes: selectedThemes.map((themeItem) => themeItem.name),
      crossCuttingThemeNotes: themeNotes.trim(),
      note: "",
      lastMappedDate: new Date().toISOString().slice(0, 10)
    };
  }

  async function handleSave() {
    setShowValidation(true);
    if (formError) {
      setSaveMessage("");
      return;
    }
    if (!validateThemeIdsBeforeSave()) return;
    setIsSaving(true);
    const result = await addMapping(buildMappingEntry());
    setIsSaving(false);
    setSaveMessage(result.ok ? "CCT mapping saved." : `Could not save mapping: ${result.message ?? "Unknown Supabase error"}`);
  }

  async function saveAndAddNew() {
    setShowValidation(true);
    if (formError) {
      setSaveMessage("");
      return;
    }
    if (!validateThemeIdsBeforeSave()) return;
    setIsSaving(true);
    const result = await addMapping(buildMappingEntry());
    setIsSaving(false);
    if (result.ok) resetForm("CCT mapping saved. Ready for a new entry.");
    else setSaveMessage(`Could not save mapping: ${result.message ?? "Unknown Supabase error"}`);
  }

  function resetForm(message = "Form cleared.") {
    setSubjectId("");
    setYearGroup("Year 7");
    setTerm(terms[0] ?? "Autumn");
    setActivityTitle("");
    setSchemeReference("");
    setActivityDescription("");
    setSelectedThemeIds([]);
    setThemeNotes("");
    setShowValidation(false);
    setSaveMessage(message);
  }

  function validateThemeIdsBeforeSave() {
    if (selectedThemes.some((themeItem) => !looksLikeUuid(themeItem.id))) {
      setSaveMessage("Theme data is still using prototype IDs. Reload cross-cutting themes from Supabase.");
      return false;
    }
    return true;
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Add Cross-Cutting Theme Mapping"
        eyebrow="Planning visibility"
        description="Record an activity, project or curriculum opportunity that evidences one or more cross-cutting themes."
        accent={areaThemes.overview.accent}
      />

      <form className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm" onSubmit={(event) => event.preventDefault()}>
        <div className="mb-5 grid gap-3 md:grid-cols-4">
          <StepPill number="1" title="Subject" />
          <StepPill number="2" title="Activity" />
          <StepPill number="3" title="Themes" />
          <StepPill number="4" title="Save" />
        </div>

        <div className="space-y-5">
          {hasSubjectRestrictedRole && !hasEditableSubjects ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
              No editable subjects are assigned to your account. Contact a school administrator.
            </div>
          ) : null}
          {activeSubjects.length === 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
              No subjects found for this school. Add subjects in Admin first.
            </div>
          ) : null}

          <FormSection number="1" title="Subject, year group and term" description="Place this cross-cutting theme evidence in the curriculum.">
            <div className="grid gap-4 lg:grid-cols-3">
              <Field label="Subject">
                <select className="focus-ring w-full rounded-md border border-gray-300 bg-white px-3 py-2" value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
                  <option value="">Select a subject</option>
                  {activeSubjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
                {selectedSubject?.aole ? <p className="mt-2 text-sm font-semibold" style={{ color: areaThemes.overview.text }}>AoLE: {selectedSubject.aole}</p> : null}
                {selectedSubject && !canEditSelectedSubject ? (
                  <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">
                    You can view this subject, but you do not have permission to edit it.
                  </div>
                ) : null}
              </Field>
              <Field label="Year group">
                <SegmentedButtons options={yearGroups} value={yearGroup} onChange={setYearGroup} />
              </Field>
              <Field label="Term">
                <SegmentedButtons options={terms.length ? terms : ["Autumn", "Spring", "Summer"]} value={term} onChange={setTerm} />
              </Field>
            </div>
          </FormSection>

          <FormSection number="2" title="Activity details" description="Describe the activity, project or curriculum opportunity.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Scheme/reference/unit title">
                <input className="focus-ring w-full rounded-md border border-gray-300 px-3 py-2" value={schemeReference} onChange={(event) => setSchemeReference(event.target.value)} />
              </Field>
              <Field label="Activity title">
                <input className="focus-ring w-full rounded-md border border-gray-300 px-3 py-2" value={activityTitle} onChange={(event) => setActivityTitle(event.target.value)} />
              </Field>
              <Field label="Brief description of the activity/project" wide>
                <textarea
                  className="focus-ring min-h-20 w-full rounded-md border border-gray-300 px-3 py-2"
                  value={activityDescription}
                  onChange={(event) => setActivityDescription(event.target.value)}
                  placeholder="A source investigation exploring identity, rights and local context."
                />
              </Field>
            </div>
          </FormSection>

          <FormSection number="3" title="Cross-cutting themes" description="Select every theme represented in this activity.">
            {themeOptions.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {themeOptions.map((themeItem) => {
                  const selected = selectedThemeIds.includes(themeItem.id);
                  return (
                    <label
                      key={themeItem.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm font-semibold transition ${selected ? "" : "border-gray-200 bg-white text-gray-800"}`}
                      style={selected ? { borderColor: areaThemes.overview.accent, backgroundColor: areaThemes.overview.soft, color: areaThemes.overview.text } : undefined}
                    >
                      <input
                        className="mt-1 h-4 w-4"
                        type="checkbox"
                        checked={selected}
                        onChange={(event) => setSelectedThemeIds((current) => (event.target.checked ? Array.from(new Set([...current, themeItem.id])) : current.filter((id) => id !== themeItem.id)))}
                      />
                      <span>
                        {themeItem.name}
                        {themeItem.description ? <span className="mt-1 block text-xs font-normal leading-5 text-gray-500">{themeItem.description}</span> : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">No active cross-cutting themes found for this school.</p>
            )}
            <Field label="How does this activity link to the selected theme(s)?" wide>
              <textarea className="focus-ring min-h-16 w-full rounded-md border border-gray-300 px-3 py-2" value={themeNotes} onChange={(event) => setThemeNotes(event.target.value)} />
            </Field>
          </FormSection>
        </div>

        <div className="sticky bottom-0 -mx-5 mt-5 flex flex-wrap gap-3 border-t border-gray-200 bg-white/95 px-5 py-4 backdrop-blur">
          <button className="focus-ring btn btn-primary" type="button" onClick={handleSave} disabled={isSaving || !hasEditableSubjects || !canEditSelectedSubject}>
            {isSaving ? "Saving..." : "Save mapping"}
          </button>
          <button className="focus-ring btn btn-secondary" type="button" onClick={saveAndAddNew} disabled={isSaving || !hasEditableSubjects || !canEditSelectedSubject}>
            Save and add new
          </button>
          <button className="focus-ring btn btn-muted" type="button" onClick={() => resetForm()}>
            Clear form
          </button>
        </div>
        {saveMessage ? <div className="mt-4 rounded-md border px-4 py-3 text-sm font-bold" style={{ borderColor: areaThemes.overview.border, backgroundColor: areaThemes.overview.soft, color: areaThemes.overview.text }}>{saveMessage}</div> : null}
        {showValidation && formError ? <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{formError}</div> : null}
      </form>
    </section>
  );
}

function StepPill({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
      <span className="grid h-7 w-7 place-items-center rounded-md text-xs font-bold text-white" style={{ backgroundColor: areaThemes.overview.accent }}>
        {number}
      </span>
      <span className="text-sm font-bold text-gray-800">{title}</span>
    </div>
  );
}

function FormSection({ number, title, description, children }: { number: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-gray-200 p-4">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-sm font-bold" style={{ backgroundColor: areaThemes.overview.soft, color: areaThemes.overview.text }}>
          {number}
        </span>
        <div>
          <h2 className="font-bold text-gray-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function SegmentedButtons({ options, value, onChange }: { options: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(options.length, 5)}, minmax(0, 1fr))` }}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <button
            key={option}
            className={`focus-ring rounded-md border px-3 py-2 text-sm font-bold transition ${selected ? "text-white" : "border-gray-300 bg-white text-gray-700"}`}
            style={selected ? { borderColor: areaThemes.overview.accent, backgroundColor: areaThemes.overview.accent } : undefined}
            type="button"
            onClick={() => onChange(option)}
          >
            {option.replace("Year ", "Y")}
          </button>
        );
      })}
    </div>
  );
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={wide ? "sm:col-span-2" : ""}>
      <span className="mb-1 block text-sm font-semibold text-gray-700">{label}</span>
      {children}
    </label>
  );
}

function normaliseSubjectName(subject: string) {
  return subject.trim().toLowerCase();
}

function hasAssignedSubject(assignedSubjects: string[], subject: string) {
  const selected = normaliseSubjectName(subject);
  return assignedSubjects.some((assignedSubject) => normaliseSubjectName(assignedSubject) === selected);
}

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
