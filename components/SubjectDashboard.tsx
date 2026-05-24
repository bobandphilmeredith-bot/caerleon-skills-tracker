"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useCurrentSchoolData } from "@/lib/currentSchool";
import { areaThemes, themeForFramework } from "@/lib/theme";
import type { MappingEntry, MappingFrameworkReference } from "@/lib/types";

const yearOrder = [
  { label: "Year 7", value: "Y7", number: 7 },
  { label: "Year 8", value: "Y8", number: 8 },
  { label: "Year 9", value: "Y9", number: 9 },
  { label: "Year 10", value: "Y10", number: 10 },
  { label: "Year 11", value: "Y11", number: 11 }
];

const frameworkFilters = ["All", "Literacy", "Numeracy", "DCF", "CCT"];

export function SubjectDashboard() {
  const { mappings, subjectAoleMap, subjects } = useCurrentSchoolData();
  const [subject, setSubject] = useState(subjects[0] ?? "");
  const [yearFilter, setYearFilter] = useState("All");
  const [termFilter, setTermFilter] = useState("All");
  const [frameworkFilter, setFrameworkFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const selectedSubject = subjects.includes(subject) ? subject : subjects[0] ?? "";
  const subjectMappings = useMemo(() => mappings.filter((entry) => entry.subject === selectedSubject), [mappings, selectedSubject]);
  const filteredMappings = useMemo(() => {
    const search = query.trim().toLowerCase();
    return subjectMappings.filter((entry) => {
      if (yearFilter !== "All" && yearNumber(entry.year) !== yearNumber(yearFilter)) return false;
      if (termFilter !== "All" && entry.term !== termFilter) return false;
      if (frameworkFilter !== "All" && !matchesFrameworkFilter(entry, frameworkFilter)) return false;
      if (!search) return true;
      return searchableText(entry).includes(search);
    });
  }, [frameworkFilter, query, subjectMappings, termFilter, yearFilter]);

  const groupedMappings = useMemo(
    () =>
      yearOrder.map((year) => ({
        ...year,
        entries: filteredMappings.filter((entry) => yearNumber(entry.year) === year.number).sort(sortMappings)
      })),
    [filteredMappings]
  );
  const schemeCount = new Set(subjectMappings.map((entry) => entry.schemeReference).filter(Boolean)).size;
  const skillLinkCount = subjectMappings.reduce((total, entry) => total + frameworkReferencesForEntry(entry).length, 0);
  const themeElementCount = subjectMappings.reduce((total, entry) => total + themeElementsForEntry(entry).length, 0);

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
        title="Subject Curriculum Journey"
        eyebrow="Subject Curriculum"
        description="Review this subject’s mapped schemes of learning, skills coverage and theme evidence."
        accent={areaThemes.overview.accent}
      />

      <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-[minmax(16rem,1.1fr)_minmax(12rem,0.8fr)_minmax(12rem,0.8fr)_minmax(12rem,0.8fr)]">
          <label>
            <span className="mb-1 block text-sm font-bold text-gray-700">Subject</span>
            <select
              className="focus-ring w-full rounded-md border border-gray-300 bg-white px-3 py-2"
              value={selectedSubject}
              onChange={(event) => setSubject(event.target.value)}
            >
              {subjects.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <span className="mt-2 block text-sm font-bold" style={{ color: areaThemes.overview.text }}>
              AoLE: {subjectAoleMap[selectedSubject] ?? "Not set"}
            </span>
          </label>

          <FilterSelect label="Year group" value={yearFilter} options={["All", ...yearOrder.map((year) => year.value)]} onChange={setYearFilter} />
          <FilterSelect label="Term" value={termFilter} options={["All", "Autumn", "Spring", "Summer"]} onChange={setTermFilter} />
          <FilterSelect label="Framework type" value={frameworkFilter} options={frameworkFilters} onChange={setFrameworkFilter} />
        </div>

        <label className="mt-4 block">
          <span className="mb-1 block text-sm font-bold text-gray-700">Keyword search</span>
          <input
            className="focus-ring w-full rounded-md border border-gray-300 px-3 py-2"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search titles, descriptions, scheme references, skills or themes"
          />
        </label>
      </article>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Mapped entries" value={subjectMappings.length} note="Curriculum mappings for this subject." />
        <SummaryCard label="Schemes referenced" value={schemeCount} note="Unique scheme or unit references." />
        <SummaryCard label="Skills links" value={skillLinkCount} note="Literacy, Numeracy and DCF references." />
        <SummaryCard label="Theme elements" value={themeElementCount} note="Mapped cross-cutting theme elements." />
      </div>

      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-950">Curriculum journey</h2>
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

        {subjectMappings.length && !filteredMappings.length ? (
          <article className="rounded-lg border border-gray-200 bg-white p-5 text-sm font-semibold text-gray-600 shadow-sm">
            No mappings match the current filters.
          </article>
        ) : null}

        {groupedMappings.map((group) => {
          if (!group.entries.length) return null;
          return (
            <article key={group.value} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <h3 className="text-lg font-bold text-gray-950">{group.label}</h3>
                <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: areaThemes.overview.soft, color: areaThemes.overview.text }}>
                  {group.entries.length} mapped {group.entries.length === 1 ? "entry" : "entries"}
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {group.entries.map((entry) => {
                  const expanded = expandedIds.has(entry.id);
                  return <MappingJourneyCard key={entry.id} entry={entry} expanded={expanded} onToggle={() => toggleExpanded(entry.id)} />;
                })}
              </div>
            </article>
          );
        })}
      </section>
    </section>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="mb-1 block text-sm font-bold text-gray-700">{label}</span>
      <select className="focus-ring w-full rounded-md border border-gray-300 bg-white px-3 py-2" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function SummaryCard({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-gray-500">{label}</p>
      <p className="mt-3 text-3xl font-bold" style={{ color: areaThemes.overview.accent }}>
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-gray-600">{note}</p>
    </article>
  );
}

function MappingJourneyCard({ entry, expanded, onToggle }: { entry: MappingEntry; expanded: boolean; onToggle: () => void }) {
  const frameworkSummary = summariseFrameworks(entry);
  const themeSummary = summariseThemes(entry);

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md px-2 py-1 text-xs font-bold" style={{ backgroundColor: areaThemes.overview.soft, color: areaThemes.overview.text }}>
              {entry.schemeReference || "No scheme reference"}
            </span>
            <span className="text-sm font-semibold text-gray-500">{displayYear(entry.year)} · {entry.term}</span>
          </div>
          <h4 className="mt-2 text-lg font-bold text-gray-950">{entry.unit}</h4>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">{entry.activityDescription}</p>
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
        <CompactSummary title="Skills" items={frameworkSummary} empty="No skills references mapped." />
        <CompactSummary title="Themes" items={themeSummary} empty="No theme elements mapped." />
      </div>

      {expanded ? (
        <div className="mt-4 grid gap-4 border-t border-gray-100 pt-4 lg:grid-cols-2">
          <DetailList title="Skills mapped" items={frameworkDetailItems(entry)} empty="No skills references mapped." />
          <DetailList title="CCT theme elements" items={themeDetailItems(entry)} empty="No theme elements mapped." />
          <NotesList entry={entry} />
        </div>
      ) : null}
    </div>
  );
}

function CompactSummary({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">{title}</p>
      {items.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {items.map((item) => (
            <span key={item} className="rounded-full bg-gray-50 px-3 py-1 text-xs font-bold text-gray-700">
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm font-semibold text-gray-500">{empty}</p>
      )}
    </div>
  );
}

function DetailList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div>
      <h5 className="text-sm font-bold text-gray-950">{title}</h5>
      {items.length ? (
        <ul className="mt-2 space-y-2 text-sm leading-6 text-gray-700">
          {items.map((item) => (
            <li key={item} className="rounded-md bg-gray-50 px-3 py-2">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 rounded-md bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-500">{empty}</p>
      )}
    </div>
  );
}

function NotesList({ entry }: { entry: MappingEntry }) {
  const notes = [
    ...frameworkReferencesForEntry(entry).map((reference) => reference.notes?.trim()).filter((note): note is string => Boolean(note)),
    entry.crossCuttingThemeNotes?.trim() ?? ""
  ].filter(Boolean);
  if (!notes.length) return null;
  return (
    <div className="lg:col-span-2">
      <h5 className="text-sm font-bold text-gray-950">Notes</h5>
      <ul className="mt-2 space-y-2 text-sm leading-6 text-gray-700">
        {Array.from(new Set(notes)).map((note) => (
          <li key={note} className="rounded-md bg-gray-50 px-3 py-2">
            {note}
          </li>
        ))}
      </ul>
    </div>
  );
}

function frameworkReferencesForEntry(entry: MappingEntry): MappingFrameworkReference[] {
  if (entry.frameworkReferences?.length) return entry.frameworkReferences;
  if (!entry.frameworkId || entry.framework === "No framework reference") return [];
  return [
    {
      frameworkId: entry.frameworkId,
      strandId: entry.strandId ?? "",
      elementId: entry.elementId ?? "",
      progressionDescriptorId: entry.progressionDescriptorId,
      framework: entry.framework,
      strand: entry.strand,
      element: entry.element,
      progressionReference: entry.progressionReference
    }
  ];
}

function themeElementsForEntry(entry: MappingEntry) {
  return entry.crossCuttingThemes?.length ? entry.crossCuttingThemes : [];
}

function summariseFrameworks(entry: MappingEntry) {
  const counts = frameworkReferencesForEntry(entry).reduce<Record<string, number>>((total, reference) => {
    const label = frameworkShortLabel(reference.frameworkShortName ?? reference.framework);
    total[label] = (total[label] ?? 0) + 1;
    return total;
  }, {});
  return Object.entries(counts).map(([label, count]) => `${label} ${count}`);
}

function summariseThemes(entry: MappingEntry) {
  const counts = themeElementsForEntry(entry).reduce<Record<string, number>>((total, theme) => {
    const label = theme.split(":")[0]?.trim() || theme;
    total[label] = (total[label] ?? 0) + 1;
    return total;
  }, {});
  return Object.entries(counts).map(([label, count]) => `${label} ${count}`);
}

function frameworkDetailItems(entry: MappingEntry) {
  return frameworkReferencesForEntry(entry).map((reference) =>
    [
      frameworkShortLabel(reference.frameworkShortName ?? reference.framework),
      reference.strandShortName ?? reference.strand,
      reference.element,
      reference.progressionStep ? `Step ${reference.progressionStep}` : reference.progressionReference
    ].filter(Boolean).join(" → ")
  );
}

function themeDetailItems(entry: MappingEntry) {
  return themeElementsForEntry(entry).map((theme) => theme.replace(":", " →"));
}

function matchesFrameworkFilter(entry: MappingEntry, filter: string) {
  if (filter === "CCT") return themeElementsForEntry(entry).length > 0;
  return frameworkReferencesForEntry(entry).some((reference) => frameworkShortLabel(reference.frameworkShortName ?? reference.framework) === filter);
}

function searchableText(entry: MappingEntry) {
  return [
    entry.year,
    entry.term,
    entry.schemeReference,
    entry.unit,
    entry.activityDescription,
    ...frameworkReferencesForEntry(entry).flatMap((reference) => [reference.framework, reference.strand, reference.strandShortName ?? "", reference.element, reference.notes ?? ""]),
    ...(entry.crossCuttingThemes ?? []),
    entry.crossCuttingThemeNotes ?? ""
  ].join(" ").toLowerCase();
}

function sortMappings(a: MappingEntry, b: MappingEntry) {
  const schemeDifference = compareSchemeReferences(a.schemeReference, b.schemeReference);
  if (schemeDifference) return schemeDifference;
  const termDifference = termIndex(a.term) - termIndex(b.term);
  if (termDifference) return termDifference;
  return a.unit.localeCompare(b.unit);
}

function compareSchemeReferences(a: string, b: string) {
  const aParts = numericParts(a);
  const bParts = numericParts(b);
  if (aParts.length && bParts.length) {
    const length = Math.max(aParts.length, bParts.length);
    for (let index = 0; index < length; index += 1) {
      const difference = (aParts[index] ?? 0) - (bParts[index] ?? 0);
      if (difference) return difference;
    }
    return a.localeCompare(b);
  }
  if (aParts.length) return -1;
  if (bParts.length) return 1;
  return a.localeCompare(b);
}

function numericParts(value: string) {
  return (value.match(/\d+/g) ?? []).map(Number);
}

function termIndex(term: string) {
  return { Autumn: 0, Spring: 1, Summer: 2 }[term] ?? 9;
}

function yearNumber(value: string) {
  return Number(value.match(/\d+/)?.[0] ?? 0);
}

function displayYear(value: string) {
  return yearOrder.find((year) => year.number === yearNumber(value))?.label ?? value;
}

function frameworkShortLabel(framework: string) {
  if (framework === "Digital Competence Framework") return "DCF";
  if (framework === "Literacy Framework") return "Literacy";
  if (framework === "Numeracy Framework") return "Numeracy";
  return framework;
}
