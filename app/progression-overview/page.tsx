"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { useCurrentSchoolData } from "@/lib/currentSchool";
import { areaThemes, themeForFramework } from "@/lib/theme";
import type { FrameworkDefinition, MappingEntry, MappingFrameworkReference, ProgressionStep } from "@/lib/types";

const allValue = "All";

export default function ProgressionOverviewPage() {
  const { frameworkLibrary, mappings, subjects, yearGroups } = useCurrentSchoolData();
  const [framework, setFramework] = useState(allValue);
  const [subject, setSubject] = useState(allValue);
  const [yearGroup, setYearGroup] = useState(allValue);
  const [progressionStep, setProgressionStep] = useState(allValue);

  const progressionDescriptors = useMemo(() => flattenProgressionDescriptors(frameworkLibrary), [frameworkLibrary]);
  const progressionStepOptions = useMemo(
    () => Array.from(new Set(progressionDescriptors.map((descriptor) => descriptor.progressionStep))).sort(compareProgressionSteps),
    [progressionDescriptors]
  );
  const mappedProgression = useMemo(() => expandMappedProgression(mappings, progressionDescriptors), [mappings, progressionDescriptors]);

  const filteredProgression = useMemo(
    () =>
      mappedProgression.filter(({ entry, descriptor }) => {
        return (
          (framework === allValue || descriptor.framework === framework) &&
          (subject === allValue || entry.subject === subject) &&
          (yearGroup === allValue || entry.year === yearGroup) &&
          (progressionStep === allValue || descriptor.progressionStep === progressionStep)
        );
      }),
    [framework, mappedProgression, progressionStep, subject, yearGroup]
  );

  const byYear = crossTab(filteredProgression, yearGroups, progressionStepOptions, (item) => item.entry.year);
  const bySubject = crossTab(filteredProgression, subjects, progressionStepOptions, (item) => item.entry.subject);
  const recentMappings = [...filteredProgression].sort((a, b) => b.entry.lastMappedDate.localeCompare(a.entry.lastMappedDate)).slice(0, 8);
  const elementsByStep = progressionStepOptions.map((step) => ({
    step,
    elements: Array.from(new Set(filteredProgression.filter((item) => item.descriptor.progressionStep === step).map((item) => item.descriptor.element))).slice(0, 10)
  }));

  function resetFilters() {
    setFramework(allValue);
    setSubject(allValue);
    setYearGroup(allValue);
    setProgressionStep(allValue);
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Progression Overview"
        eyebrow="Progression descriptor visibility"
        description="Show where mapped curriculum opportunities link to official framework progression descriptors."
        accent={areaThemes.overview.accent}
      />

      <section className="rounded-lg border border-[#e8cfe0] bg-[#f7edf3] p-4 text-sm font-semibold text-[#571435]">
        Use this view to compare mapped opportunities by year group, subject and the progression steps that exist in the official descriptor table.
      </section>

      <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-gray-500">Filters</h2>
          <button className="focus-ring btn btn-muted" type="button" onClick={resetFilters}>
            Reset filters
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SelectField label="Framework" value={framework} onChange={setFramework} options={[allValue, ...frameworkLibrary.map((item) => item.name)]} />
          <SelectField label="Subject" value={subject} onChange={setSubject} options={[allValue, ...subjects]} />
          <SelectField label="Year group" value={yearGroup} onChange={setYearGroup} options={[allValue, ...yearGroups]} />
          <SelectField label="Progression step" value={progressionStep} onChange={setProgressionStep} options={[allValue, ...progressionStepOptions]} />
        </div>
      </article>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Mapped opportunities" value={String(filteredProgression.length)} note="Framework links represented in planning." />
        <Metric label="Subjects represented" value={String(new Set(filteredProgression.map((item) => item.entry.subject)).size)} note="Subjects with mapped opportunities." />
        <Metric label="Year groups represented" value={String(new Set(filteredProgression.map((item) => item.entry.year)).size)} note="Year groups visible in current filters." />
        <Metric label="Official descriptors represented" value={String(new Set(filteredProgression.map((item) => item.descriptor.id)).size)} note="Progression descriptor rows linked by mappings." />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link className="focus-ring btn btn-primary" href="/add-entry">
          Add mapping entry
        </Link>
        <Link className="focus-ring btn btn-secondary" href="/curriculum-explorer">
          Explore matching mappings
        </Link>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Matrix title="Mapped opportunities by subject and progression step" rows={bySubject.slice(0, 12)} columns={progressionStepOptions} />
        <Matrix title="Mapped opportunities by year group and progression step" rows={byYear} columns={progressionStepOptions} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Recent mappings with official progression descriptors</h2>
          <div className="mt-4 space-y-3">
            {!recentMappings.length ? <p className="rounded-md bg-gray-50 p-4 text-sm text-gray-600">No curriculum mapping entries have been created yet.</p> : null}
            {recentMappings.map(({ entry, descriptor }) => {
              const theme = themeForFramework(descriptor.framework);
              return (
                <div key={`${entry.id}-${descriptor.id}`} className="rounded-md border p-4" style={{ borderColor: theme.border }}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-gray-950">{entry.unit}</h3>
                      <p className="mt-1 text-sm text-gray-600">
                        {entry.subject} · {entry.year} · {descriptor.framework}
                      </p>
                    </div>
                    <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: theme.soft, color: theme.text }}>
                      {descriptor.progressionStep}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-gray-800">
                    {descriptor.strand} · {descriptor.element}
                  </p>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-700">{descriptor.descriptorText}</p>
                </div>
              );
            })}
          </div>
        </article>

        <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Elements represented by official progression step</h2>
          <div className="mt-4 space-y-4">
            {elementsByStep.map((row) => (
              <div key={row.step} className="rounded-md bg-gray-50 p-4">
                <h3 className="font-bold text-gray-950">{row.step}</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {row.elements.map((element) => (
                    <span key={element} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#571435]">
                      {element}
                    </span>
                  ))}
                  {!row.elements.length ? <span className="text-sm text-gray-600">Review suggested when mapped opportunities are added.</span> : null}
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label>
      <span className="mb-1 block text-sm font-semibold text-gray-700">{label}</span>
      <select className="focus-ring w-full rounded-md border border-gray-300 bg-white px-3 py-2" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-gray-500">{label}</p>
      <p className="mt-3 text-3xl font-bold text-[#741B47]">{value}</p>
      <p className="mt-2 text-sm leading-6 text-gray-600">{note}</p>
    </article>
  );
}

function Matrix({ title, rows, columns }: { title: string; rows: { label: string; values: Record<string, number> }[]; columns: string[] }) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      <div className="mt-4 space-y-3">
        {rows.map((row) => {
          const total = columns.reduce((sum, reference) => sum + (row.values[reference] ?? 0), 0);
          return (
            <div key={row.label} className="rounded-md border border-gray-100 bg-gray-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold text-gray-950">{row.label}</h3>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-600">{total} mapped opportunities</span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {columns.map((reference) => {
                  const value = row.values[reference] ?? 0;
                  const percentage = total ? Math.max((value / total) * 100, value ? 8 : 0) : 0;
                  return (
                    <div key={reference} className="rounded-md bg-white px-3 py-2">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-semibold text-gray-600">{reference}</span>
                        <span className="font-bold text-[#741B47]">{value}</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full bg-[#741B47]" style={{ width: `${percentage}%`, opacity: value ? 0.9 : 0.18 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function crossTab(entries: MappedProgressionOpportunity[], rowLabels: string[], columnLabels: string[], rowForEntry: (entry: MappedProgressionOpportunity) => string) {
  return rowLabels.map((label) => ({
    label,
    values: Object.fromEntries(columnLabels.map((column) => [column, entries.filter((entry) => rowForEntry(entry) === label && entry.descriptor.progressionStep === column).length]))
  }));
}

type ProgressionDescriptorRow = {
  id: string;
  frameworkId?: string;
  framework: string;
  frameworkShortName: string;
  strandId?: string;
  strand: string;
  strandShortName?: string | null;
  elementId?: string;
  element: string;
  progressionStep: ProgressionStep;
  progressionStepNumber: number;
  descriptorText: string;
};

type MappedProgressionOpportunity = {
  entry: MappingEntry;
  descriptor: ProgressionDescriptorRow;
  notes?: string;
};

function flattenProgressionDescriptors(frameworks: FrameworkDefinition[]): ProgressionDescriptorRow[] {
  return frameworks.flatMap((framework) =>
    framework.strands.flatMap((strand) =>
      strand.elements.flatMap((element) =>
        (element.progressionDescriptorRefs ?? [])
          .filter((descriptor) => descriptor.descriptorText.trim())
          .map((descriptor) => ({
            id: descriptor.id,
            frameworkId: framework.id,
            framework: framework.name,
            frameworkShortName: framework.shortName,
            strandId: strand.id,
            strand: strand.name,
            strandShortName: strand.shortName,
            elementId: element.id,
            element: element.name,
            progressionStep: descriptor.progressionStep,
            progressionStepNumber: descriptor.progressionStepNumber,
            descriptorText: descriptor.descriptorText
          }))
      )
    )
  );
}

function expandMappedProgression(entries: MappingEntry[], descriptors: ProgressionDescriptorRow[]): MappedProgressionOpportunity[] {
  const descriptorsById = new Map(descriptors.map((descriptor) => [descriptor.id, descriptor]));
  const descriptorsByElementAndStep = new Map(descriptors.map((descriptor) => [elementStepKey(descriptor.elementId, descriptor.progressionStepNumber), descriptor]));

  return entries.flatMap((entry) => {
    const opportunities: MappedProgressionOpportunity[] = [];

    for (const reference of frameworkReferencesForEntry(entry)) {
      const descriptor =
        (reference.progressionDescriptorId ? descriptorsById.get(reference.progressionDescriptorId) : undefined) ??
        descriptorsByElementAndStep.get(elementStepKey(reference.elementId, reference.progressionStep ?? stepNumberFromReference(reference.progressionReference)));

      if (descriptor) opportunities.push({ entry, descriptor, notes: reference.notes });
    }

    return opportunities;
  });
}

function frameworkReferencesForEntry(entry: MappingEntry): MappingFrameworkReference[] {
  if (entry.frameworkReferences?.length) return entry.frameworkReferences;

  if (!entry.frameworkId || !entry.strandId || !entry.elementId) return [];

  return [
    {
      frameworkId: entry.frameworkId,
      strandId: entry.strandId,
      elementId: entry.elementId,
      progressionDescriptorId: entry.progressionDescriptorId,
      progressionStep: stepNumberFromReference(entry.progressionReference),
      framework: entry.framework,
      strand: entry.strand,
      element: entry.element,
      progressionReference: entry.progressionReference
    }
  ];
}

function elementStepKey(elementId: string | undefined, progressionStep: number | null | undefined) {
  return `${elementId ?? ""}::${progressionStep ?? ""}`;
}

function stepNumberFromReference(reference: string | undefined) {
  const value = Number(reference?.replace("Step ", ""));
  return Number.isFinite(value) ? value : null;
}

function compareProgressionSteps(a: string, b: string) {
  return (stepNumberFromReference(a) ?? 0) - (stepNumberFromReference(b) ?? 0);
}
