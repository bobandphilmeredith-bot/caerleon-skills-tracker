"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { useCurrentSchoolData } from "@/lib/currentSchool";
import { progressionReferenceForEntry, secondaryProgressionReferences, visibleProgressionSteps } from "@/lib/progression";
import { areaThemes, themeForFramework } from "@/lib/theme";

const allValue = "All";

export default function ProgressionOverviewPage() {
  const { frameworkLibrary, mappings, subjects, yearGroups } = useCurrentSchoolData();
  const [framework, setFramework] = useState(allValue);
  const [subject, setSubject] = useState(allValue);
  const [yearGroup, setYearGroup] = useState(allValue);
  const [progressionReference, setProgressionReference] = useState(allValue);

  const filteredMappings = useMemo(
    () =>
      mappings.filter((entry) => {
        const reference = progressionReferenceForEntry(entry);
        return (
          (framework === allValue || entry.framework === framework) &&
          (subject === allValue || entry.subject === subject) &&
          (yearGroup === allValue || entry.year === yearGroup) &&
          (progressionReference === allValue || reference === progressionReference)
        );
      }),
    [framework, mappings, progressionReference, subject, yearGroup]
  );

  const byYear = crossTab(filteredMappings, yearGroups, secondaryProgressionReferences, (entry) => entry.year);
  const bySubject = crossTab(filteredMappings, subjects, secondaryProgressionReferences, (entry) => entry.subject);
  const recentMappings = [...filteredMappings].sort((a, b) => b.lastMappedDate.localeCompare(a.lastMappedDate)).slice(0, 8);
  const elementsByStep = visibleProgressionSteps.map((step) => ({
    step,
    elements: Array.from(new Set(filteredMappings.filter((entry) => progressionReferenceForEntry(entry) === step).map((entry) => entry.element))).slice(0, 10)
  }));

  function resetFilters() {
    setFramework(allValue);
    setSubject(allValue);
    setYearGroup(allValue);
    setProgressionReference(allValue);
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Progression Overview"
        eyebrow="Progression reference visibility"
        description="Show where mapped curriculum opportunities sit in relation to framework progression references."
        accent={areaThemes.overview.accent}
      />

      <section className="rounded-lg border border-[#e8cfe0] bg-[#f7edf3] p-4 text-sm font-semibold text-[#571435]">
        Use this view to compare mapped opportunities by year group, subject and progression reference.
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
          <SelectField label="Progression step" value={progressionReference} onChange={setProgressionReference} options={[allValue, ...secondaryProgressionReferences]} />
        </div>
      </article>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Mapped opportunities" value={String(filteredMappings.length)} note="Entries represented in planning." />
        <Metric label="Subjects represented" value={String(new Set(filteredMappings.map((entry) => entry.subject)).size)} note="Subjects with mapped opportunities." />
        <Metric label="Year groups represented" value={String(new Set(filteredMappings.map((entry) => entry.year)).size)} note="Year groups visible in current filters." />
        <Metric label="Elements represented" value={String(new Set(filteredMappings.map((entry) => entry.element)).size)} note="Framework elements visible in planning." />
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
        <Matrix title="Mapped opportunities by year group and progression reference" rows={byYear} />
        <Matrix title="Mapped opportunities by subject and progression reference" rows={bySubject.slice(0, 12)} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Recent mappings with progression reference</h2>
          <div className="mt-4 space-y-3">
            {recentMappings.map((entry) => {
              const theme = themeForFramework(entry.framework);
              return (
                <div key={entry.id} className="rounded-md border p-4" style={{ borderColor: theme.border }}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-gray-950">{entry.unit}</h3>
                      <p className="mt-1 text-sm text-gray-600">
                        {entry.subject} · {entry.year} · {entry.framework}
                      </p>
                    </div>
                    <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: theme.soft, color: theme.text }}>
                      Progression reference: {progressionReferenceForEntry(entry)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-gray-700">{entry.activityDescription}</p>
                </div>
              );
            })}
          </div>
        </article>

        <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Elements represented at Step 3, Step 4 and Step 5</h2>
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

function Matrix({ title, rows }: { title: string; rows: { label: string; values: Record<string, number> }[] }) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      <div className="mt-4 space-y-3">
        {rows.map((row) => {
          const total = secondaryProgressionReferences.reduce((sum, reference) => sum + (row.values[reference] ?? 0), 0);
          return (
            <div key={row.label} className="rounded-md border border-gray-100 bg-gray-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold text-gray-950">{row.label}</h3>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-600">{total} mapped opportunities</span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {secondaryProgressionReferences.map((reference) => {
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

function crossTab(entries: ReturnType<typeof useCurrentSchoolData>["mappings"], rowLabels: string[], columnLabels: string[], rowForEntry: (entry: ReturnType<typeof useCurrentSchoolData>["mappings"][number]) => string) {
  return rowLabels.map((label) => ({
    label,
    values: Object.fromEntries(columnLabels.map((column) => [column, entries.filter((entry) => rowForEntry(entry) === label && progressionReferenceForEntry(entry) === column).length]))
  }));
}
