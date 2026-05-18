"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useCurrentSchoolData } from "@/lib/currentSchool";
import { getRelatedSuggestions } from "@/lib/curriculumOutputs";
import { progressionReferenceForEntry, progressionSummary } from "@/lib/progression";
import { areaThemes, themeForFramework } from "@/lib/theme";
import type { MappingEntry } from "@/lib/types";

export function SubjectDetailPageClient({ subjectName }: { subjectName: string }) {
  const { mappings, subjectAoleMap, subjectDetails, subjects, yearGroups } = useCurrentSchoolData();
  const subject = subjects.includes(subjectName) ? subjectName : subjects[0];
  const detail = subjectDetails[subject];
  const [query, setQuery] = useState("");
  const [selectedMapping, setSelectedMapping] = useState<MappingEntry | null>(null);
  const subjectMappings = useMemo(() => mappings.filter((entry) => entry.subject === subject), [subject]);
  const filteredMappings = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return subjectMappings;
    return subjectMappings.filter((entry) => [entry.year, entry.term, entry.framework, entry.strand, entry.element, entry.unit, entry.activityDescription, entry.schemeReference].join(" ").toLowerCase().includes(term));
  }, [query, subjectMappings]);
  const strandTotals = countBy(subjectMappings.map((entry) => entry.strand));
  const elementTotals = countBy(subjectMappings.map((entry) => entry.element));
  const progressionTotals = progressionSummary(subjectMappings);
  const recent = [...subjectMappings].sort((a, b) => b.lastMappedDate.localeCompare(a.lastMappedDate)).slice(0, 5);

  return (
    <section className="space-y-6">
      <PageHeader
        title={`${subject} Detail`}
        eyebrow="Subject curriculum dashboard"
        description="A subject-first view of mapped opportunities, recent curriculum activity, scheme references and curriculum connections."
        accent={areaThemes.overview.accent}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link className="focus-ring btn btn-secondary" href="/subject-overview">
          Back to Subject Overview
        </Link>
        <span className="rounded-full border border-[#e8cfe0] bg-[#f7edf3] px-3 py-2 text-sm font-bold text-[#571435]">AoLE: {subjectAoleMap[subject] ?? "Not set"}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Mapped opportunities" value={String(detail.total)} note="Subject curriculum entries currently visible." />
        <Metric label="Frameworks represented" value={String(Object.values(detail.byFramework).filter(Boolean).length)} note="Literacy, Numeracy, DCF and themes." />
        <Metric label="Scheme references" value={String(detail.schemes.length)} note="Schemes linked to this subject." />
        <Metric label="Review suggested" value={detail.lastReviewedDate} note="Curriculum review date for planning visibility." />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Mappings by Year Group">
          <BarList values={Object.fromEntries(yearGroups.map((year) => [year, detail.byYearGroup[year] ?? 0]))} />
        </Panel>
        <Panel title="Mappings by Framework">
          <BarList values={detail.byFramework} frameworkColours />
        </Panel>
      </div>

      <Panel title="Progression Reference Summary">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Step 3" value={String(progressionTotals["Step 3"])} note="Mapped opportunities using this progression reference." />
          <Metric label="Step 4" value={String(progressionTotals["Step 4"])} note="Mapped opportunities using this progression reference." />
          <Metric label="Step 5" value={String(progressionTotals["Step 5"])} note="Mapped opportunities using this progression reference." />
          <Metric label="Step 3–4 / 4–5" value={String(progressionTotals.Bridging)} note="Mapped opportunities using combined progression references." />
        </div>
      </Panel>

      <Panel title="Curriculum Journey Timeline">
        <div className="overflow-x-auto pb-2">
          <div className="grid min-w-[980px] grid-cols-5 gap-3">
            {yearGroups.map((year) => {
              const entries = subjectMappings.filter((entry) => entry.year === year).sort(sortBySchoolYearOrder).slice(0, 3);
              return (
                <div key={year} className="rounded-lg border border-gray-200 p-3">
                  <h3 className="text-lg font-bold text-gray-900">{year}</h3>
                  <div className="mt-3 space-y-2">
                    {entries.map((entry) => (
                      <MappingTimelineCard key={entry.id} entry={entry} onOpen={() => setSelectedMapping(entry)} />
                    ))}
                    {!entries.length ? <p className="rounded-md bg-gray-50 p-4 text-sm text-gray-600">Review suggested when entries are added.</p> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-3">
        <Panel title="Mapped Strands">
          <PillTotals values={strandTotals} />
        </Panel>
        <Panel title="Mapped Elements">
          <PillTotals values={elementTotals} />
        </Panel>
        <Panel title="Also Linked To">
          <div className="flex flex-wrap gap-2">
            {Array.from(new Set(subjectMappings.flatMap((entry) => getRelatedSuggestions(entry)))).slice(0, 10).map((item) => (
              <span key={item} className="rounded-full bg-[#f7edf3] px-3 py-1 text-xs font-semibold text-[#571435]">
                {item}
              </span>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Recent Curriculum Activity">
        <div className="space-y-3">
          {recent.map((entry) => (
            <div key={entry.id} className="rounded-md border border-gray-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-gray-950">{entry.unit}</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    {entry.year} · {entry.term} · {entry.schemeReference}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-gray-500">Progression reference: {progressionReferenceForEntry(entry)}</p>
                </div>
                <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: themeForFramework(entry.framework).soft, color: themeForFramework(entry.framework).text }}>
                  {entry.framework === "Digital Competence Framework" ? "DCF" : entry.framework}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-gray-700">{entry.activityDescription}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Searchable Mapping List">
        <input className="focus-ring mb-4 w-full rounded-md border border-gray-300 px-3 py-2" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this subject's mapped opportunities" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="py-3 pr-4 font-bold">Year</th>
                <th className="py-3 pr-4 font-bold">Framework</th>
                <th className="py-3 pr-4 font-bold">Strand</th>
                <th className="py-3 pr-4 font-bold">Element</th>
                <th className="py-3 pr-4 font-bold">Progression reference</th>
                <th className="py-3 pr-4 font-bold">Scheme</th>
                <th className="py-3 pr-4 font-bold">Last mapped</th>
              </tr>
            </thead>
            <tbody>
              {filteredMappings.map((entry) => (
                <tr key={entry.id} className="border-b border-gray-100">
                  <td className="py-3 pr-4 font-semibold text-gray-900">{entry.year}</td>
                  <td className="py-3 pr-4 text-gray-700">{entry.framework}</td>
                  <td className="py-3 pr-4 text-gray-700">{entry.strand}</td>
                  <td className="py-3 pr-4 text-gray-700">{entry.element}</td>
                  <td className="py-3 pr-4 text-gray-700">{progressionReferenceForEntry(entry)}</td>
                  <td className="py-3 pr-4 text-gray-700">{entry.schemeReference}</td>
                  <td className="py-3 pr-4 text-gray-700">{entry.lastMappedDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {selectedMapping ? <MappingDetailModal entry={selectedMapping} onClose={() => setSelectedMapping(null)} /> : null}
    </section>
  );
}

function MappingTimelineCard({ entry, onOpen }: { entry: MappingEntry; onOpen: () => void }) {
  const theme = themeForFramework(entry.framework);
  return (
    <button
      className="focus-ring w-full rounded-md px-3 py-3 text-left transition hover:shadow-sm"
      style={{ backgroundColor: theme.soft }}
      type="button"
      onClick={onOpen}
      aria-label={`View details for ${entry.unit}, ${entry.term}, ${entry.schemeReference}`}
    >
      <p className="text-xs font-bold leading-4 text-gray-950">{entry.unit}</p>
      <p className="mt-2 text-xs leading-4 text-gray-600">
        {entry.term} · {entry.schemeReference}
      </p>
      <p className="mt-2 text-xs font-bold leading-4 text-gray-700">Progression reference:</p>
      <p className="mt-1 text-xs font-bold leading-4 text-gray-700">{progressionReferenceForEntry(entry)}</p>
    </button>
  );
}

function MappingDetailModal({ entry, onClose }: { entry: MappingEntry; onClose: () => void }) {
  const theme = themeForFramework(entry.framework);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 px-4 py-6" role="dialog" aria-modal="true">
      <div className="max-h-[86vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-5 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 pb-4">
          <div>
            <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: theme.soft, color: theme.text, border: `1px solid ${theme.border}` }}>
              {frameworkLabel(entry.framework)}
            </span>
            <h2 className="mt-3 text-2xl font-bold text-gray-950">{entry.unit}</h2>
            <p className="mt-1 text-sm font-semibold text-gray-600">
              {entry.year} · {entry.term} · Progression reference: {progressionReferenceForEntry(entry)}
            </p>
          </div>
          <button className="focus-ring btn btn-muted" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
          <DetailRow label="Framework" value={frameworkLabel(entry.framework)} />
          <DetailRow label="Strand" value={entry.strand} />
          <DetailRow label="Element" value={entry.element} />
          <DetailRow label="Progression reference" value={progressionReferenceForEntry(entry)} />
          <DetailRow label="Scheme of work reference" value={entry.schemeReference} />
        </dl>

        <div className="mt-5 rounded-md border p-4" style={{ borderColor: theme.border, backgroundColor: theme.soft }}>
          <h3 className="text-sm font-bold text-gray-950">Description of task</h3>
          <p className="mt-2 text-sm leading-6 text-gray-700">{entry.activityDescription}</p>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">{label}</dt>
      <dd className="mt-1 font-semibold text-gray-900">{value}</dd>
    </div>
  );
}

function frameworkLabel(framework: string) {
  return framework === "Digital Competence Framework" ? "DCF" : framework;
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

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </article>
  );
}

function BarList({ values, frameworkColours = false }: { values: Record<string, number>; frameworkColours?: boolean }) {
  const max = Math.max(...Object.values(values), 1);
  return (
    <div className="space-y-3">
      {Object.entries(values).map(([label, value]) => {
        const theme = frameworkColours ? themeForFramework(label === "DCF" ? "Digital Competence Framework" : label) : areaThemes.overview;
        return (
          <div key={label}>
            <div className="flex justify-between gap-3 text-sm">
              <span className="font-semibold text-gray-700">{label}</span>
              <span className="font-bold" style={{ color: theme.accent }}>
                {value}
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full" style={{ width: `${(value / max) * 100}%`, backgroundColor: theme.accent }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PillTotals({ values }: { values: Record<string, number> }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(values)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([label, value]) => (
          <span key={label} className="rounded-full bg-[#f7edf3] px-3 py-1 text-xs font-semibold text-[#571435]">
            {label} · {value}
          </span>
        ))}
    </div>
  );
}

function countBy(items: string[]) {
  return items.reduce<Record<string, number>>((totals, item) => {
    totals[item] = (totals[item] ?? 0) + 1;
    return totals;
  }, {});
}

function sortBySchoolYearOrder(a: MappingEntry, b: MappingEntry) {
  const termOrder: Record<string, number> = { Autumn: 0, Spring: 1, Summer: 2 };
  const termDifference = (termOrder[a.term] ?? 99) - (termOrder[b.term] ?? 99);
  if (termDifference) return termDifference;
  const schemeDifference = a.schemeReference.localeCompare(b.schemeReference);
  if (schemeDifference) return schemeDifference;
  return a.lastMappedDate.localeCompare(b.lastMappedDate);
}
