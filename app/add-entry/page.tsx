"use client";

import { useEffect, useMemo, useState } from "react";
import { AccessDenied } from "@/components/AccessDenied";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/lib/auth";
import { useCurrentSchool } from "@/lib/currentSchool";
import type { ElementDefinition, FrameworkDefinition, MappingEntry, MappingFrameworkReference, ProgressionDescriptorDefinition, StrandDefinition, SubjectConfig } from "@/lib/types";
import { areaThemes, themeForFramework } from "@/lib/theme";

export default function AddEntryPage() {
  const { canEditMappings, currentUser } = useAuth();
  const { currentSchool, currentSchoolId, data, liveDiagnostics, addMapping } = useCurrentSchool();
  const { frameworkLibrary, subjectConfigs, terms, yearGroups, crossCuttingThemes } = data;
  const progressionFrameworkLibrary = useMemo(
    () => frameworkLibrary.filter((item) => ["Literacy", "Numeracy", "DCF"].includes(item.shortName)),
    [frameworkLibrary]
  );
  const activeSubjects = useMemo(
    () => subjectConfigs.filter((subject) => subject.active && subject.appearsInMappingDropdowns).sort((a, b) => a.name.localeCompare(b.name)),
    [subjectConfigs]
  );

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
  const [taskDescription, setTaskDescription] = useState("");
  const [frameworkNotes, setFrameworkNotes] = useState("");
  const [frameworkReferences, setFrameworkReferences] = useState<MappingFrameworkReference[]>([]);
  const [selectedThemeIds, setSelectedThemeIds] = useState<string[]>([]);
  const [themeNotes, setThemeNotes] = useState("");
  const [showDescriptor, setShowDescriptor] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const selectedThemes = useMemo(
    () => crossCuttingThemes.filter((themeItem) => selectedThemeIds.includes(themeItem.id)),
    [crossCuttingThemes, selectedThemeIds]
  );
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
  const selectedDescriptor = availableDescriptors.find((descriptor) => descriptor.id === progressionDescriptorId) ?? availableDescriptors[0];
  const theme = themeForFramework(selectedFramework?.name ?? "Literacy Framework");
  const hasSubjectRestrictedRole = currentUser?.role === "teacher" || currentUser?.role === "subject_lead";
  const hasEditableSubjects = !hasSubjectRestrictedRole || currentUser.assignedSubjects.length > 0;
  const canEditSelectedSubject =
    !selectedSubject ||
    currentUser?.role === "platform_admin" ||
    currentUser?.role === "school_admin" ||
    hasAssignedSubject(currentUser?.assignedSubjects ?? [], selectedSubject.name);
  const isDevelopment = process.env.NODE_ENV === "development";

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
    if (!selectedDescriptor?.id) {
      setProgressionDescriptorId("");
      return;
    }
    if (selectedDescriptor.id !== progressionDescriptorId) setProgressionDescriptorId(selectedDescriptor.id);
  }, [progressionDescriptorId, selectedDescriptor?.id]);

  useEffect(() => {
    if (!liveDiagnostics) return;
    const liveThemeIds = new Set(crossCuttingThemes.map((themeItem) => themeItem.id));
    setSelectedThemeIds((current) => current.filter((id) => liveThemeIds.has(id) && looksLikeUuid(id)));
  }, [crossCuttingThemes, liveDiagnostics]);

  if (!canEditMappings) {
    return <AccessDenied title="Add mapping restricted" message="Your current role is read-only. Switch to a teacher, subject lead or school admin account to add curriculum mapping entries." />;
  }

  const trimmedActivityTitle = activityTitle.trim();
  const trimmedActivityDescription = activityDescription.trim();
  const trimmedTaskDescription = taskDescription.trim();
  const trimmedSchemeReference = schemeReference.trim();
  const taskError =
    trimmedTaskDescription.length === 0
      ? "What pupils actually do cannot be blank."
      : trimmedTaskDescription.length < 20
        ? "Use at least 20 characters."
        : trimmedTaskDescription.length > 500
          ? "Use 500 characters or fewer."
          : "";
  const hasAnyLink = frameworkReferences.length > 0 || selectedThemeIds.length > 0;
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
                  : taskError
                    ? taskError
                    : !hasAnyLink
                      ? "Add at least one framework reference or cross-cutting theme."
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
      taskDescription: trimmedTaskDescription,
      schemeReference: trimmedSchemeReference,
      progressionReference: frameworkReferences[0]?.progressionReference ?? "Not specified",
      crossCuttingThemeIds: selectedThemes.map((themeItem) => themeItem.id),
      crossCuttingThemes: selectedThemes.map((themeItem) => themeItem.name),
      crossCuttingThemeNotes: themeNotes.trim(),
      note: "",
      lastMappedDate: new Date().toISOString().slice(0, 10)
    };
  }

  function addFrameworkReference() {
    console.log("Add reference clicked");
    console.log("selected framework", selectedFramework);
    console.log("selected strand", selectedStrand);
    console.log("selected element", selectedElement);
    console.log("selected descriptor", selectedDescriptor);
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
      const nextReferences = exists ? current : [...current, reference];
      console.log("selected references after add", nextReferences);
      return nextReferences;
    });
    setFrameworkNotes("");
    setSaveMessage("");
  }

  async function handleSave() {
    setShowValidation(true);
    if (formError) {
      setSaveMessage("");
      return;
    }
    console.log("Selected themes before save", selectedThemes);
    if (!validateThemeIdsBeforeSave()) {
      return;
    }
    setIsSaving(true);
    const result = await addMapping(buildMappingEntry());
    setIsSaving(false);
    setSaveMessage(result.ok ? "Mapping saved." : `Could not save mapping: ${result.message ?? "Unknown Supabase error"}`);
  }

  function resetForm(message = "Form cleared.") {
    setSubjectId("");
    setYearGroup("Year 7");
    setTerm(terms[0] ?? "Autumn");
    setActivityTitle("");
    setSchemeReference("");
    setActivityDescription("");
    setTaskDescription("");
    setFrameworkNotes("");
    setFrameworkReferences([]);
    setSelectedThemeIds([]);
    setThemeNotes("");
    setShowDescriptor(false);
    setShowValidation(false);
    setSaveMessage(message);
  }

  async function saveAndAddNew() {
    setShowValidation(true);
    if (formError) {
      setSaveMessage("");
      return;
    }
    console.log("Selected themes before save", selectedThemes);
    if (!validateThemeIdsBeforeSave()) {
      return;
    }
    setIsSaving(true);
    const result = await addMapping(buildMappingEntry());
    setIsSaving(false);
    if (result.ok) resetForm("Mapping saved. Ready for a new entry.");
    else setSaveMessage(`Could not save mapping: ${result.message ?? "Unknown Supabase error"}`);
  }

  const canAddReference = Boolean(selectedFramework?.id && selectedStrand?.id && selectedElement?.id && selectedDescriptor?.id);

  function validateThemeIdsBeforeSave() {
    if (selectedThemeIds.some((id) => !looksLikeUuid(id))) {
      setSaveMessage("Theme data is still using prototype IDs. Reload cross-cutting themes from Supabase.");
      return false;
    }
    return true;
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Add Curriculum Mapping Entry"
        eyebrow="Planning visibility"
        description="Describe what pupils are doing, then attach the framework references and wider theme tags it evidences."
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
        {liveDiagnostics ? (
          <div className="mb-5 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs leading-5 text-gray-700">
            <p>Resolved school id: {liveDiagnostics.schoolId}</p>
            <p>Subjects count: {liveDiagnostics.subjectQueryCount}</p>
            <p>Subjects error: {liveDiagnostics.subjectQueryError ?? "None"}</p>
            <p>Frameworks count: {liveDiagnostics.frameworkQueryCount}</p>
            <p>Frameworks error: {liveDiagnostics.frameworkQueryError ?? "None"}</p>
            <p>Strands count: {liveDiagnostics.strandQueryCount}</p>
            <p>Elements count: {liveDiagnostics.elementQueryCount}</p>
            <p>Descriptors count: {liveDiagnostics.descriptorQueryCount}</p>
          </div>
        ) : null}

        <div className="space-y-5">
          {hasSubjectRestrictedRole && !hasEditableSubjects ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
              No editable subjects are assigned to your account. Contact a school administrator.
            </div>
          ) : null}
          {activeSubjects.length === 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
              No subjects found for this school. Add subjects in Admin first.
              {isDevelopment || liveDiagnostics ? (
                <div className="mt-3 rounded-md bg-white/70 px-3 py-2 text-xs leading-5 text-amber-950">
                  <p>Current school id: {currentSchool.id}</p>
                  <p>Current school slug: {currentSchool.slug}</p>
                  <p>Subject query select: {liveDiagnostics?.subjectQuerySelect ?? "id, school_id, name"}</p>
                  <p>Raw subject query count: {liveDiagnostics?.subjectQueryCount ?? 0}</p>
                  <p>Subject query error: {liveDiagnostics?.subjectQueryError ?? "None"}</p>
                </div>
              ) : null}
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
              <Field label="What pupils actually do in this task" wide>
                <textarea
                  className="focus-ring min-h-24 w-full rounded-md border px-3 py-2"
                  style={{ borderColor: showValidation && taskError ? "#dc2626" : "#d1d5db" }}
                  value={taskDescription}
                  onChange={(event) => setTaskDescription(event.target.value)}
                  placeholder="Pupils compare sources, annotate evidence, discuss reliability and write a supported conclusion."
                  maxLength={500}
                />
                <div className="mt-1 flex flex-wrap items-start justify-between gap-2 text-xs">
                  <p className={showValidation && taskError ? "font-semibold text-red-700" : "text-gray-500"}>
                    {showValidation && taskError ? taskError : "Briefly describe the learner activity, not just the topic."}
                  </p>
                  <span className="font-semibold text-gray-500">{taskDescription.length}/500</span>
                </div>
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
                    <PickerButton key={item.id} selected={item.id === selectedStrand?.id} onClick={() => updateStrand(item.id ?? "")} themeName={selectedFramework?.name}>
                      {strandButtonLabel(selectedFramework?.name ?? "", item)}
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
                  {isDevelopment ? (
                    <div className="mt-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs leading-5 text-gray-600">
                      <p>Framework: {selectedFramework?.name ?? "None"} ({selectedFramework?.id ?? "no id"})</p>
                      <p>Strand: {selectedStrand?.name ?? "None"} ({selectedStrand?.id ?? "no id"})</p>
                      <p>Element: {selectedElement?.name ?? "None"} ({selectedElement?.id ?? "no id"})</p>
                      <p>Descriptors loaded globally: {countDescriptors(progressionFrameworkLibrary)}</p>
                      <p>Matching selected element: {availableDescriptors.length}</p>
                    </div>
                  ) : null}
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

          <FormSection number="4" title="Cross-cutting themes" description="Tag any wider curriculum themes represented in this activity.">
            <div className="grid gap-2 sm:grid-cols-2">
              {crossCuttingThemes.filter((themeItem) => themeItem.active).map((themeItem) => (
                <label key={themeItem.id} className="flex items-start gap-3 rounded-md border border-gray-200 bg-white p-3 text-sm font-semibold text-gray-800">
                  <input
                    className="mt-1 h-4 w-4"
                    type="checkbox"
                    checked={selectedThemeIds.includes(themeItem.id)}
                    onChange={(event) => setSelectedThemeIds((current) => (event.target.checked ? Array.from(new Set([...current, themeItem.id])) : current.filter((id) => id !== themeItem.id)))}
                  />
                  <span>
                    {themeItem.name}
                    {themeItem.description ? <span className="mt-1 block text-xs font-normal leading-5 text-gray-500">{themeItem.description}</span> : null}
                  </span>
                </label>
              ))}
            </div>
            <Field label="How does this piece of work link to the selected theme(s)?" wide>
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

function PickerButton({ selected, onClick, themeName, children }: { selected: boolean; onClick: () => void; themeName?: string; children: React.ReactNode }) {
  const theme = themeForFramework(themeName ?? "");
  return (
    <button
      className="focus-ring rounded-md border px-3 py-2 text-sm font-bold transition hover:-translate-y-0.5 hover:shadow-sm"
      style={selected ? { borderColor: theme.accent, backgroundColor: theme.soft, color: theme.text } : { borderColor: "#d1d5db", backgroundColor: "#ffffff", color: "#374151" }}
      type="button"
      onClick={onClick}
      aria-pressed={selected}
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

function countDescriptors(frameworks: FrameworkDefinition[]) {
  return frameworks.reduce((frameworkTotal, framework) => frameworkTotal + framework.strands.reduce((strandTotal, strand) => strandTotal + strand.elements.reduce((elementTotal, element) => elementTotal + (element.progressionDescriptorRefs?.length ?? 0), 0), 0), 0);
}

function normaliseSubjectName(subject: string) {
  return subject.trim().toLowerCase();
}

function hasAssignedSubject(assignedSubjects: string[], subject: string) {
  const selected = normaliseSubjectName(subject);
  return assignedSubjects.some((assignedSubject) => normaliseSubjectName(assignedSubject) === selected);
}

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function strandButtonLabel(framework: string, strand: StrandDefinition) {
  if (framework !== "Numeracy Framework") return strand.shortName ?? strand.name;
  const labels: Record<string, string> = {
    "Developing mathematical proficiency": "Mathematical proficiency",
    "Understanding the number system helps us to represent and compare relationships between numbers and quantities": "Number system",
    "Learning about geometry helps us understand shape, space and position, and learning about measurement helps us quantify in the real world": "Geometry and measurement",
    "Learning that statistics represent data and that probability models chance helps us make informed inferences and decisions": "Statistics and probability"
  };
  return strand.shortName ?? labels[strand.name] ?? strand.name;
}
