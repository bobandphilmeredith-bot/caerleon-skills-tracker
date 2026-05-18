"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/lib/auth";
import { useCurrentSchool } from "@/lib/currentSchool";
import { filterNaturalLanguage, getRelatedSuggestions } from "@/lib/curriculumOutputs";
import { descriptorForReference, progressionReferenceForEntry, secondaryProgressionReferences } from "@/lib/progression";
import type { FrameworkDefinition, MappingEntry, ProgressionReference } from "@/lib/types";
import { areaThemes, themeForFramework } from "@/lib/theme";

const allValue = "All";

export default function CurriculumExplorerPage() {
  const { data, updateMapping, deleteMapping } = useCurrentSchool();
  const { canEditMappings, canEditSubject } = useAuth();
  const { frameworkLibrary, frameworkMap, mappings, subjectAoleMap, subjects, terms, yearGroups } = data;
  const [framework, setFramework] = useState(allValue);
  const [strand, setStrand] = useState(allValue);
  const [element, setElement] = useState(allValue);
  const [subject, setSubject] = useState(allValue);
  const [yearGroup, setYearGroup] = useState(allValue);
  const [term, setTerm] = useState(allValue);
  const [progressionReference, setProgressionReference] = useState(allValue);
  const [keyword, setKeyword] = useState("");
  const [sortBy, setSortBy] = useState("Most recent");
  const [selectedEntry, setSelectedEntry] = useState<MappingEntry | null>(null);

  const strandOptions = framework === allValue ? unique(mappings.map((entry) => entry.strand)) : Object.keys(frameworkMap[framework]);
  const elementOptions = framework === allValue ? unique(mappings.map((entry) => entry.element)) : strand === allValue ? Object.values(frameworkMap[framework]).flat() : frameworkMap[framework][strand];

  const filteredEntries = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    const naturalMatches = query ? new Set(filterNaturalLanguage(query, mappings).map((entry) => entry.id)) : null;
    const filtered = mappings.filter((entry) => {
      const entryProgression = progressionReferenceForEntry(entry);
      const searchable = [entry.subject, entry.year, entry.term, entry.unit, entry.framework, entry.strand, entry.element, entryProgression, entry.activityDescription, entry.schemeReference, entry.note ?? ""]
        .join(" ")
        .toLowerCase();

      return (
        (framework === allValue || entry.framework === framework) &&
        (strand === allValue || entry.strand === strand) &&
        (element === allValue || entry.element === element) &&
        (subject === allValue || entry.subject === subject) &&
        (yearGroup === allValue || entry.year === yearGroup) &&
        (term === allValue || entry.term === term) &&
        (progressionReference === allValue || entryProgression === progressionReference) &&
        (!query || searchable.includes(query) || naturalMatches?.has(entry.id))
      );
    });
    return filtered.sort((a, b) => {
      if (sortBy === "Subject") return a.subject.localeCompare(b.subject);
      if (sortBy === "Year group") return a.year.localeCompare(b.year);
      if (sortBy === "Framework") return a.framework.localeCompare(b.framework);
      return b.lastMappedDate.localeCompare(a.lastMappedDate);
    });
  }, [element, framework, keyword, mappings, progressionReference, sortBy, strand, subject, term, yearGroup]);

  const popularElements = topCounts(mappings.map((entry) => entry.element)).slice(0, 5);
  const representedStrands = topCounts(mappings.map((entry) => entry.strand)).slice(0, 5);
  const recentSubjects = topCounts([...mappings].sort((a, b) => b.lastMappedDate.localeCompare(a.lastMappedDate)).slice(0, 30).map((entry) => entry.subject)).slice(0, 5);

  function updateFramework(nextFramework: string) {
    setFramework(nextFramework);
    setStrand(allValue);
    setElement(allValue);
  }

  function updateStrand(nextStrand: string) {
    setStrand(nextStrand);
    setElement(allValue);
  }

  function resetFilters() {
    setFramework(allValue);
    setStrand(allValue);
    setElement(allValue);
    setSubject(allValue);
    setYearGroup(allValue);
    setTerm(allValue);
    setProgressionReference(allValue);
    setKeyword("");
    setSortBy("Most recent");
  }

  function handleDelete(entry: MappingEntry) {
    if (!canEditEntry(entry)) return;
    if (!window.confirm(`Delete "${entry.unit}" from ${entry.subject}?`)) return;
    deleteMapping(entry.id);
    if (selectedEntry?.id === entry.id) setSelectedEntry(null);
  }

  function handleSaveEdit(entryId: string, patch: Partial<MappingEntry>) {
    const original = mappings.find((entry) => entry.id === entryId);
    const nextSubject = patch.subject ?? original?.subject ?? "";
    if (!original || !canEditEntry(original) || !canEditSubject(nextSubject)) return;
    updateMapping(entryId, { ...patch, lastMappedDate: new Date().toISOString().slice(0, 10) });
    setSelectedEntry((current) => (current?.id === entryId ? { ...current, ...patch, lastMappedDate: new Date().toISOString().slice(0, 10) } : current));
  }

  function canEditEntry(entry: MappingEntry) {
    return canEditMappings && canEditSubject(entry.subject);
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Curriculum Explorer"
        eyebrow="Whole-school visibility"
        description="Browse mapped activities to see what is represented in planning across subjects and frameworks."
        accent={areaThemes.overview.accent}
      />

      <article className="rounded-lg border bg-white p-5 shadow-sm" style={{ borderColor: areaThemes.overview.border }}>
        <div className="mb-4 flex justify-end">
          <button className="focus-ring btn btn-muted" type="button" onClick={resetFilters}>
            Reset filters
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SelectField label="Framework" value={framework} onChange={updateFramework} options={[allValue, ...frameworkLibrary.map((item) => item.name)]} />
          <SelectField label="Strand" value={strand} onChange={updateStrand} options={[allValue, ...strandOptions]} />
          <SelectField label="Element" value={element} onChange={setElement} options={[allValue, ...elementOptions]} />
          <SelectField label="Subject" value={subject} onChange={setSubject} options={[allValue, ...subjects]} />
          <SelectField label="Year group" value={yearGroup} onChange={setYearGroup} options={[allValue, ...yearGroups]} />
          <SelectField label="Term" value={term} onChange={setTerm} options={[allValue, ...terms]} />
          <SelectField label="Progression reference" value={progressionReference} onChange={setProgressionReference} options={[allValue, ...secondaryProgressionReferences]} />
          <SelectField label="Sort by" value={sortBy} onChange={setSortBy} options={["Most recent", "Subject", "Year group", "Framework"]} />
          <label className="md:col-span-2">
            <span className="mb-1 block text-sm font-semibold text-gray-700">Keyword search</span>
            <input
              className="focus-ring w-full rounded-md border border-gray-300 px-3 py-2"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Search activities, schemes, subjects or elements"
            />
          </label>
        </div>
      </article>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-gray-900">{filteredEntries.length} mapped opportunities</h2>
        <div className="flex flex-wrap gap-2">
          {canEditMappings ? (
            <Link className="focus-ring btn btn-primary" href="/add-entry">
              Add mapping entry
            </Link>
          ) : (
            <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-600">Read-only view</span>
          )}
          <Link className="focus-ring btn btn-secondary" href="/framework-browser">
            Open framework browser
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SummaryPanel title="Popular mapped elements" rows={popularElements} />
        <SummaryPanel title="Most represented strands" rows={representedStrands} />
        <SummaryPanel title="Recently reviewed subjects" rows={recentSubjects} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {filteredEntries.map((entry) => (
          <EntryCard key={entry.id} entry={entry} subjectAoleMap={subjectAoleMap} canEdit={canEditEntry(entry)} onOpen={() => setSelectedEntry(entry)} onDelete={() => handleDelete(entry)} />
        ))}
      </div>

      {!filteredEntries.length ? <p className="rounded-lg border border-gray-200 bg-white p-5 text-sm text-gray-600">No mapped activities match those filters.</p> : null}

      {selectedEntry ? (
        <EntryDetailModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onDelete={() => handleDelete(selectedEntry)}
          onSave={handleSaveEdit}
          canEdit={canEditEntry(selectedEntry)}
          frameworkLibrary={frameworkLibrary}
          frameworkMap={frameworkMap}
          mappings={mappings}
          subjectAoleMap={subjectAoleMap}
          subjects={subjects.filter((item) => canEditSubject(item))}
          terms={terms}
          yearGroups={yearGroups}
        />
      ) : null}
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

function SummaryPanel({ title, rows }: { title: string; rows: { label: string; value: number }[] }) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-gray-500">{title}</h2>
      <div className="mt-3 space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 rounded-md bg-gray-50 px-3 py-2 text-sm">
            <span className="font-semibold text-gray-800">{row.label}</span>
            <span className="font-bold text-[#741B47]">{row.value}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function EntryCard({
  entry,
  subjectAoleMap,
  canEdit,
  onOpen,
  onDelete
}: {
  entry: MappingEntry;
  subjectAoleMap: Record<string, string | undefined>;
  canEdit: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const theme = themeForFramework(entry.framework);
  return (
    <article className="rounded-lg border bg-white p-5 shadow-sm transition hover:shadow-md" style={{ borderColor: theme.border }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-gray-950">{entry.unit}</h3>
          <p className="mt-1 text-sm font-semibold text-gray-600">
            {entry.subject} · {entry.year} · {entry.term}
          </p>
          <p className="mt-1 text-xs font-semibold text-gray-500">AoLE: {subjectAoleMap[entry.subject] ?? "Not set"}</p>
        </div>
        <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: theme.soft, color: theme.text, border: `1px solid ${theme.border}` }}>
          {entry.framework === "Digital Competence Framework" ? "DCF" : entry.framework}
        </span>
      </div>
      <div className="mt-4 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
        <Meta label="Strand" value={entry.strand} />
        <Meta label="Element" value={entry.element} />
        <Meta label="Progression reference" value={progressionReferenceForEntry(entry)} />
        <Meta label="Scheme" value={entry.schemeReference} />
      </div>
      <p className="mt-4 text-sm leading-6 text-gray-700">{entry.activityDescription}</p>
      {entry.note ? <p className="mt-3 text-xs font-semibold text-gray-500">{entry.note}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="focus-ring btn btn-secondary px-3 py-2 text-xs" type="button" onClick={onOpen}>
          {canEdit ? "View / edit" : "View details"}
        </button>
        {canEdit ? (
          <button className="focus-ring btn btn-muted px-3 py-2 text-xs text-red-700" type="button" onClick={onDelete}>
            Delete
          </button>
        ) : null}
      </div>
    </article>
  );
}

function EntryDetailModal({
  entry,
  onClose,
  onDelete,
  onSave,
  canEdit,
  frameworkLibrary,
  frameworkMap,
  mappings,
  subjectAoleMap,
  subjects,
  terms,
  yearGroups
}: {
  entry: MappingEntry;
  onClose: () => void;
  onDelete: () => void;
  onSave: (entryId: string, patch: Partial<MappingEntry>) => void;
  canEdit: boolean;
  frameworkLibrary: FrameworkDefinition[];
  frameworkMap: Record<string, Record<string, string[]>>;
  mappings: MappingEntry[];
  subjectAoleMap: Record<string, string | undefined>;
  subjects: string[];
  terms: string[];
  yearGroups: string[];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState({
    subject: entry.subject,
    year: entry.year,
    term: entry.term,
    framework: entry.framework,
    strand: entry.strand,
    element: entry.element,
    unit: entry.unit,
    schemeReference: entry.schemeReference,
    progressionReference: progressionReferenceForEntry(entry),
    activityDescription: entry.activityDescription
  });
  const theme = themeForFramework(entry.framework);
  const displayEntry = { ...entry, ...draft, progressionReference: draft.progressionReference as ProgressionReference };
  const element = frameworkLibrary.flatMap((framework) => framework.strands.flatMap((strand) => strand.elements)).find((item) => item.name === displayEntry.element);
  const entryProgression = progressionReferenceForEntry(displayEntry);
  const related = mappings
    .filter((item) => item.id !== entry.id && (item.element === displayEntry.element || item.strand === displayEntry.strand) && item.subject !== displayEntry.subject)
    .slice(0, 5);
  const strandOptions = Object.keys(frameworkMap[draft.framework] ?? {});
  const elementOptions = frameworkMap[draft.framework]?.[draft.strand] ?? [];

  function updateDraftFramework(nextFramework: string) {
    const nextStrand = Object.keys(frameworkMap[nextFramework] ?? {})[0] ?? "";
    const nextElement = frameworkMap[nextFramework]?.[nextStrand]?.[0] ?? "";
    setDraft((current) => ({ ...current, framework: nextFramework, strand: nextStrand, element: nextElement }));
  }

  function updateDraftStrand(nextStrand: string) {
    setDraft((current) => ({ ...current, strand: nextStrand, element: frameworkMap[current.framework]?.[nextStrand]?.[0] ?? "" }));
  }

  function saveEdit() {
    if (!draft.subject || !draft.unit.trim() || !draft.schemeReference.trim() || !draft.activityDescription.trim()) return;
    onSave(entry.id, {
      ...draft,
      context: draft.unit.trim(),
      unit: draft.unit.trim(),
      schemeReference: draft.schemeReference.trim(),
      activityDescription: draft.activityDescription.trim(),
      progressionReference: draft.progressionReference as ProgressionReference
    });
    setIsEditing(false);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 px-4 py-6" role="dialog" aria-modal="true">
      <div className="max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-5 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 pb-4">
          <div>
            <div className="text-sm font-bold uppercase tracking-[0.14em]" style={{ color: theme.accent }}>
              {displayEntry.framework}
            </div>
            <h2 className="mt-1 text-2xl font-bold text-gray-950">{displayEntry.unit}</h2>
            <p className="mt-1 text-sm font-semibold text-gray-600">
              {displayEntry.subject} · {displayEntry.year} · {displayEntry.term}
            </p>
            <p className="mt-1 text-xs font-semibold text-gray-500">AoLE: {subjectAoleMap[displayEntry.subject] ?? "Not set"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canEdit ? (
              <>
                <button className="focus-ring btn btn-secondary px-3 py-2 text-sm" type="button" onClick={() => setIsEditing((current) => !current)}>
                  {isEditing ? "Cancel edit" : "Edit"}
                </button>
                <button className="focus-ring btn btn-muted px-3 py-2 text-sm text-red-700" type="button" onClick={onDelete}>
                  Delete
                </button>
              </>
            ) : null}
            <button className="focus-ring rounded-md px-3 py-2 text-sm font-bold" style={{ backgroundColor: theme.soft, color: theme.text }} type="button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        {isEditing && canEdit ? (
          <section className="mt-5 rounded-md border border-gray-200 bg-gray-50 p-4">
            <h3 className="font-bold text-gray-900">Edit mapping entry</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <SelectField label="Subject" value={draft.subject} onChange={(value) => setDraft((current) => ({ ...current, subject: value }))} options={subjects} />
              <SelectField label="Year group" value={draft.year} onChange={(value) => setDraft((current) => ({ ...current, year: value }))} options={yearGroups} />
              <SelectField label="Term" value={draft.term} onChange={(value) => setDraft((current) => ({ ...current, term: value }))} options={terms} />
              <SelectField label="Framework" value={draft.framework} onChange={updateDraftFramework} options={frameworkLibrary.map((item) => item.name)} />
              <SelectField label="Strand" value={draft.strand} onChange={updateDraftStrand} options={strandOptions} />
              <SelectField label="Element" value={draft.element} onChange={(value) => setDraft((current) => ({ ...current, element: value }))} options={elementOptions} />
              <SelectField label="Progression reference" value={draft.progressionReference} onChange={(value) => setDraft((current) => ({ ...current, progressionReference: value as ProgressionReference }))} options={secondaryProgressionReferences} />
              <label>
                <span className="mb-1 block text-sm font-semibold text-gray-700">Scheme reference</span>
                <input className="focus-ring w-full rounded-md border border-gray-300 px-3 py-2" value={draft.schemeReference} onChange={(event) => setDraft((current) => ({ ...current, schemeReference: event.target.value }))} />
              </label>
              <label className="md:col-span-2">
                <span className="mb-1 block text-sm font-semibold text-gray-700">Unit/topic</span>
                <input className="focus-ring w-full rounded-md border border-gray-300 px-3 py-2" value={draft.unit} onChange={(event) => setDraft((current) => ({ ...current, unit: event.target.value }))} />
              </label>
              <label className="md:col-span-2">
                <span className="mb-1 block text-sm font-semibold text-gray-700">Task description</span>
                <textarea className="focus-ring min-h-28 w-full rounded-md border border-gray-300 px-3 py-2" value={draft.activityDescription} onChange={(event) => setDraft((current) => ({ ...current, activityDescription: event.target.value }))} />
              </label>
            </div>
            <button className="focus-ring btn btn-primary mt-4" type="button" onClick={saveEdit}>
              Save changes
            </button>
          </section>
        ) : null}

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <section className="rounded-md border p-4" style={{ borderColor: theme.border }}>
              <h3 className="font-bold text-gray-900">Full task description</h3>
              <p className="mt-2 text-sm leading-6 text-gray-700">{displayEntry.activityDescription}</p>
            </section>
            <section className="rounded-md border p-4" style={{ borderColor: theme.border, backgroundColor: theme.soft }}>
              <h3 className="font-bold" style={{ color: theme.text }}>
                {entry.element}
              </h3>
              <p className="mt-2 text-sm leading-6 text-gray-700">{element?.explanation ?? "Teacher-friendly explanation available in the framework library."}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {element?.examples.map((example) => (
                  <span key={example} className="rounded-full bg-white px-3 py-1 text-xs font-semibold" style={{ color: theme.text }}>
                    {example}
                  </span>
                ))}
              </div>
              <div className="mt-4">
                <h4 className="text-sm font-bold text-gray-900">Also commonly mapped with...</h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {getRelatedSuggestions(entry).map((suggestion) => (
                    <span key={suggestion} className="rounded-full bg-white px-3 py-1 text-xs font-semibold" style={{ color: theme.text }}>
                      {suggestion}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-4">
            <section className="rounded-md border border-gray-200 p-4">
              <h3 className="font-bold text-gray-900">Mapping details</h3>
              <dl className="mt-3 space-y-2 text-sm">
                <DetailRow label="Framework" value={displayEntry.framework} />
                <DetailRow label="Strand" value={displayEntry.strand} />
                <DetailRow label="Element" value={displayEntry.element} />
                <DetailRow label="Progression reference" value={entryProgression} />
                <DetailRow label="Scheme reference" value={displayEntry.schemeReference} />
                <DetailRow label="Optional note" value={entry.note ?? "None added"} />
              </dl>
            </section>
            <section className="rounded-md border p-4" style={{ borderColor: theme.border, backgroundColor: theme.soft }}>
              <h3 className="font-bold" style={{ color: theme.text }}>
                Progression reference
              </h3>
              <p className="mt-2 text-sm font-bold text-gray-900">{entryProgression}</p>
              <p className="mt-2 text-sm leading-6 text-gray-700">{descriptorForReference(element, entryProgression)}</p>
            </section>
            <section className="rounded-md border border-gray-200 p-4">
              <h3 className="font-bold text-gray-900">Also mapped in...</h3>
              <div className="mt-3 space-y-2">
                {(related.length ? related : relatedFallback(displayEntry)).map((item) => (
                  <div key={`${item.subject}-${item.year}-${item.unit}`} className="rounded-md bg-gray-50 p-3 text-sm leading-6 text-gray-700">
                    <span className="font-bold text-gray-900">
                      {item.subject} {item.year}:
                    </span>{" "}
                    {item.activityDescription}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">{label}</span>
      <div className="font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-2">
      <dt className="font-semibold text-gray-600">{label}</dt>
      <dd className="text-right text-gray-900">{value}</dd>
    </div>
  );
}

function relatedFallback(entry: MappingEntry) {
  return [
    {
      subject: "English",
      year: "Year 8",
      unit: "Interpreting viewpoint",
      activityDescription: "Pupils interpret viewpoint in persuasive writing and compare how evidence is selected."
    },
    {
      subject: "History",
      year: "Year 9",
      unit: "Evaluating historical sources",
      activityDescription: "Pupils evaluate bias in historical sources and explain how it affects interpretation."
    },
    {
      subject: "Biology",
      year: "Year 10",
      unit: "Practical data review",
      activityDescription: "Pupils interpret data from practical work and use trends to support conclusions."
    }
  ].filter((item) => item.subject !== entry.subject);
}

function unique(items: string[]) {
  return Array.from(new Set(items)).filter(Boolean);
}

function topCounts(items: string[]) {
  const counts = items.reduce<Record<string, number>>((totals, item) => {
    totals[item] = (totals[item] ?? 0) + 1;
    return totals;
  }, {});
  return Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}
