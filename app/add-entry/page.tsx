"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AccessDenied } from "@/components/AccessDenied";
import { CctElementSelector } from "@/components/CctElementSelector";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/lib/auth";
import { useCurrentSchool } from "@/lib/currentSchool";
import { useLiveSubjects } from "@/lib/useLiveSubjects";
import type { CrossCuttingTheme, ElementDefinition, FrameworkDefinition, MappingEntry, MappingFrameworkReference, ProgressionDescriptorDefinition, SelectedCctElement, StrandDefinition } from "@/lib/types";
import { areaThemes, themeForFramework } from "@/lib/theme";

export default function AddEntryPage() {
  const { canEditMappings, currentUser } = useAuth();
  const { currentSchoolId, data, addMapping } = useCurrentSchool();
  const { frameworkLibrary, terms, yearGroups, crossCuttingThemes } = data;
  const { subjects: databaseSubjects } = useLiveSubjects(currentSchoolId);
  const progressionFrameworkLibrary = useMemo(
    () => frameworkLibrary.filter((item) => ["Literacy", "Numeracy", "DCF"].includes(item.shortName)),
    [frameworkLibrary]
  );
  const activeSubjects = useMemo(() => databaseSubjects.filter((subject) => subject.active && subject.appearsInMappingDropdowns), [databaseSubjects]);

  const [subjectId, setSubjectId] = useState("");
  const [frameworkId, setFrameworkId] = useState("");
  const [strandId, setStrandId] = useState("");
  const [elementId, setElementId] = useState("");
  const [progressionDescriptorId, setProgressionDescriptorId] = useState("");
  const [yearGroup, setYearGroup] = useState("Year 7");
  const [term, setTerm] = useState(terms[0] ?? "Autumn");
  const [activityTitle, setActivityTitle] = useState("");
  const [schemeReference, setSchemeReference] = useState("");
  const [activityDescription, setActivityDescription] = useState("");
  const [frameworkNotes, setFrameworkNotes] = useState("");
  const [frameworkReferences, setFrameworkReferences] = useState<MappingFrameworkReference[]>([]);
  const [selectedCctElements, setSelectedCctElements] = useState<SelectedCctElement[]>([]);
  const [themeNotes, setThemeNotes] = useState("");
  const [themeRows, setThemeRows] = useState<CrossCuttingTheme[]>([]);
  const [showDescriptor, setShowDescriptor] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [currentEntrySaved, setCurrentEntrySaved] = useState(false);
  const saveInFlightRef = useRef(false);

  const themeOptions = useMemo(
    () => (themeRows.length ? themeRows : crossCuttingThemes).filter((themeItem) => themeItem.active && looksLikeUuid(themeItem.id)),
    [crossCuttingThemes, themeRows]
  );
  const selectedThemeIds = useMemo(() => Array.from(new Set(selectedCctElements.map((item) => item.themeId))), [selectedCctElements]);
  const selectedThemes = useMemo(() => themeOptions.filter((themeItem) => selectedThemeIds.includes(themeItem.id)), [themeOptions, selectedThemeIds]);
  const selectedSubject = activeSubjects.find((subject) => subject.id === subjectId);
  const selectedFramework = progressionFrameworkLibrary.find((item) => item.id === frameworkId) ?? progressionFrameworkLibrary[0];
  const strands = selectedFramework?.strands ?? [];
  const selectedStrand = strands.find((item) => item.id === strandId) ?? strands[0];
  const elements = selectedStrand?.elements ?? [];
  const selectedElement = elements.find((item) => item.id === elementId) ?? elements[0];
  const availableDescriptors = useMemo(
    () =>
      (selectedElement?.progressionDescriptorRefs ?? [])
        .filter((descriptor) => descriptor.descriptorText.trim())
        .filter((descriptor) => selectedFramework?.shortName !== "DCF" || descriptor.progressionStepNumber >= 3)
        .sort((a, b) => a.progressionStepNumber - b.progressionStepNumber),
    [selectedElement, selectedFramework]
  );
  const preferredDescriptor = useMemo(() => getPreferredDescriptor(availableDescriptors, yearGroup), [availableDescriptors, yearGroup]);
  const selectedDescriptor = availableDescriptors.find((descriptor) => descriptor.id === progressionDescriptorId) ?? preferredDescriptor;
  const theme = themeForFramework(selectedFramework?.name ?? "Literacy Framework");
  const hasSubjectRestrictedRole = currentUser?.role === "teacher" || currentUser?.role === "subject_lead";
  const hasEditableSubjects = !hasSubjectRestrictedRole || currentUser.assignedSubjects.length > 0;
  const canEditSelectedSubject =
    !selectedSubject ||
    currentUser?.role === "platform_admin" ||
    currentUser?.role === "school_admin" ||
    hasAssignedSubject(currentUser?.assignedSubjects ?? [], selectedSubject.name);
  useEffect(() => {
    if (!selectedFramework?.id) {
      setFrameworkId("");
      return;
    }
    if (selectedFramework.id !== frameworkId) setFrameworkId(selectedFramework.id);
  }, [frameworkId, selectedFramework?.id]);

  useEffect(() => {
    if (!selectedStrand?.id) {
      setStrandId("");
      setElementId("");
      setProgressionDescriptorId("");
      return;
    }
    if (selectedStrand.id !== strandId) {
      setStrandId(selectedStrand.id);
      setElementId("");
      setProgressionDescriptorId("");
    }
  }, [selectedStrand?.id, strandId]);

  useEffect(() => {
    if (!selectedElement?.id) {
      setElementId("");
      setProgressionDescriptorId("");
      return;
    }
    if (selectedElement.id !== elementId) {
      setElementId(selectedElement.id);
      setProgressionDescriptorId("");
    }
  }, [elementId, selectedElement?.id]);

  useEffect(() => {
    const nextDescriptor = getPreferredDescriptor(availableDescriptors, yearGroup);
    setProgressionDescriptorId(nextDescriptor?.id ?? "");
    setShowDescriptor(false);
  }, [availableDescriptors, selectedElement?.id, yearGroup]);

  useEffect(() => {
    const validSelections = new Set(themeOptions.flatMap((themeItem) => (themeItem.elements ?? []).map((element) => `${themeItem.id}:${element.id}`)));
    if (!validSelections.size) return;
    setSelectedCctElements((current) => current.filter((item) => validSelections.has(`${item.themeId}:${item.elementId}`)));
  }, [themeOptions]);

  useEffect(() => {
    const schoolIdForThemes = looksLikeUuid(currentSchoolId) ? currentSchoolId : "";
    let cancelled = false;
    if (!schoolIdForThemes) {
      setThemeRows([]);
      return;
    }
    void fetch(`/api/themes?schoolId=${encodeURIComponent(schoolIdForThemes)}`)
      .then((response) => (response.ok ? response.json() : { themes: [] }))
      .then(({ themes }: { themes?: Array<{ id: string; school_id: string; name: string; description: string | null; active: boolean | null; elements?: Array<{ id: string; school_id: string; theme_id: string; name: string; description: string | null; display_order: number | null; active: boolean | null }> }> }) => {
        if (cancelled) return;
        setThemeRows(
          (themes ?? []).map((row, index) => ({
            id: row.id,
            schoolId: row.school_id,
            name: row.name,
            description: row.description,
            active: row.active ?? true,
            displayOrder: index + 1,
            elements: (row.elements ?? []).map((element) => ({
              id: element.id,
              schoolId: element.school_id,
              themeId: element.theme_id,
              name: element.name,
              description: element.description,
              displayOrder: element.display_order ?? 0,
              active: element.active ?? true
            }))
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
    return <AccessDenied title="Add mapping restricted" message="Your current role is read-only. Switch to a teacher, subject lead or school admin account to add curriculum mapping entries." />;
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
            : !trimmedActivityTitle
              ? "Piece of work / activity title cannot be blank."
              : !trimmedSchemeReference
                ? "Scheme of learning reference cannot be blank."
                : !trimmedActivityDescription
                  ? "Description of the activity cannot be blank."
                  : "";

  function updateFramework(nextFrameworkId: string) {
    setFrameworkId(nextFrameworkId);
    setStrandId("");
    setElementId("");
    setProgressionDescriptorId("");
    setShowDescriptor(false);
  }

  function updateStrand(nextStrandId: string) {
    setStrandId(nextStrandId);
    setElementId("");
    setProgressionDescriptorId("");
    setShowDescriptor(false);
  }

  function updateElement(nextElementId: string) {
    setElementId(nextElementId);
    setProgressionDescriptorId("");
    setShowDescriptor(false);
  }

  function buildMappingEntry(): MappingEntry {
    return {
      schoolId: currentSchoolId,
      subjectId: selectedSubject?.id,
      frameworkId: frameworkReferences[0]?.frameworkId,
      strandId: frameworkReferences[0]?.strandId,
      elementId: frameworkReferences[0]?.elementId,
      progressionDescriptorId: frameworkReferences[0]?.progressionDescriptorId ?? undefined,
      frameworkReferences,
      id: `map-${currentSchoolId}-${Date.now()}`,
      subject: selectedSubject?.name ?? "",
      framework: frameworkReferences[0]?.framework ?? "No framework reference",
      strand: frameworkReferences[0]?.strand ?? "No strand reference",
      element: frameworkReferences[0]?.element ?? "No element reference",
      context: trimmedActivityTitle,
      year: yearGroup,
      term,
      unit: trimmedActivityTitle,
      activityDescription: trimmedActivityDescription,
      taskDescription: "",
      schemeReference: trimmedSchemeReference,
      progressionReference: frameworkReferences[0]?.progressionReference ?? "Not specified",
      crossCuttingThemeIds: selectedThemes.map((themeItem) => themeItem.id),
      crossCuttingThemeElementIds: selectedCctElements.map((item) => item.elementId),
      crossCuttingThemeElementLinks: selectedCctElements,
      crossCuttingThemes: selectedThemes.map((themeItem) => themeItem.name),
      crossCuttingThemeNotes: themeNotes.trim(),
      note: "",
      lastMappedDate: new Date().toISOString().slice(0, 10)
    };
  }

  function addFrameworkReference() {
    if (!selectedFramework?.id || !selectedStrand?.id || !selectedElement?.id || !selectedDescriptor?.id) return;
    const reference: MappingFrameworkReference = {
      id: `${selectedFramework.id}-${selectedStrand.id}-${selectedElement.id}-${selectedDescriptor.id}`,
      frameworkId: selectedFramework.id,
      frameworkShortName: selectedFramework.shortName,
      strandId: selectedStrand.id,
      strandShortName: selectedStrand.shortName ?? selectedStrand.name,
      elementId: selectedElement.id,
      progressionDescriptorId: selectedDescriptor.id,
      progressionStep: selectedDescriptor.progressionStepNumber,
      framework: selectedFramework.name,
      strand: selectedStrand.name,
      element: selectedElement.name,
      progressionReference: selectedDescriptor.progressionStep,
      descriptor: selectedDescriptor.descriptorText,
      notes: frameworkNotes.trim()
    };
    setFrameworkReferences((current) => {
      const exists = current.some((item) => item.progressionDescriptorId === reference.progressionDescriptorId);
      return exists ? current : [...current, reference];
    });
    setFrameworkNotes("");
    setSaveMessage("");
  }

  async function handleSave() {
    if (saveInFlightRef.current || currentEntrySaved) return;
    setShowValidation(true);
    if (formError) {
      setSaveMessage("");
      return;
    }
    if (!validateThemeIdsBeforeSave()) {
      return;
    }
    saveInFlightRef.current = true;
    setIsSaving(true);
    const result = await addMapping(buildMappingEntry());
    setIsSaving(false);
    saveInFlightRef.current = false;
    if (result.ok) {
      resetForm("Mapping saved. Ready for a new entry.");
    } else {
      setSaveMessage(`Could not save mapping: ${result.message ?? "Unknown Supabase error"}`);
    }
  }

  function resetForm(message = "Form cleared.") {
    setSubjectId("");
    setYearGroup("Year 7");
    setTerm(terms[0] ?? "Autumn");
    setActivityTitle("");
    setSchemeReference("");
    setActivityDescription("");
    setFrameworkNotes("");
    setFrameworkReferences([]);
    setSelectedCctElements([]);
    setThemeNotes("");
    setShowDescriptor(false);
    setShowValidation(false);
    setCurrentEntrySaved(false);
    saveInFlightRef.current = false;
    setSaveMessage(message);
  }

  async function saveAndAddNew() {
    if (saveInFlightRef.current || currentEntrySaved) return;
    setShowValidation(true);
    if (formError) {
      setSaveMessage("");
      return;
    }
    if (!validateThemeIdsBeforeSave()) {
      return;
    }
    saveInFlightRef.current = true;
    setIsSaving(true);
    const result = await addMapping(buildMappingEntry());
    setIsSaving(false);
    saveInFlightRef.current = false;
    if (result.ok) resetForm("Mapping saved. Ready for a new entry.");
    else setSaveMessage(`Could not save mapping: ${result.message ?? "Unknown Supabase error"}`);
  }

  const canAddReference = Boolean(selectedFramework?.id && selectedStrand?.id && selectedElement?.id && selectedDescriptor?.id);

  function validateThemeIdsBeforeSave() {
    if (!validateCctElements(selectedCctElements, themeOptions)) {
      setSaveMessage("Cross-cutting theme data is not using database IDs. Reload cross-cutting themes from Supabase.");
      return false;
    }
    return true;
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Map Curriculum Skills and Themes"
        eyebrow="Curriculum Mapping"
        description="Record where pupils develop skills and engage with wider curriculum themes across the curriculum."
        accent={areaThemes.overview.accent}
      />

      <form className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm" onSubmit={(event) => event.preventDefault()}>
        <div className="mb-5 grid gap-3 md:grid-cols-5">
          <StepPill number="1" title="Subject" />
          <StepPill number="2" title="Work" />
          <StepPill number="3" title="Frameworks" />
          <StepPill number="4" title="Themes" />
          <StepPill number="5" title="Save" />
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

          <FormSection number="1" title="Choose subject, year group and term" description="Start with where this piece of work sits in the curriculum.">
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
                {selectedSubject?.aole ? <p className="mt-2 text-sm font-semibold text-[#571435]">AoLE: {selectedSubject.aole}</p> : null}
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

          <FormSection number="2" title="Describe the piece of work" description="What work are pupils doing?">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Scheme of learning reference">
                <input className="focus-ring w-full rounded-md border border-gray-300 px-3 py-2" value={schemeReference} onChange={(event) => setSchemeReference(event.target.value)} />
              </Field>
              <Field label="Piece of work / activity title">
                <input className="focus-ring w-full rounded-md border border-gray-300 px-3 py-2" value={activityTitle} onChange={(event) => setActivityTitle(event.target.value)} />
              </Field>
              <Field label="Description of the activity" wide>
                <textarea
                  className="focus-ring min-h-20 w-full rounded-md border border-gray-300 px-3 py-2"
                  value={activityDescription}
                  onChange={(event) => setActivityDescription(event.target.value)}
                  placeholder="A source investigation exploring migration, identity and post-war Britain."
                />
              </Field>
            </div>
          </FormSection>

          <FormSection number="3" title="Add framework references" description="Choose Literacy, Numeracy or DCF references this activity genuinely develops.">
            {progressionFrameworkLibrary.length ? (
              <div className="space-y-4">
                <PickerGroup label="Framework">
                  {progressionFrameworkLibrary.map((item) => (
                    <PickerButton key={item.id} selected={item.id === selectedFramework?.id} onClick={() => updateFramework(item.id ?? "")} themeName={item.name}>
                      {item.shortName}
                    </PickerButton>
                  ))}
                </PickerGroup>

                <PickerGroup label="Strand">
                  {strands.map((item) => (
                    <PickerButton key={item.id} selected={item.id === selectedStrand?.id} onClick={() => updateStrand(item.id ?? "")} themeName={selectedFramework?.name} title={item.name}>
                      {strandButtonLabel(item)}
                    </PickerButton>
                  ))}
                </PickerGroup>

                <PickerGroup label="Element">
                  {elements.map((item) => (
                    <PickerButton key={item.id} selected={item.id === selectedElement?.id} onClick={() => updateElement(item.id ?? "")} themeName={selectedFramework?.name}>
                      {item.name}
                    </PickerButton>
                  ))}
                </PickerGroup>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-bold text-gray-800">Progression step</span>
                    {selectedFramework?.shortName === "DCF" ? <span className="text-xs font-semibold text-gray-500">DCF shows steps 3 to 5 only.</span> : null}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {availableDescriptors.length ? (
                      availableDescriptors.map((descriptor) => (
                        <button
                          key={descriptor.id}
                          className="focus-ring rounded-md border px-3 py-2 text-sm font-bold"
                          style={
                            descriptor.id === selectedDescriptor?.id
                              ? { borderColor: theme.accent, backgroundColor: theme.soft, color: theme.text }
                              : { borderColor: "#d1d5db", backgroundColor: "#ffffff", color: "#374151" }
                          }
                          type="button"
                          onClick={() => {
                            setProgressionDescriptorId(descriptor.id);
                            setShowDescriptor(false);
                          }}
                        >
                          {descriptor.progressionStep}
                        </button>
                      ))
                    ) : (
                      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">No progression descriptors found for this element.</p>
                    )}
                  </div>
                </div>

                {selectedFramework && selectedStrand && selectedElement && selectedDescriptor ? (
                  <div className="rounded-lg border p-3" style={{ borderColor: theme.border, backgroundColor: theme.soft }}>
                    <ReferenceSummary reference={previewReference(selectedFramework, selectedStrand, selectedElement, selectedDescriptor)} />
                    <DescriptorPreview text={selectedDescriptor.descriptorText} expanded={showDescriptor} onToggle={() => setShowDescriptor((current) => !current)} />
                    <Field label="Optional note explaining the link" wide>
                      <textarea
                        className="focus-ring mt-2 min-h-16 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                        value={frameworkNotes}
                        onChange={(event) => setFrameworkNotes(event.target.value)}
                        placeholder="e.g. Pupils listen to a source extract and identify implied meaning before discussion."
                      />
                    </Field>
                    <button className="focus-ring btn btn-secondary mt-3" type="button" onClick={addFrameworkReference} disabled={!canAddReference}>
                      Add framework reference
                    </button>
                  </div>
                ) : null}

                <div>
                  <h3 className="text-sm font-bold text-gray-900">Selected framework references</h3>
                  {frameworkReferences.length ? (
                    <div className="mt-2 grid gap-2">
                      {frameworkReferences.map((reference) => (
                        <div key={reference.id} className="rounded-md border border-gray-200 bg-white p-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <ReferenceSummary reference={reference} />
                              <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-600">{reference.descriptor}</p>
                              {reference.notes ? <p className="mt-1 text-xs font-semibold leading-5 text-gray-700">Note: {reference.notes}</p> : null}
                            </div>
                            <button className="focus-ring rounded-md border border-gray-300 px-2 py-1 text-xs font-bold text-gray-700" type="button" onClick={() => setFrameworkReferences((current) => current.filter((item) => item.id !== reference.id))}>
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-gray-600">No framework references added yet.</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">No active skills frameworks found for this school.</p>
            )}
          </FormSection>

          <FormSection number="4" title="Cross-cutting themes" description="Optionally select specific wider curriculum theme elements represented in this activity.">
            <CctElementSelector themes={themeOptions} selected={selectedCctElements} onChange={setSelectedCctElements} />
            <Field label="How does this piece of work link to the selected theme(s)?" wide>
              <textarea className="focus-ring min-h-16 w-full rounded-md border border-gray-300 px-3 py-2" value={themeNotes} onChange={(event) => setThemeNotes(event.target.value)} />
            </Field>
          </FormSection>
        </div>

        <div className="sticky bottom-0 -mx-5 mt-5 flex flex-wrap gap-3 border-t border-gray-200 bg-white/95 px-5 py-4 backdrop-blur">
          <button className="focus-ring btn btn-primary" type="button" onClick={handleSave} disabled={isSaving || currentEntrySaved || !hasEditableSubjects || !canEditSelectedSubject}>
            {isSaving ? "Saving..." : currentEntrySaved ? "Mapping saved" : "Save mapping"}
          </button>
          <button className="focus-ring btn btn-secondary" type="button" onClick={saveAndAddNew} disabled={isSaving || currentEntrySaved || !hasEditableSubjects || !canEditSelectedSubject}>
            Save and add new
          </button>
          <button className="focus-ring btn btn-muted" type="button" onClick={() => resetForm()}>
            Clear form
          </button>
        </div>
        {saveMessage ? <div className="mt-4 rounded-md border border-[#e8cfe0] bg-[#f7edf3] px-4 py-3 text-sm font-bold text-[#571435]">{saveMessage}</div> : null}
        {showValidation && formError ? <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{formError}</div> : null}
      </form>
    </section>
  );
}

function StepPill({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
      <span className="grid h-7 w-7 place-items-center rounded-md bg-[#741B47] text-xs font-bold text-white">{number}</span>
      <span className="text-sm font-bold text-gray-800">{title}</span>
    </div>
  );
}

function FormSection({ number, title, description, children }: { number: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-gray-200 p-4">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-[#f7edf3] text-sm font-bold text-[#571435]">{number}</span>
        <div>
          <h2 className="font-bold text-gray-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function PickerGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-2 block text-sm font-semibold text-gray-700">{label}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function PickerButton({ selected, onClick, themeName, title, children }: { selected: boolean; onClick: () => void; themeName?: string; title?: string; children: React.ReactNode }) {
  const theme = themeForFramework(themeName ?? "");
  return (
    <button
      className="focus-ring min-h-10 max-w-64 rounded-md border px-3 py-2 text-sm font-bold leading-snug transition hover:-translate-y-0.5 hover:shadow-sm"
      style={selected ? { borderColor: theme.accent, backgroundColor: theme.soft, color: theme.text } : { borderColor: "#d1d5db", backgroundColor: "#ffffff", color: "#374151" }}
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      title={title}
    >
      {children}
    </button>
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
            className={`focus-ring rounded-md border px-3 py-2 text-sm font-bold transition ${selected ? "border-[#741B47] bg-[#741B47] text-white shadow-sm" : "border-gray-300 bg-white text-gray-700 hover:bg-[#f7edf3]"}`}
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

function ReferenceSummary({ reference }: { reference: Pick<MappingFrameworkReference, "framework" | "frameworkShortName" | "strand" | "strandShortName" | "element" | "progressionReference"> }) {
  return (
    <p className="text-sm font-bold text-gray-950">
      {reference.frameworkShortName ?? reference.framework} <span className="text-gray-400">→</span> {reference.strandShortName ?? reference.strand} <span className="text-gray-400">→</span> {reference.element} <span className="text-gray-400">→</span> {reference.progressionReference}
    </p>
  );
}

function DescriptorPreview({ text, expanded, onToggle }: { text: string; expanded: boolean; onToggle: () => void }) {
  const isLong = text.length > 220;
  return (
    <div className="mt-2">
      <p className={`text-sm leading-6 text-gray-700 ${!expanded && isLong ? "line-clamp-3" : ""}`}>{text}</p>
      {isLong ? (
        <button className="focus-ring mt-1 text-sm font-bold text-[#741B47]" type="button" onClick={onToggle}>
          {expanded ? "Hide descriptor" : "Show full descriptor"}
        </button>
      ) : null}
    </div>
  );
}

function previewReference(framework: FrameworkDefinition, strand: StrandDefinition, element: ElementDefinition, descriptor: ProgressionDescriptorDefinition): MappingFrameworkReference {
  return {
    frameworkId: framework.id ?? "",
    frameworkShortName: framework.shortName,
    strandId: strand.id ?? "",
    strandShortName: strand.shortName ?? strand.name,
    elementId: element.id ?? "",
    progressionDescriptorId: descriptor.id,
    progressionStep: descriptor.progressionStepNumber,
    framework: framework.name,
    strand: strand.name,
    element: element.name,
    progressionReference: descriptor.progressionStep,
    descriptor: descriptor.descriptorText
  };
}

function getPreferredDescriptor(descriptors: ProgressionDescriptorDefinition[], yearGroup: string) {
  const targetStep = yearGroup === "Year 10" || yearGroup === "Year 11" ? 5 : 4;
  return descriptors.find((descriptor) => descriptor.progressionStepNumber === targetStep) ?? descriptors.find((descriptor) => descriptor.progressionStepNumber === 4) ?? descriptors[0];
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

function validateCctElements(selected: SelectedCctElement[], themes: CrossCuttingTheme[]) {
  const themeById = new Map(themes.map((theme) => [theme.id, theme]));
  return selected.every((item) => {
    const theme = themeById.get(item.themeId);
    const element = theme?.elements?.find((candidate) => candidate.id === item.elementId);
    return Boolean(theme && element && element.themeId === item.themeId && looksLikeUuid(item.themeId) && looksLikeUuid(item.elementId));
  });
}

function strandButtonLabel(strand: StrandDefinition) {
  return strand.shortName ?? strand.name;
}
