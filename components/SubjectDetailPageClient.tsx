"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useCurrentSchoolData } from "@/lib/currentSchool";
import { frameworkReferenceText, frameworkShortLabel, matchingFrameworkReferences } from "@/lib/mappingFrameworks";
import { areaThemes, themeForFramework } from "@/lib/theme";
import type { MappingEntry, MappingFrameworkReference } from "@/lib/types";

const allValue = "All";
const yearOrder = ["Year 7", "Year 8", "Year 9", "Year 10", "Year 11"];
const evidenceTypes = [allValue, "Literacy", "Numeracy", "DCF", "CCT"];

export function SubjectDetailPageClient({ subjectName }: { subjectName: string }) {
  const { mappings, subjectAoleMap, subjects } = useCurrentSchoolData();
  const subject = subjects.includes(subjectName) ? subjectName : subjects[0] ?? subjectName;
  const [yearFilter, setYearFilter] = useState(allValue);
  const [termFilter, setTermFilter] = useState(allValue);
  const [evidenceFilter, setEvidenceFilter] = useState(allValue);
  const [query, setQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const subjectMappings = useMemo(() => mappings.filter((entry) => entry.subject === subject).sort(compareMappings), [mappings, subject]);
  const termOptions = useMemo(() => unique(subjectMappings.map((entry) => entry.term)).sort(compareTerms), [subjectMappings]);
  const filteredMappings = useMemo(
    () =>
      subjectMappings.filter((entry) => {
        if (yearFilter !== allValue && entry.year !== yearFilter) return false;
        if (termFilter !== allValue && entry.term !== termFilter) return false;
        if (evidenceFilter !== allValue && !matchesEvidenceType(entry, evidenceFilter)) return false;
        const search = query.trim().toLowerCase();
        if (!search) return true;
        return searchableText(entry).includes(search);
      }),
    [evidenceFilter, query, subjectMappings, termFilter, yearFilter]
  );
  const groupedMappings = useMemo(() => groupByYear(filteredMappings), [filteredMappings]);
  const frameworkLinks = subjectMappings.flatMap((entry) => matchingFrameworkReferences(entry));
  const cctLinks = subjectMappings.flatMap((entry) => themeItems(entry)).filter((item) => item.element || item.theme);
  const progressionCounts = countProgressionSteps(frameworkLinks);
  const gaps = buildGapChecks(subjectMappings);

  function toggleExpanded(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title={`${subject} Curriculum Journey`}
        eyebrow="Subject Curriculum"
        description="Review mapped schemes of learning, skills coverage and cross-cutting theme evidence for this subject."
        accent={areaThemes.overview.accent}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link className="focus-ring btn btn-secondary" href="/subject-overview">
          Back to Subject Detail
        </Link>
        <span className="rounded-full border px-3 py-2 text-sm font-bold" style={{ borderColor: areaThemes.overview.border, backgroundColor: areaThemes.overview.soft, color: areaThemes.overview.text }}>
          AoLE: {subjectAoleMap[subject] ?? "Not set"}
        </span>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Curriculum entries" value={subjectMappings.length} note="Parent curriculum mappings for this subject." />
        <SummaryCard label="Schemes mapped" value={unique(subjectMappings.map((entry) => entry.schemeReference)).length} note="Unique scheme or unit references." />
        <SummaryCard label="Skill references" value={frameworkLinks.length} note="Literacy, Numeracy and DCF links." />
        <SummaryCard label="Theme elements" value={cctLinks.filter((item) => item.element).length} note="Cross-cutting theme element links." />
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-4">
          <FilterSelect label="Year group" value={yearFilter} options={[allValue, ...yearOrder]} onChange={setYearFilter} />
          <FilterSelect label="Term" value={termFilter} options={[allValue, ...termOptions]} onChange={setTermFilter} />
          <FilterSelect label="Evidence type" value={evidenceFilter} options={evidenceTypes} onChange={setEvidenceFilter} />
          <label>
            <span className="mb-1 block text-sm font-bold text-gray-700">Keyword search</span>
            <input className="focus-ring w-full rounded-md border border-gray-300 px-3 py-2" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search schemes, descriptions, skills or themes" />
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-gray-950">Skills Progression Summary</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[3, 4, 5].map((step) => (
            <SummaryCard key={step} label={`Step ${step}`} value={progressionCounts[step] ?? 0} note="Skill references mapped at this step." />
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-gray-950">Mapping Gaps and Checks</h2>
        <div className="mt-3 space-y-2">
          {gaps.length ? gaps.map((gap) => <p key={gap} className="rounded-md bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700">{gap}</p>) : <p className="rounded-md bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700">No urgent mapping gaps found for this subject.</p>}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-950">Curriculum Journey by Scheme</h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">Entries are grouped by year group and sorted by scheme reference.</p>
          </div>
          <Link className="focus-ring btn btn-primary" href="/add-entry">
            Add Curriculum
          </Link>
        </div>

        {!subjectMappings.length ? (
          <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-600">No curriculum mappings found for this subject yet.</p>
            <Link className="focus-ring btn btn-primary mt-4 inline-flex" href="/add-entry">
              Add Curriculum
            </Link>
          </article>
        ) : null}

        {subjectMappings.length && !filteredMappings.length ? <p className="rounded-lg border border-gray-200 bg-white p-5 text-sm font-semibold text-gray-600 shadow-sm">No mappings match the current filters.</p> : null}

        {groupedMappings.map((group) => (
          <article key={group.year} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-950">{group.year}</h3>
              <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: areaThemes.overview.soft, color: areaThemes.overview.text }}>
                {group.entries.length} mapped {group.entries.length === 1 ? "entry" : "entries"}
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {group.entries.map((entry) => {
                const expanded = expandedIds.has(entry.id);
                return <MappingCard key={entry.id} entry={entry} expanded={expanded} onToggle={() => toggleExpanded(entry.id)} />;
              })}
            </div>
          </article>
        ))}
      </section>
    </section>
  );
}

function MappingCard({ entry, expanded, onToggle }: { entry: MappingEntry; expanded: boolean; onToggle: () => void }) {
  const skillSummary = summariseFrameworks(entry);
  const themeSummary = summariseThemes(entry);
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md px-2 py-1 text-xs font-bold" style={{ backgroundColor: areaThemes.overview.soft, color: areaThemes.overview.text }}>
              {entry.schemeReference || "No scheme reference"}
            </span>
            <span className="text-sm font-semibold text-gray-500">{entry.year} · {entry.term}</span>
          </div>
          <h4 className="mt-2 text-lg font-bold text-gray-950">{entry.unit || entry.context || "Untitled mapping"}</h4>
          {entry.activityDescription ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">{entry.activityDescription}</p> : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button className="focus-ring btn btn-muted text-xs" type="button" onClick={onToggle}>
            {expanded ? "Hide details" : "View details"}
          </button>
          <Link className="focus-ring btn btn-secondary text-xs" href={`/edit-curriculum/${entry.id}`}>
            Edit mapping
          </Link>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <CompactSummary title="Skills" items={skillSummary} empty="No skill references mapped." />
        <CompactSummary title="Themes" items={themeSummary} empty="No theme elements mapped." />
      </div>

      {expanded ? (
        <div className="mt-4 grid gap-4 border-t border-gray-100 pt-4 lg:grid-cols-2">
          <GroupedSkills references={matchingFrameworkReferences(entry)} />
          <GroupedThemes entry={entry} />
          <NotesList entry={entry} />
          <div className="lg:col-span-2">
            <Link className="focus-ring btn btn-secondary text-xs" href={`/edit-curriculum/${entry.id}`}>
              Edit mapping
            </Link>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function GroupedSkills({ references }: { references: MappingFrameworkReference[] }) {
  const groups = groupBy(references, (reference) => frameworkShortLabel(reference.frameworkShortName ?? reference.framework));
  return (
    <div>
      <h5 className="text-sm font-bold text-gray-950">Skills mapped</h5>
      {!references.length ? <p className="mt-2 text-sm text-gray-600">No skill references mapped.</p> : null}
      <div className="mt-2 space-y-3">
        {Object.entries(groups).map(([framework, refs]) => (
          <div key={framework}>
            <p className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: themeForFramework(framework).text }}>{framework}</p>
            <ul className="mt-1 space-y-1 text-sm leading-6 text-gray-700">
              {refs.map((reference) => (
                <li key={`${reference.frameworkId}-${reference.strandId}-${reference.elementId}-${reference.progressionDescriptorId ?? reference.progressionReference}`}>{frameworkReferenceText(reference)}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function GroupedThemes({ entry }: { entry: MappingEntry }) {
  const items = themeItems(entry);
  const groups = groupBy(items, (item) => item.theme);
  return (
    <div>
      <h5 className="text-sm font-bold text-gray-950">Cross-cutting theme elements</h5>
      {!items.length ? <p className="mt-2 text-sm text-gray-600">No theme elements mapped.</p> : null}
      <div className="mt-2 space-y-3">
        {Object.entries(groups).map(([theme, themeItems]) => (
          <div key={theme}>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">{theme}</p>
            <ul className="mt-1 space-y-1 text-sm leading-6 text-gray-700">
              {themeItems.map((item) => <li key={`${item.theme}-${item.element}`}>{item.element ? `${item.theme} → ${item.element}` : `${item.theme} (legacy broad theme)`}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function NotesList({ entry }: { entry: MappingEntry }) {
  const notes = unique([
    ...matchingFrameworkReferences(entry).map((reference) => reference.notes ?? ""),
    entry.crossCuttingThemeNotes ?? "",
    entry.note ?? ""
  ]);
  if (!notes.length) return null;
  return (
    <div className="lg:col-span-2">
      <h5 className="text-sm font-bold text-gray-950">Notes</h5>
      <ul className="mt-2 space-y-1 text-sm leading-6 text-gray-700">
        {notes.map((note) => <li key={note}>{note}</li>)}
      </ul>
    </div>
  );
}

function CompactSummary({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
      <span className="block text-xs font-bold uppercase tracking-[0.12em] text-gray-500">{title}</span>
      {items.length ? <span className="mt-1 block font-semibold text-gray-800">{items.join(" · ")}</span> : <span className="mt-1 block font-semibold text-gray-600">{empty}</span>}
    </div>
  );
}

function SummaryCard({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-gray-500">{label}</p>
      <p className="mt-3 text-3xl font-bold" style={{ color: areaThemes.overview.accent }}>{value}</p>
      <p className="mt-2 text-sm leading-6 text-gray-600">{note}</p>
    </article>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="mb-1 block text-sm font-bold text-gray-700">{label}</span>
      <select className="focus-ring w-full rounded-md border border-gray-300 bg-white px-3 py-2" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function groupByYear(entries: MappingEntry[]) {
  return yearOrder
    .map((year) => ({ year, entries: entries.filter((entry) => entry.year === year).sort(compareMappings) }))
    .filter((group) => group.entries.length > 0);
}

function compareMappings(a: MappingEntry, b: MappingEntry) {
  const yearDiff = yearNumber(a.year) - yearNumber(b.year);
  if (yearDiff) return yearDiff;
  const schemeDiff = compareSchemeReference(a.schemeReference, b.schemeReference);
  if (schemeDiff) return schemeDiff;
  return (a.unit || a.context).localeCompare(b.unit || b.context);
}

function compareSchemeReference(a: string, b: string) {
  const aParts = numericParts(a);
  const bParts = numericParts(b);
  if (aParts.length && !bParts.length) return -1;
  if (!aParts.length && bParts.length) return 1;
  for (let index = 0; index < Math.max(aParts.length, bParts.length); index += 1) {
    const diff = (aParts[index] ?? -1) - (bParts[index] ?? -1);
    if (diff) return diff;
  }
  return a.localeCompare(b);
}

function numericParts(value: string) {
  return (value.match(/\d+/g) ?? []).map(Number);
}

function yearNumber(value: string) {
  return Number(value.match(/\d+/)?.[0] ?? 99);
}

function compareTerms(a: string, b: string) {
  const order = ["Autumn", "Spring", "Summer"];
  return (order.indexOf(a) === -1 ? order.length : order.indexOf(a)) - (order.indexOf(b) === -1 ? order.length : order.indexOf(b)) || a.localeCompare(b);
}

function summariseFrameworks(entry: MappingEntry) {
  const counts = countBy(matchingFrameworkReferences(entry).map((reference) => frameworkShortLabel(reference.frameworkShortName ?? reference.framework)));
  return Object.entries(counts).map(([label, count]) => `${label} ${count}`);
}

function summariseThemes(entry: MappingEntry) {
  const counts = countBy(themeItems(entry).map((item) => item.theme));
  return Object.entries(counts).map(([label, count]) => `${label} ${count}`);
}

function themeItems(entry: MappingEntry) {
  return (entry.crossCuttingThemes ?? []).map((label) => {
    const [theme, ...elementParts] = label.split(":");
    return { theme: theme.trim(), element: elementParts.join(":").trim() };
  }).filter((item) => item.theme);
}

function countProgressionSteps(references: MappingFrameworkReference[]) {
  return references.reduce<Record<number, number>>((totals, reference) => {
    const step = reference.progressionStep ?? progressionNumber(reference.progressionReference);
    if (step === 3 || step === 4 || step === 5) totals[step] = (totals[step] ?? 0) + 1;
    return totals;
  }, { 3: 0, 4: 0, 5: 0 });
}

function progressionNumber(value: string | undefined) {
  const match = value?.match(/Step\s+(\d+)/i);
  return match ? Number(match[1]) : null;
}

function matchesEvidenceType(entry: MappingEntry, evidenceType: string) {
  if (evidenceType === "CCT") return themeItems(entry).length > 0;
  return matchingFrameworkReferences(entry).some((reference) => frameworkShortLabel(reference.frameworkShortName ?? reference.framework) === evidenceType);
}

function searchableText(entry: MappingEntry) {
  return [
    entry.unit,
    entry.context,
    entry.activityDescription,
    entry.schemeReference,
    entry.term,
    entry.year,
    ...matchingFrameworkReferences(entry).flatMap((reference) => [reference.framework, reference.frameworkShortName ?? "", reference.strand, reference.strandShortName ?? "", reference.element, reference.notes ?? ""]),
    ...themeItems(entry).flatMap((item) => [item.theme, item.element]),
    entry.crossCuttingThemeNotes ?? ""
  ].join(" ").toLowerCase();
}

function buildGapChecks(entries: MappingEntry[]) {
  if (!entries.length) return ["No curriculum mappings found for this subject yet."];
  const gaps: string[] = [];
  for (const year of yearOrder) {
    if (!entries.some((entry) => entry.year === year)) gaps.push(`${year} has no curriculum mappings yet.`);
  }
  for (const entry of entries) {
    const title = entry.unit || entry.context || entry.schemeReference || "Untitled mapping";
    const refs = matchingFrameworkReferences(entry);
    const themes = themeItems(entry);
    if (!refs.length) gaps.push(`${title} has no skill references mapped.`);
    if (!themes.length) gaps.push(`${title} has no CCT theme elements mapped.`);
    if (refs.length && !refs.some((reference) => frameworkShortLabel(reference.frameworkShortName ?? reference.framework) === "DCF")) gaps.push(`${title} has no DCF references mapped.`);
  }
  return gaps.slice(0, 8);
}

function groupBy<T>(items: T[], keyForItem: (item: T) => string) {
  return items.reduce<Record<string, T[]>>((groups, item) => {
    const key = keyForItem(item) || "Other";
    groups[key] = [...(groups[key] ?? []), item];
    return groups;
  }, {});
}

function countBy(items: string[]) {
  return items.reduce<Record<string, number>>((totals, item) => {
    if (!item) return totals;
    totals[item] = (totals[item] ?? 0) + 1;
    return totals;
  }, {});
}

function unique(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}
