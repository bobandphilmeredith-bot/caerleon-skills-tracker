"use client";

import { useMemo, useState } from "react";
import { AccessDenied } from "@/components/AccessDenied";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/lib/auth";
import { useCurrentSchool } from "@/lib/currentSchool";
import { descriptorForReference, secondaryProgressionReferences, suggestedProgressionForYear } from "@/lib/progression";
import type { ElementDefinition, FrameworkDefinition, MappingEntry, ProgressionReference, StrandDefinition } from "@/lib/types";
import { areaThemes, themeForFramework } from "@/lib/theme";

export default function AddEntryPage() {
  const { canEditMappings, currentUser } = useAuth();
  const { currentSchoolId, data, addMapping } = useCurrentSchool();
  const { frameworkLibrary, frameworkMap, subjectConfigs, subjectAoleMap, terms, yearGroups } = data;
  const frameworkNames = Object.keys(frameworkMap);
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
  const [unit, setUnit] = useState("");
  const [schemeReference, setSchemeReference] = useState("");
  const [progressionReference, setProgressionReference] = useState<ProgressionReference>("Not specified");
  const [activityDescription, setActivityDescription] = useState("");
  const [showValidation, setShowValidation] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const selectedFramework = frameworkLibrary.find((item: FrameworkDefinition) => item.name === selectedFrameworkName) ?? frameworkLibrary[0];
  const selectedElement = selectedFramework.strands.flatMap((item: StrandDefinition) => item.elements).find((item: ElementDefinition) => item.name === selectedElementName);
  const theme = themeForFramework(selectedFrameworkName);
  const selectedAole = selectedSubjectName ? subjectAoleMap[selectedSubjectName] : undefined;
  const suggestedProgression = suggestedProgressionForYear(yearGroup);
  const progressionDescriptor = descriptorForReference(selectedElement, progressionReference);
  const hasSubjectRestrictedRole = currentUser?.role === "teacher" || currentUser?.role === "subject_lead";
  const hasEditableSubjects = !hasSubjectRestrictedRole || currentUser.assignedSubjects.length > 0;
  const canEditSelectedSubject = !selectedSubjectName || currentUser?.role === "platform_admin" || currentUser?.role === "school_admin" || currentUser?.assignedSubjects.includes(selectedSubjectName);

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

  const trimmedActivity = activityDescription.trim();
  const trimmedUnit = unit.trim();
  const trimmedSchemeReference = schemeReference.trim();
  const activityError =
    trimmedActivity.length === 0
      ? "Learning Activity / Task Description cannot be blank."
      : trimmedActivity.length < 20
        ? "Use at least 20 characters."
        : trimmedActivity.length > 250
          ? "Use 250 characters or fewer."
          : "";
  const formError =
    hasSubjectRestrictedRole && !hasEditableSubjects
      ? "No editable subjects are assigned to your account. Contact a school administrator."
      : !selectedSubjectName
      ? "Select a subject."
      : !canEditSelectedSubject
        ? "You can view this subject, but you do not have permission to edit it."
        : !trimmedUnit
        ? "Unit/topic cannot be blank."
        : !trimmedSchemeReference
          ? "Scheme of learning reference cannot be blank."
          : activityError;

  function buildMappingEntry(): MappingEntry {
    return {
      schoolId: currentSchoolId,
      id: `map-${currentSchoolId}-${Date.now()}`,
      subject: selectedSubjectName,
      framework: selectedFrameworkName,
      strand: selectedStrandName,
      element: selectedElementName,
      context: trimmedUnit,
      year: yearGroup,
      term,
      unit: trimmedUnit,
      activityDescription: trimmedActivity,
      schemeReference: trimmedSchemeReference,
      progressionReference,
      note: "",
      lastMappedDate: new Date().toISOString().slice(0, 10)
    };
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
    setUnit("");
    setSchemeReference("");
    setProgressionReference("Not specified");
    setActivityDescription("");
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
        description="Create a curriculum mapping entry showing where a skill appears in planned learning."
        accent={areaThemes.overview.accent}
      />

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <form className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm" onSubmit={(event) => event.preventDefault()}>
          <div className="mb-5 grid gap-3 md:grid-cols-3">
            <StepPill number="1" title="Context" />
            <StepPill number="2" title="Framework link" />
            <StepPill number="3" title="Activity and reference" />
          </div>

          <div className="space-y-5">
            {hasSubjectRestrictedRole && !hasEditableSubjects ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
                No editable subjects are assigned to your account. Contact a school administrator.
              </div>
            ) : null}
            <FormSection number="1" title="Context" description="Choose the subject, year, term and planning reference before adding framework detail.">
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
                  <p className="mt-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700">Suggested progression reference based on year group. This can be changed. Suggested: {suggestedProgression}</p>
                </Field>
                <Field label="Term">
                  <SegmentedButtons options={terms} value={term} onChange={setTerm} />
                </Field>
                <Field label="Unit/topic">
                  <input className="focus-ring w-full rounded-md border border-gray-300 px-3 py-2" value={unit} onChange={(event) => setUnit(event.target.value)} />
                </Field>
              </div>
            </FormSection>

            <FormSection number="2" title="Framework link" description="Choose Framework → Strand → Element using quick buttons. Each choice updates the next row.">
              <div>
                <span className="mb-2 block text-sm font-semibold text-gray-700">Framework</span>
                <div className="flex flex-wrap gap-2">
                  {frameworkNames.map((name) => {
                    const frameworkItem = frameworkLibrary.find((item) => item.name === name);
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
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>

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
            </FormSection>

            <FormSection number="3" title="Activity and progression reference" description="Add the planned activity and optional curriculum progression reference.">
              <Field label="Scheme of learning reference">
                <input className="focus-ring w-full rounded-md border border-gray-300 px-3 py-2" value={schemeReference} onChange={(event) => setSchemeReference(event.target.value)} />
              </Field>
              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-gray-950">Progression Step Reference</h2>
                  <p className="mt-1 text-sm leading-6 text-gray-600">Optional curriculum reference for the selected framework element.</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-700">Default: Not specified</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {secondaryProgressionReferences.map((reference) => {
                  const selected = progressionReference === reference;
                  return (
                    <button
                      key={reference}
                      className="focus-ring rounded-full border px-3 py-2 text-sm font-bold"
                      style={selected ? { borderColor: theme.accent, backgroundColor: theme.soft, color: theme.text } : { borderColor: "#d1d5db", backgroundColor: "#ffffff", color: "#374151" }}
                      type="button"
                      onClick={() => setProgressionReference(reference)}
                    >
                      {reference}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-4 rounded-lg border p-4" style={{ borderColor: theme.border, backgroundColor: theme.soft }}>
              <h2 className="font-bold" style={{ color: theme.text }}>
                Selected
              </h2>
              <p className="mt-2 text-sm font-semibold text-gray-800">
                {selectedFrameworkName} → {selectedStrandName} → {selectedElementName} → {progressionReference}
              </p>
              <dl className="mt-4 space-y-3 text-sm">
                <GuidanceRow label="Descriptor" value={progressionDescriptor} />
                <GuidanceRow label="Teacher-friendly explanation" value={selectedElement?.explanation ?? "Select an element to see guidance."} />
              </dl>
              <div className="mt-4">
                <h3 className="text-sm font-bold text-gray-900">Example classroom opportunities</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedElement?.examples.map((example) => (
                    <span key={example} className="rounded-full bg-white px-3 py-1 text-xs font-semibold" style={{ color: theme.text }}>
                      {example}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4">
            <Field label="Learning Activity / Task Description" wide>
              <textarea
                className="focus-ring min-h-28 w-full rounded-md border px-3 py-2"
                style={{ borderColor: showValidation && activityError ? "#dc2626" : "#d1d5db" }}
                value={activityDescription}
                onChange={(event) => setActivityDescription(event.target.value)}
                placeholder="Pupils interpret reaction graphs and use data to justify conclusions."
                aria-describedby="activity-help activity-count"
                required
                minLength={20}
                maxLength={250}
              />
              <div className="mt-1 flex flex-wrap items-start justify-between gap-2 text-xs">
                <p id="activity-help" className={showValidation && activityError ? "font-semibold text-red-700" : "text-gray-500"}>
                  {showValidation && activityError ? activityError : "Briefly describe what pupils actually do in this task."}
                </p>
                <span id="activity-count" className="font-semibold text-gray-500">
                  {activityDescription.length}/250
                </span>
              </div>
            </Field>
            </div>
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
