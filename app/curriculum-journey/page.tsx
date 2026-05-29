"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { useCurrentSchoolData } from "@/lib/currentSchool";
import { entryHasFramework, frameworkReferenceText, frameworkShortLabel, matchingFrameworkReferences } from "@/lib/mappingFrameworks";
import { areaThemes, themeForFramework } from "@/lib/theme";
import type { MappingEntry } from "@/lib/types";

const allValue = "";

export default function CurriculumJourneyPage() {
  const { frameworkLibrary, frameworkMap, mappings, subjectAoleMap, subjects, yearGroups } = useCurrentSchoolData();
  const defaultFramework = frameworkLibrary.find((item) => item.shortName === "Numeracy")?.name ?? frameworkLibrary[0]?.name ?? "";
  const [framework, setFramework] = useState(defaultFramework);
  const [strand, setStrand] = useState(allValue);
  const [element, setElement] = useState(allValue);
  const [subject, setSubject] = useState(allValue);
  const [year, setYear] = useState(allValue);
  const [selectedEntry, setSelectedEntry] = useState<MappingEntry | null>(null);
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
                <JourneyCard key={entry.id} entry={entry} framework={selectedFramework} onOpen={() => setSelectedEntry(entry)} />
              ))}
              {!yearBlock.entries.length ? <p className="text-sm text-gray-500">{mappings.length ? "Fewer recorded opportunities for this selection." : "No curriculum mapping entries have been created yet."}</p> : null}
            </div>
          </article>
        ))}
      </div>

      {selectedEntry ? <JourneyModal entry={selectedEntry} framework={selectedFramework} onClose={() => setSelectedEntry(null)} /> : null}
    </section>
  );
}

function JourneyCard({ entry, framework, onOpen }: { entry: MappingEntry; framework: string; onOpen: () => void }) {
  const elements = unique(matchingFrameworkReferences(entry, framework).map((reference) => reference.element).filter(Boolean));
  return (
    <button className="focus-ring w-full rounded-md border border-gray-200 bg-white p-3 text-left transition hover:shadow-sm" type="button" onClick={onOpen}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-bold text-gray-950">{entry.unit || entry.context || "Untitled curriculum"}</h3>
        {entry.schemeReference ? <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600">{entry.schemeReference}</span> : null}
      </div>
      <p className="mt-1 text-xs font-semibold text-gray-500">{entry.subject}</p>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">{elements.length === 1 ? "Element" : "Elements"}</p>
      <p className="mt-1 text-sm font-bold leading-5 text-gray-800">{elements.join(", ") || "No matching element"}</p>
    </button>
  );
}

function JourneyModal({ entry, framework, onClose }: { entry: MappingEntry; framework: string; onClose: () => void }) {
  const matchingReferences = matchingFrameworkReferences(entry, framework);
  const allReferences = matchingFrameworkReferences(entry);
  const themeItems = entry.crossCuttingThemes ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="journey-modal-title">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 pb-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-gray-500">
              {entry.schemeReference || "No scheme code"} · {entry.year} · {entry.term}
            </p>
            <h2 id="journey-modal-title" className="mt-1 text-2xl font-bold text-gray-950">
              {entry.unit || entry.context || "Untitled curriculum"}
            </h2>
            <p className="mt-1 text-sm font-semibold text-gray-600">{entry.subject}</p>
          </div>
          <button className="focus-ring rounded-md border border-gray-300 px-3 py-2 text-sm font-bold text-gray-700" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <DetailBlock title={`Matching ${frameworkShortLabel(framework)} references`}>
            {matchingReferences.length ? (
              <ul className="space-y-2 text-sm font-semibold text-gray-700">
                {matchingReferences.map((reference, index) => (
                  <li key={`${reference.elementId}-${reference.progressionDescriptorId ?? index}`}>{frameworkReferenceText(reference)}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-600">No matching references.</p>
            )}
          </DetailBlock>

          <DetailBlock title="All skills references">
            {allReferences.length ? (
              <ul className="space-y-2 text-sm font-semibold text-gray-700">
                {allReferences.map((reference, index) => (
                  <li key={`${reference.frameworkId}-${reference.elementId}-${reference.progressionDescriptorId ?? index}`}>{frameworkReferenceText(reference)}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-600">No skills references mapped.</p>
            )}
          </DetailBlock>

          <DetailBlock title="Cross-cutting themes">
            {themeItems.length ? (
              <ul className="space-y-2 text-sm font-semibold text-gray-700">
                {themeItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-600">No theme elements mapped.</p>
            )}
          </DetailBlock>

          <DetailBlock title="Description">
            <p className="text-sm leading-6 text-gray-700">{entry.activityDescription || "No description recorded."}</p>
          </DetailBlock>
        </div>

        <div className="mt-5 flex flex-wrap gap-3 border-t border-gray-200 pt-4">
          <Link className="focus-ring btn btn-primary" href={`/edit-curriculum/${entry.id}`}>
            Edit mapping
          </Link>
          <button className="focus-ring btn btn-secondary" type="button" onClick={onClose}>
            Back to journey
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-gray-200 p-4">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">{title}</h3>
      {children}
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

function unique(values: string[]) {
  return Array.from(new Set(values));
}
