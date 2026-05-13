"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useCurrentSchoolData } from "@/lib/currentSchool";
import type { ElementDefinition, FrameworkDefinition, StrandDefinition } from "@/lib/types";
import { areaThemes, themeForFramework } from "@/lib/theme";

export default function AddEntryPage() {
  const { frameworkLibrary, frameworkMap, subjectConfigs, subjectAoleMap, terms, yearGroups } = useCurrentSchoolData();
  const frameworkNames = Object.keys(frameworkMap);
  const [framework, setFramework] = useState(frameworkNames[0]);
  const activeSubjects = subjectConfigs.filter((subject) => subject.active && subject.appearsInMappingDropdowns).sort((a, b) => a.displayOrder - b.displayOrder).map((subject) => subject.name);
  const [subject, setSubject] = useState(activeSubjects[0]);
  const selectedFrameworkName = frameworkMap[framework] ? framework : frameworkNames[0];
  const selectedSubjectName = activeSubjects.includes(subject) ? subject : activeSubjects[0];
  const strands = useMemo(() => Object.keys(frameworkMap[selectedFrameworkName]), [frameworkMap, selectedFrameworkName]);
  const [strand, setStrand] = useState(strands[0]);
  const selectedStrandName = frameworkMap[selectedFrameworkName][strand] ? strand : strands[0];
  const elements = frameworkMap[selectedFrameworkName][selectedStrandName];
  const [element, setElement] = useState(elements[0]);
  const selectedElementName = elements.includes(element) ? element : elements[0];
  const [activityDescription, setActivityDescription] = useState("");
  const [showValidation, setShowValidation] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const selectedFramework = frameworkLibrary.find((item: FrameworkDefinition) => item.name === selectedFrameworkName) ?? frameworkLibrary[0];
  const selectedElement = selectedFramework.strands.flatMap((item: StrandDefinition) => item.elements).find((item: ElementDefinition) => item.name === selectedElementName);
  const theme = themeForFramework(selectedFrameworkName);
  const selectedAole = subjectAoleMap[selectedSubjectName];

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
  const activityError =
    trimmedActivity.length === 0
      ? "Learning Activity / Task Description cannot be blank."
      : trimmedActivity.length < 20
        ? "Use at least 20 characters."
        : trimmedActivity.length > 250
          ? "Use 250 characters or fewer."
          : "";

  function handleSave() {
    setShowValidation(true);
    if (!activityError) {
      setSaveMessage("Draft mapping saved locally for curriculum visibility.");
    } else {
      setSaveMessage("");
    }
  }

  function clearForm() {
    setSubject(activeSubjects[0]);
    setActivityDescription("");
    setShowValidation(false);
    setSaveMessage("Form cleared.");
    updateFramework(frameworkNames[0]);
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Add Curriculum Mapping Entry"
        eyebrow="Planning visibility"
        description="Create a curriculum mapping entry showing where a skill appears in planned learning. No pupil data, assessment data, behaviour data or coverage quality ratings are used."
        accent={areaThemes.overview.accent}
      />

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <form className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm" onSubmit={(event) => event.preventDefault()}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Subject">
              <select className="focus-ring w-full rounded-md border border-gray-300 bg-white px-3 py-2" value={selectedSubjectName} onChange={(event) => setSubject(event.target.value)}>
                {activeSubjects.map((subjectName) => (
                  <option key={subjectName}>{subjectName}</option>
                ))}
              </select>
              <div className="mt-2 rounded-md border border-[#e8cfe0] bg-[#f7edf3] px-3 py-2 text-sm font-semibold text-[#571435]">
                AoLE: {selectedAole ?? "Not set"}
              </div>
            </Field>
            <Field label="Year group">
              <select className="focus-ring w-full rounded-md border border-gray-300 bg-white px-3 py-2" defaultValue="Year 8">
                {yearGroups.map((year) => (
                  <option key={year}>{year}</option>
                ))}
              </select>
            </Field>
            <Field label="Term">
              <select className="focus-ring w-full rounded-md border border-gray-300 bg-white px-3 py-2" defaultValue="Spring">
                {terms.map((term) => (
                  <option key={term}>{term}</option>
                ))}
              </select>
            </Field>
            <Field label="Unit/topic">
              <input className="focus-ring w-full rounded-md border border-gray-300 px-3 py-2" defaultValue="Local enquiry project" />
            </Field>
            <Field label="Framework">
              <select className="focus-ring w-full rounded-md border border-gray-300 bg-white px-3 py-2" value={selectedFrameworkName} onChange={(event) => updateFramework(event.target.value)}>
                {frameworkNames.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </Field>
            <Field label="Strand">
              <select className="focus-ring w-full rounded-md border border-gray-300 bg-white px-3 py-2" value={selectedStrandName} onChange={(event) => updateStrand(event.target.value)}>
                {strands.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </Field>
            <Field label="Element">
              <select className="focus-ring w-full rounded-md border border-gray-300 bg-white px-3 py-2" value={selectedElementName} onChange={(event) => setElement(event.target.value)}>
                {elements.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </Field>
            <Field label="Scheme of learning reference">
              <input className="focus-ring w-full rounded-md border border-gray-300 px-3 py-2" defaultValue="HUM-Y8-S2" />
            </Field>
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
            <Field label="Optional note" wide>
              <textarea
                className="focus-ring min-h-24 w-full rounded-md border border-gray-300 px-3 py-2"
                defaultValue="Learners use evidence, discussion and digital presentation tools to communicate findings about a local issue."
              />
            </Field>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button className="focus-ring rounded-md bg-[#741B47] px-4 py-2 font-semibold text-white" type="button" onClick={handleSave}>
              Save draft mapping
            </button>
            <button className="focus-ring rounded-md border border-gray-300 px-4 py-2 font-semibold text-gray-700" type="button" onClick={clearForm}>
              Clear form
            </button>
          </div>
          {saveMessage ? <div className="mt-4 rounded-md border border-[#e8cfe0] bg-[#f7edf3] px-4 py-3 text-sm font-bold text-[#571435]">{saveMessage}</div> : null}
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

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={wide ? "sm:col-span-2" : ""}>
      <span className="mb-1 block text-sm font-semibold text-gray-700">{label}</span>
      {children}
    </label>
  );
}
