"use client";

import { useMemo, useState } from "react";
import { AccessDenied } from "@/components/AccessDenied";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/lib/auth";
import { useCurrentSchool } from "@/lib/currentSchool";
import { suggestedProgressionForYear } from "@/lib/progression";
import type { ElementDefinition, FrameworkDefinition, MappingEntry, MappingFrameworkReference, ProgressionReference, StrandDefinition } from "@/lib/types";
import { areaThemes, themeForFramework } from "@/lib/theme";

export default function AddEntryPage() {
  const { canEditMappings, currentUser } = useAuth();
  const { currentSchoolId, data, addMapping } = useCurrentSchool();
  const { frameworkLibrary, frameworkMap, subjectConfigs, subjectAoleMap, terms, yearGroups, crossCuttingThemes } = data;
  const progressionFrameworkLibrary = frameworkLibrary.filter((item) => ["Literacy", "Numeracy", "DCF"].includes(item.shortName));
  const frameworkNames = progressionFrameworkLibrary.map((item) => item.name);
  const [framework, setFramework] = useState(frameworkNames[0]);
  const activeSubjects = subjectConfigs
    .filter((subject) => subject.active && subject.appearsInMappingDropdowns)
    .map((subject) => subject.name)
    .sort((a, b) => a.localeCompare(b));
  const [subject, setSubject] = useState("");
  const selectedFrameworkName = frameworkMap[framework] ? framework : frameworkNames[0];
  const selectedSubjectName = activeSubjects.includes(subject) ? subject : "";
  const strands = useMemo(() => Object.keys(frameworkMap[selectedFrameworkName]), [frameworkMap, selectedFrameworkName]);
  const [strand, setStrand] = useState(strands[0]);
  const selectedStrandName = frameworkMap[selectedFrameworkName][strand] ? strand : strands[0];
  const elements = frameworkMap[selectedFrameworkName][selectedStrandName];
  const [element, setElement] = useState(elements[0]);
  const selectedElementName = elements.includes(element) ? element : elements[0];
  const [yearGroup, setYearGroup] = useState("Year 7");
  const [term, setTerm] = useState("Autumn");
  const [activityTitle, setActivityTitle] = useState("");
  const [schemeReference, setSchemeReference] = useState("");
  const [progressionReference, setProgressionReference] = useState<ProgressionReference>("Not specified");
  const [activityDescription, setActivityDescription] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [frameworkNotes, setFrameworkNotes] = useState("");
  const [frameworkReferences, setFrameworkReferences] = useState<MappingFrameworkReference[]>([]);
  const [selectedThemeIds, setSelectedThemeIds] = useState<string[]>([]);
  const [themeNotes, setThemeNotes] = useState("");
  const [showValidation, setShowValidation] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const selectedFramework = frameworkLibrary.find((item: FrameworkDefinition) => item.name === selectedFrameworkName) ?? frameworkLibrary[0];
  const selectedStrand = selectedFramework.strands.find((item: StrandDefinition) => item.name === selectedStrandName);
  const selectedElement = selectedStrand?.elements.find((item: ElementDefinition) => item.name === selectedElementName);
  const selectedSubject = subjectConfigs.find((item) => item.name === selectedSubjectName);
  const theme = themeForFramework(selectedFrameworkName);
  const selectedAole = selectedSubjectName ? subjectAoleMap[selectedSubjectName] : undefined;
  const suggestedProgression = suggestedProgressionForYear(yearGroup);
  const availableDescriptors = (selectedElement?.progressionDescriptorRefs ?? []).filter((descriptor) => selectedFramework?.shortName !== "DCF" || descriptor.progressionStepNumber >= 3);
  const progressionOptions = availableDescriptors.map((descriptor) => descriptor.progressionStep);
  const selectedProgressionReference: ProgressionReference = progressionOptions.some((option) => option === progressionReference) ? progressionReference : (progressionOptions[0] ?? "Not specified");
  const selectedDescriptor = availableDescriptors.find((descriptor) => descriptor.progressionStep === selectedProgressionReference);
  const progressionDescriptor = selectedDescriptor?.descriptorText ?? "No official progression descriptor found for this selection. Please check the framework seed data.";
  const hasSubjectRestrictedRole = currentUser?.role === "teacher" || currentUser?.role === "subject_lead";
  const hasEditableSubjects = !hasSubjectRestrictedRole || currentUser.assignedSubjects.length > 0;
  const canEditSelectedSubject = !selectedSubjectName || currentUser?.role === "platform_admin" || currentUser?.role === "school_admin" || hasAssignedSubject(currentUser?.assignedSubjects ?? [], selectedSubjectName);

  if (!canEditMappings) {
    return <AccessDenied title="Add mapping restricted" message="Your current role is read-only. Switch to a teacher, subject lead or school admin account to add curriculum mapping entries." />;
  }

  function updateFramework(nextFramework: string) {
    const nextStrands = Object.keys(frameworkMap[nextFramework]);
    const nextElements = frameworkMap[nextFramework][nextStrands[0]];
    setFramework(nextFramework);
    setStrand(nextStrands[0]);
    setElement(nextElements[0]);
  }

  function updateStrand(nextStrand: string) {
    setStrand(nextStrand);
    setElement(frameworkMap[selectedFrameworkName][nextStrand][0]);
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
      : !selectedSubjectName
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

  function buildMappingEntry(): MappingEntry {
    return {
      schoolId: currentSchoolId,
      subjectId: selectedSubject?.id,
      frameworkId: frameworkReferences[0]?.frameworkId,
      strandId: frameworkReferences[0]?.strandId,
      elementId: frameworkReferences[0]?.elementId,
      progressionDescriptorId: undefined,
      frameworkReferences,
      id: `map-${currentSchoolId}-${Date.now()}`,
      subject: selectedSubjectName,
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
      progressionReference: frameworkReferences[0]?.progressionReference ?? selectedProgressionReference,
      crossCuttingThemeIds: selectedThemeIds,
      crossCuttingThemes: crossCuttingThemes.filter((theme) => selectedThemeIds.includes(theme.id)).map((theme) => theme.name),
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
    const progressionStep = selectedDescriptor.progressionStepNumber;
    const reference: MappingFrameworkReference = {
      id: `${selectedFramework.id}-${selectedStrand.id}-${selectedElement.id}-${selectedDescriptor.id}`,
      frameworkId: selectedFramework.id,
      strandId: selectedStrand.id,
      elementId: selectedElement.id,
      progressionDescriptorId: selectedDescriptor.id,
      progressionStep,
      framework: selectedFramework.name,
      strand: selectedStrand.name,
      element: selectedElement.name,
      progressionReference: selectedDescriptor.progressionStep,
      descriptor: progressionDescriptor,
      notes: frameworkNotes.trim()
    };
    setFrameworkReferences((current) => {
      const exists = current.some(
        (item) =>
          item.frameworkId === reference.frameworkId &&
          item.strandId === reference.strandId &&
          item.elementId === reference.elementId &&
          (item.progressionStep ?? null) === (reference.progressionStep ?? null)
      );
      const nextReferences = exists ? current : [...current, reference];
      console.log("selected references after add", nextReferences);
      return nextReferences;
    });
    setFrameworkNotes("");
  }

  async function handleSave() {
    setShowValidation(true);
    if (!formError) {
      setIsSaving(true);
      const result = await addMapping(buildMappingEntry());
      setIsSaving(false);
      setSaveMessage(result.ok ? "Mapping saved." : `Could not save mapping: ${result.message ?? "Unknown Supabase error"}`);
    } else {
      setSaveMessage("");
    }
  }

  function resetForm(message = "Form cleared.") {
    setSubject("");
    setYearGroup("Year 7");
    setTerm("Autumn");
    setActivityTitle("");
    setSchemeReference("");
    setProgressionReference("Not specified");
    setActivityDescription("");
    setTaskDescription("");
    setFrameworkNotes("");
    setFrameworkReferences([]);
    setSelectedThemeIds([]);
    setThemeNotes("");
    setShowValidation(false);
    setSaveMessage(message);
    updateFramework(frameworkNames[0]);
  }

  function clearForm() {
    resetForm();
  }

  async function saveAndAddNew() {
    setShowValidation(true);
    if (!formError) {
      setIsSaving(true);
      const result = await addMapping(buildMappingEntry());
      setIsSaving(false);
      if (result.ok) {
        resetForm("Mapping saved. Ready for a new entry.");
      } else {
        setSaveMessage(`Could not save mapping: ${result.message ?? "Unknown Supabase error"}`);
      }
    } else {
      setSaveMessage("");
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Add Curriculum Mapping Entry"
        eyebrow="Planning visibility"
        description="Describe one piece of curriculum work, then attach the framework references and wider theme tags it genuinely develops."
        accent={areaThemes.overview.accent}
      />

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <form className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm" onSubmit={(event) => event.preventDefault()}>
          <div className="mb-5 grid gap-3 md:grid-cols-4">
            <StepPill number="1" title="Activity" />
            <StepPill number="2" title="Frameworks" />
            <StepPill number="3" title="Themes" />
            <StepPill number="4" title="Save" />
          </div>

          <div className="space-y-5">
            {hasSubjectRestrictedRole && !hasEditableSubjects ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
                No editable subjects are assigned to your account. Contact a school administrator.
              </div>
            ) : null}
            <FormSection number="1" title="Curriculum activity" description="Describe the piece of work you want to map.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Subject">
                  <select className="focus-ring w-full rounded-md border border-gray-300 bg-white px-3 py-2" value={selectedSubjectName} onChange={(event) => setSubject(event.target.value)}>
                    <option value="">Select a subject</option>
                    {activeSubjects.map((subjectName) => (
                      <option key={subjectName}>{subjectName}</option>
                    ))}
                  </select>
                  {selectedSubjectName ? <div className="mt-2 rounded-md border border-[#e8cfe0] bg-[#f7edf3] px-3 py-2 text-sm font-semibold text-[#571435]">AoLE: {selectedAole ?? "Not set"}</div> : null}
                  {selectedSubjectName && !canEditSelectedSubject ? (
                    <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">
                      You can view this subject, but you do not have permission to edit it.
                    </div>
                  ) : null}
                </Field>
                <Field label="Year group">
                  <SegmentedButtons options={yearGroups} value={yearGroup} onChange={setYearGroup} />
                </Field>
                <Field label="Scheme of learning reference">
                  <input className="focus-ring w-full rounded-md border border-gray-300 px-3 py-2" value={schemeReference} onChange={(event) => setSchemeReference(event.target.value)} />
                </Field>
                <Field label="Piece of work / activity title">
                  <input className="focus-ring w-full rounded-md border border-gray-300 px-3 py-2" value={activityTitle} onChange={(event) => setActivityTitle(event.target.value)} />
                </Field>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Description of the activity" wide>
                  <textarea
                    className="focus-ring min-h-24 w-full rounded-md border border-gray-300 px-3 py-2"
                    value={activityDescription}
                    onChange={(event) => setActivityDescription(event.target.value)}
                    placeholder="A source investigation exploring migration, identity and post-war Britain."
                  />
                </Field>
                <Field label="What pupils actually do in this task" wide>
                  <textarea
                    className="focus-ring min-h-28 w-full rounded-md border px-3 py-2"
                    style={{ borderColor: showValidation && taskError ? "#dc2626" : "#d1d5db" }}
                    value={taskDescription}
                    onChange={(event) => setTaskDescription(event.target.value)}
                    placeholder="Pupils compare sources, annotate evidence, discuss reliability and write a supported conclusion."
                    aria-describedby="task-help task-count"
                    required
                    minLength={20}
                    maxLength={500}
                  />
                  <div className="mt-1 flex flex-wrap items-start justify-between gap-2 text-xs">
                    <p id="task-help" className={showValidation && taskError ? "font-semibold text-red-700" : "text-gray-500"}>
                      {showValidation && taskError ? taskError : "Briefly describe the learner activity, not just the topic."}
                    </p>
                    <span id="task-count" className="font-semibold text-gray-500">
                      {taskDescription.length}/500
                    </span>
                  </div>
                </Field>
              </div>
            </FormSection>

            <FormSection number="2" title="Skills framework references" description="Add Literacy, Numeracy or DCF references that this activity genuinely develops.">
              <div>
                <span className="mb-2 block text-sm font-semibold text-gray-700">Framework</span>
                <div className="flex flex-wrap gap-2">
                  {frameworkNames.map((name) => {
                    const frameworkItem = progressionFrameworkLibrary.find((item) => item.name === name);
                    const buttonTheme = themeForFramework(name);
                    const selected = selectedFrameworkName === name;
                    return (
                      <button
                        key={name}
                        className="focus-ring rounded-md border px-3 py-2 text-left text-sm font-bold transition hover:-translate-y-0.5 hover:shadow-sm"
                        style={
                          selected
                            ? { borderColor: buttonTheme.accent, backgroundColor: buttonTheme.soft, color: buttonTheme.text, boxShadow: `inset 0 0 0 1px ${buttonTheme.accent}` }
                            : { borderColor: "#e5e7eb", backgroundColor: "#ffffff" }
                        }
                        type="button"
                        onClick={() => updateFramework(name)}
                        aria-pressed={selected}
                      >
                        {frameworkItem?.shortName ?? name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5">
                <span className="mb-2 block text-sm font-semibold text-gray-700">Strand</span>
                <div className="flex flex-wrap gap-2">
                  {strands.map((name) => {
                    const selected = selectedStrandName === name;
                    return (
                      <button
                        key={name}
                        className="focus-ring rounded-md border px-3 py-2 text-sm font-bold transition hover:-translate-y-0.5 hover:shadow-sm"
                        style={selected ? { borderColor: theme.accent, backgroundColor: theme.soft, color: theme.text } : { borderColor: "#d1d5db", backgroundColor: "#ffffff", color: "#374151" }}
                        type="button"
                        onClick={() => updateStrand(name)}
                        aria-pressed={selected}
                      >
                        {strandButtonLabel(selectedFrameworkName, name)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedFrameworkName === "Numeracy Framework" ? (
                <p className="mt-3 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-900">Full strand: {selectedStrandName}</p>
              ) : null}

              <div className="mt-5">
                <span className="mb-2 block text-sm font-semibold text-gray-700">Element</span>
                <div className="flex flex-wrap gap-2">
                  {elements.map((name) => {
                    const selected = selectedElementName === name;
                    return (
                      <button
                        key={name}
                        className="focus-ring rounded-md border px-3 py-2 text-sm font-bold transition hover:-translate-y-0.5 hover:shadow-sm"
                        style={selected ? { borderColor: theme.accent, backgroundColor: theme.soft, color: theme.text } : { borderColor: "#d1d5db", backgroundColor: "#ffffff", color: "#374151" }}
                        type="button"
                        onClick={() => setElement(name)}
                        aria-pressed={selected}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-gray-950">Progression descriptor</h2>
                    <p className="mt-1 text-sm leading-6 text-gray-600">{selectedFramework.shortName === "DCF" ? "Only steps 3, 4 and 5 are shown for DCF." : "Choose from the official descriptor records available for this element."}</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-700">Suggested: {suggestedProgression}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {progressionOptions.length ? (
                    progressionOptions.map((reference) => {
                      const selected = selectedProgressionReference === reference;
                      return (
                        <button
                          key={reference}
                          className="focus-ring rounded-md border px-3 py-2 text-sm font-bold"
                          style={selected ? { borderColor: theme.accent, backgroundColor: theme.soft, color: theme.text } : { borderColor: "#d1d5db", backgroundColor: "#ffffff", color: "#374151" }}
                          type="button"
                          onClick={() => setProgressionReference(reference)}
                        >
                          {reference}
                        </button>
                      );
                    })
                  ) : (
                    <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">No official progression descriptor found. Please check the framework data.</p>
                  )}
                </div>
              </div>

              <div className="mt-4 rounded-lg border p-4" style={{ borderColor: theme.border, backgroundColor: theme.soft }}>
                <h2 className="font-bold" style={{ color: theme.text }}>
                  Reference detail
                </h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <GuidanceRow label="Framework" value={selectedFrameworkName} />
                  <GuidanceRow label="Strand button label" value={strandButtonLabel(selectedFrameworkName, selectedStrandName)} />
                  <GuidanceRow label="Full official strand name" value={selectedStrandName} />
                  <GuidanceRow label="Element" value={selectedElementName} />
                  <GuidanceRow label="Progression step" value={selectedProgressionReference} />
                  <GuidanceRow label="Official progression descriptor" value={progressionDescriptor} />
                  {selectedElement?.explanation ? <GuidanceRow label="How this might look in a lesson" value={selectedElement.explanation} /> : null}
                </dl>
                <Field label="Optional explanation/notes about how the activity meets this reference" wide>
                  <textarea className="focus-ring mt-2 min-h-20 w-full rounded-md border border-gray-300 px-3 py-2" value={frameworkNotes} onChange={(event) => setFrameworkNotes(event.target.value)} />
                </Field>
                <button className="focus-ring btn btn-secondary mt-4" type="button" onClick={addFrameworkReference} disabled={!selectedDescriptor?.id}>
                  Add framework reference
                </button>
              </div>
            </FormSection>

            <FormSection number="3" title="Selected framework references" description="These references will be saved for this piece of work.">
              {frameworkReferences.length ? (
                <div className="grid gap-3">
                  {frameworkReferences.map((reference) => (
                    <div key={reference.id} className="rounded-md border border-gray-200 bg-white p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-gray-950">{reference.framework}</p>
                          <p className="mt-1 text-sm text-gray-700">
                            {reference.strand} - {reference.element} - {reference.progressionReference}
                          </p>
                          <p className="mt-2 line-clamp-2 text-xs leading-5 text-gray-500">{reference.descriptor}</p>
                          {reference.notes ? <p className="mt-2 text-xs font-semibold leading-5 text-gray-600">Notes: {reference.notes}</p> : null}
                        </div>
                        <div className="flex gap-2">
                          <button
                            className="focus-ring rounded-md border border-gray-300 px-2 py-1 text-xs font-bold text-gray-700"
                            type="button"
                            onClick={() => {
                              setFramework(reference.framework);
                              setStrand(reference.strand);
                              setElement(reference.element);
                              setProgressionReference(reference.progressionReference ?? "Not specified");
                              setFrameworkNotes(reference.notes ?? "");
                              setFrameworkReferences((current) => current.filter((item) => item.id !== reference.id));
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="focus-ring rounded-md border border-gray-300 px-2 py-1 text-xs font-bold text-gray-700"
                            type="button"
                            onClick={() => setFrameworkReferences((current) => current.filter((item) => item.id !== reference.id))}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600">No framework references added yet.</p>
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
                      onChange={(event) =>
                        setSelectedThemeIds((current) =>
                          event.target.checked ? Array.from(new Set([...current, themeItem.id])) : current.filter((id) => id !== themeItem.id)
                        )
                      }
                    />
                    <span>
                      {themeItem.name}
                      {themeItem.description ? <span className="mt-1 block text-xs font-normal leading-5 text-gray-500">{themeItem.description}</span> : null}
                    </span>
                  </label>
                ))}
              </div>
              <Field label="How does this piece of work link to the selected theme(s)?" wide>
                <textarea className="focus-ring min-h-20 w-full rounded-md border border-gray-300 px-3 py-2" value={themeNotes} onChange={(event) => setThemeNotes(event.target.value)} />
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
            <button className="focus-ring btn btn-muted" type="button" onClick={clearForm}>
              Clear form
            </button>
          </div>
          {saveMessage ? <div className="mt-4 rounded-md border border-[#e8cfe0] bg-[#f7edf3] px-4 py-3 text-sm font-bold text-[#571435]">{saveMessage}</div> : null}
          {showValidation && formError ? <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{formError}</div> : null}
        </form>

        <aside className="rounded-lg border p-5" style={{ borderColor: theme.border, backgroundColor: theme.soft }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold" style={{ color: theme.text }}>
                Framework Browser
              </h2>
              <p className="mt-1 text-sm leading-6 text-gray-700">This panel updates from the selected framework and helps teachers choose the strand and element.</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold" style={{ color: theme.text }}>
              {selectedFramework.shortName}
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {selectedFramework.strands.map((item) => (
              <details key={item.name} className="rounded-md bg-white p-3" open={item.name === selectedStrandName}>
                <summary className="cursor-pointer text-sm font-bold text-gray-900">{item.name}</summary>
                <div className="mt-3 space-y-2">
                  {item.elements.map((elementItem) => (
                    <button
                      key={elementItem.name}
                      className="focus-ring w-full rounded-md border px-3 py-2 text-left text-sm"
                      style={
                        elementItem.name === selectedElementName
                          ? { borderColor: theme.accent, backgroundColor: theme.soft, color: theme.text }
                          : { borderColor: "#e5e7eb", color: "#374151" }
                      }
                      type="button"
                      onClick={() => {
                        setStrand(item.name);
                        setElement(elementItem.name);
                      }}
                    >
                      {elementItem.name}
                    </button>
                  ))}
                </div>
              </details>
            ))}
          </div>

          <div className="mt-5 rounded-md bg-white p-4">
            <h3 className="font-bold text-gray-900">{selectedElement?.name}</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <GuidanceRow label="Framework" value={selectedFramework.name} />
              <GuidanceRow label="Strand" value={strandButtonLabel(selectedFrameworkName, selectedStrandName)} />
              <GuidanceRow label="Full strand name" value={selectedStrandName} />
              <GuidanceRow label="Progression step" value={selectedProgressionReference} />
              <GuidanceRow label="Official progression descriptor" value={progressionDescriptor} />
            </dl>
            <p className="mt-2 text-sm leading-6 text-gray-700">{selectedElement?.explanation}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedElement?.examples.map((example) => (
                <span key={example} className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: theme.soft, color: theme.text }}>
                  {example}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </div>
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

function GuidanceRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-bold text-gray-900">{label}</dt>
      <dd className="mt-1 leading-6 text-gray-700">{value}</dd>
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

function strandButtonLabel(framework: string, strand: string) {
  if (framework !== "Numeracy Framework") return strand;
  const labels: Record<string, string> = {
    "Developing mathematical proficiency": "Mathematical proficiency",
    "Understanding the number system helps us to represent and compare relationships between numbers and quantities": "Number system",
    "Learning about geometry helps us understand shape, space and position, and learning about measurement helps us quantify in the real world": "Geometry and measurement",
    "Learning that statistics represent data and that probability models chance helps us make informed inferences and decisions": "Statistics and probability"
  };
  return labels[strand] ?? strand;
}
