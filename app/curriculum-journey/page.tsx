"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useCurrentSchoolData } from "@/lib/currentSchool";
import { entryHasFramework, frameworkReferenceText, matchingFrameworkReferences } from "@/lib/mappingFrameworks";
import { areaThemes, themeForFramework } from "@/lib/theme";

const allValue = "";

export default function CurriculumJourneyPage() {
  const { frameworkLibrary, frameworkMap, mappings, subjectAoleMap, subjects, yearGroups } = useCurrentSchoolData();
  const defaultFramework = frameworkLibrary.find((item) => item.shortName === "Numeracy")?.name ?? frameworkLibrary[0]?.name ?? "";
  const [framework, setFramework] = useState(defaultFramework);
  const [strand, setStrand] = useState(allValue);
  const [element, setElement] = useState(allValue);
  const [subject, setSubject] = useState(allValue);
  const [year, setYear] = useState(allValue);
  const selectedFramework = frameworkMap[framework] ? framework : defaultFramework;
  const theme = themeForFramework(selectedFramework);
  const selectedFrameworkMap = frameworkMap[selectedFramework] ?? {};

  const strandOptions = Object.keys(selectedFrameworkMap);
  const elementOptions = strand && selectedFrameworkMap[strand] ? selectedFrameworkMap[strand] : Object.values(selectedFrameworkMap).flat();
  const journey = useMemo(
    () =>
      yearGroups.map((yearName) => ({
        year: yearName,
        entries: mappings.filter(
          (entry) =>
            entry.year === yearName &&
            entryHasFramework(entry, selectedFramework) &&
            (!strand || matchingFrameworkReferences(entry, selectedFramework).some((reference) => reference.strand === strand)) &&
            (!element || matchingFrameworkReferences(entry, selectedFramework).some((reference) => reference.element === element)) &&
            (!subject || entry.subject === subject) &&
            (!year || entry.year === year)
        )
      })),
    [element, mappings, selectedFramework, strand, subject, year, yearGroups]
  );

  function updateFramework(nextFramework: string) {
    setFramework(nextFramework);
    setStrand(allValue);
    setElement(allValue);
  }

  function updateStrand(nextStrand: string) {
    setStrand(nextStrand);
    setElement(allValue);
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Curriculum Journey"
        eyebrow="Year 7 to Year 11"
        description="Explore how a framework, strand or element is represented in planning across the whole-school curriculum journey."
        accent={areaThemes.overview.accent}
      />

      <article className="rounded-lg border bg-white p-5 shadow-sm" style={{ borderColor: theme.border }}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Select label="Framework" value={selectedFramework} options={frameworkLibrary.map((item) => item.name)} onChange={updateFramework} />
          <Select label="Strand" value={strand} options={[allValue, ...strandOptions]} onChange={updateStrand} emptyLabel="All strands" />
          <Select label="Element" value={element} options={[allValue, ...elementOptions]} onChange={setElement} emptyLabel="All elements" />
          <Select label="Subject" value={subject} options={[allValue, ...subjects]} onChange={setSubject} emptyLabel="All subjects" />
          <Select label="Year group" value={year} options={[allValue, ...yearGroups]} onChange={setYear} emptyLabel="All years" />
        </div>
      </article>

      <div className="grid gap-4 xl:grid-cols-5">
        {journey.map((yearBlock) => (
          <article key={yearBlock.year} className="rounded-lg border bg-white p-4 shadow-sm" style={{ borderColor: theme.border }}>
            <h2 className="font-bold" style={{ color: theme.text }}>
              {yearBlock.year}
            </h2>
            <div className="mt-4 space-y-3">
              {yearBlock.entries.map((entry) => (
                <div key={entry.id} className="rounded-md border border-gray-200 p-3">
                  <div className="text-sm font-bold text-gray-900">{entry.subject}</div>
                  <div className="mt-1 text-xs font-semibold text-gray-500">AoLE: {subjectAoleMap[entry.subject] ?? "Not set"}</div>
                  <div className="mt-1 text-sm text-gray-700">{entry.unit}</div>
                  <div className="mt-2 text-xs font-semibold text-gray-600">{matchingFrameworkReferences(entry, selectedFramework).map(frameworkReferenceText).join(", ")}</div>
                  <div className="mt-2 text-xs font-semibold text-gray-500">
                    {entry.term} · {entry.schemeReference}
                  </div>
                </div>
              ))}
              {!yearBlock.entries.length ? <p className="text-sm text-gray-500">{mappings.length ? "Fewer recorded opportunities for this selection." : "No curriculum mapping entries have been created yet."}</p> : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Select({ label, value, options, onChange, emptyLabel }: { label: string; value: string; options: string[]; onChange: (value: string) => void; emptyLabel?: string }) {
  return (
    <label>
      <span className="mb-1 block text-sm font-semibold text-gray-700">{label}</span>
      <select className="focus-ring w-full rounded-md border border-gray-300 bg-white px-3 py-2" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option || emptyLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
