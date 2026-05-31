"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AccessDenied } from "@/components/AccessDenied";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/lib/auth";
import { useCurrentSchool } from "@/lib/currentSchool";
import { useLiveSubjects } from "@/lib/useLiveSubjects";
import { areaThemes } from "@/lib/theme";
import type { MappingEntry, MappingFrameworkReference, SubjectConfig } from "@/lib/types";

const allYears = "All year groups";
const allTerms = "All terms";

type DisplayMappingEntry = MappingEntry;

export default function EditCurriculumPage() {
  const { canEditMappings, canEditSubject, canManageSchool } = useAuth();
  const { currentSchoolId, data, deleteMapping } = useCurrentSchool();
  const { mappings, terms, yearGroups } = data;
  const { subjects: databaseSubjects, loading: subjectsLoading } = useLiveSubjects(currentSchoolId);
  const [subjectId, setSubjectId] = useState("");
  const [yearFilter, setYearFilter] = useState(allYears);
  const [termFilter, setTermFilter] = useState(allTerms);
  const [keyword, setKeyword] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [hasReadReturnParams, setHasReadReturnParams] = useState(false);

  const editableSubjects = useMemo(
    () =>
      databaseSubjects
        .filter((subject) => subject.active && subject.appearsInMappingDropdowns && canEditSubject(subject.name))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [canEditSubject, databaseSubjects]
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const subject = params.get("subject");
    const year = params.get("year");
    if (subject) setSubjectId(subject);
    if (year) setYearFilter(year);
    setHasReadReturnParams(true);
  }, []);

  useEffect(() => {
    if (!hasReadReturnParams || subjectsLoading) return;
    if (!editableSubjects.length) {
      if (subjectId) setSubjectId("");
      return;
    }
    if (!subjectId && editableSubjects.length) setSubjectId(editableSubjects[0].id);
    if (subjectId && !editableSubjects.some((subject) => subject.id === subjectId)) setSubjectId(editableSubjects[0]?.id ?? "");
  }, [editableSubjects, hasReadReturnParams, subjectId, subjectsLoading]);

  const selectedSubject = editableSubjects.find((subject) => subject.id === subjectId);
  const filteredMappings = useMemo(
    () =>
      collapseDuplicateMappings(
        mappings
          .filter((entry) => matchesSubject(entry, selectedSubject))
          .filter((entry) => yearFilter === allYears || entry.year === yearFilter)
          .filter((entry) => termFilter === allTerms || entry.term === termFilter)
          .filter((entry) => matchesKeyword(entry, keyword))
          .sort(compareMappings)
      ),
    [keyword, mappings, selectedSubject, termFilter, yearFilter]
  );
  const groupedMappings = useMemo(() => groupMappings(filteredMappings, yearGroups), [filteredMappings, yearGroups]);

  if (!canEditMappings) {
    return <AccessDenied title="Edit Curriculum restricted" message="Your current role is read-only. Switch to a teacher, subject lead or school admin account to edit curriculum mappings." />;
  }

  async function handleDelete(entry: MappingEntry) {
    if (!canManageSchool || deletingId) return;
    const label = entry.unit || entry.context || entry.schemeReference || "this curriculum mapping";
    if (!window.confirm(`Delete "${label}"? This will also remove its skills references and cross-cutting theme links.`)) return;
    setDeletingId(entry.id);
    setDeleteMessage("");
    const result = await deleteMapping(entry.id);
    setDeletingId("");
    setDeleteMessage(result.ok ? "Curriculum mapping deleted." : `Could not delete mapping: ${result.message ?? "Unknown Supabase error"}`);
  }

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Curriculum Editing"
        title="Edit Curriculum Mappings"
        description="Browse by subject, review curriculum mappings and update skills or theme evidence."
        accent={areaThemes.overview.accent}
      />

      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(260px,1.2fr)_minmax(220px,1fr)_minmax(220px,1fr)]">
          <Field label="Subject">
            <select className="focus-ring w-full rounded-md border border-gray-300 bg-white px-3 py-2" value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
              {editableSubjects.length ? null : <option value="">No editable subjects</option>}
              {editableSubjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Search mappings">
            <input className="focus-ring w-full rounded-md border border-gray-300 px-3 py-2" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Search title, scheme, notes..." />
          </Field>
          <Field label="Term">
            <select className="focus-ring w-full rounded-md border border-gray-300 bg-white px-3 py-2" value={termFilter} onChange={(event) => setTermFilter(event.target.value)}>
              <option value={allTerms}>{allTerms}</option>
              {(terms.length ? terms : ["Autumn", "Spring", "Summer"]).map((term) => (
                <option key={term} value={term}>
                  {term}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-4">
          <span className="mb-2 block text-sm font-semibold text-gray-700">Year group</span>
          <div className="flex flex-wrap gap-2">
            {[allYears, ...yearGroups].map((year) => (
              <FilterButton key={year} selected={yearFilter === year} onClick={() => setYearFilter(year)}>
                {year === allYears ? "All" : year.replace("Year ", "Y")}
              </FilterButton>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {deleteMessage ? <div className="rounded-md border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 shadow-sm">{deleteMessage}</div> : null}
        {!editableSubjects.length ? (
          <EmptyState message="No editable subjects are assigned to your account. Contact a school administrator." />
        ) : !filteredMappings.length ? (
          <EmptyState message="No curriculum mappings found for this subject yet." />
        ) : (
          groupedMappings.map(({ year, entries }) => (
            <section key={year} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-gray-950">{year}</h2>
                <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: areaThemes.overview.soft, color: areaThemes.overview.text }}>
                  {entries.length} mapping{entries.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="mt-3 grid gap-3">
                {entries.map((entry) => (
                  <MappingCard key={entry.id} entry={entry} subjectId={subjectId} canDelete={canManageSchool} isDeleting={deletingId === entry.id} onDelete={() => handleDelete(entry)} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </section>
  );
}

function MappingCard({ entry, subjectId, canDelete, isDeleting, onDelete }: { entry: DisplayMappingEntry; subjectId: string; canDelete: boolean; isDeleting: boolean; onDelete: () => void }) {
  const skills = summariseSkills(entry.frameworkReferences ?? []);
  const themes = summariseThemes(entry.crossCuttingThemes ?? []);
  const href = `/edit-curriculum/${encodeURIComponent(entry.id)}?subject=${encodeURIComponent(subjectId)}&year=${encodeURIComponent(entry.year)}`;
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-gray-500">
            <span>{entry.schemeReference || "No scheme reference"}</span>
            <span aria-hidden="true">•</span>
            <span>{entry.term}</span>
            <span aria-hidden="true">•</span>
            <span>Updated {entry.lastMappedDate}</span>
          </div>
          <h3 className="mt-1 text-base font-bold text-gray-950">{entry.unit || entry.context || "Untitled mapping"}</h3>
          {entry.activityDescription ? <p className="mt-1 line-clamp-2 text-sm leading-6 text-gray-600">{entry.activityDescription}</p> : null}
          <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
            <SummaryBlock label="Skills" value={skills} empty="No framework references" />
            <SummaryBlock label="Themes" value={themes} empty="No theme elements" />
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link className="focus-ring btn btn-secondary" href={href}>
            Edit
          </Link>
          {canDelete ? (
            <button className="focus-ring rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-700" type="button" onClick={onDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
      <h2 className="text-lg font-bold text-gray-950">{message}</h2>
      <Link className="focus-ring btn btn-primary mt-4 inline-flex" href="/add-entry">
        Add Curriculum
      </Link>
    </div>
  );
}

function SummaryBlock({ label, value, empty }: { label: string; value: string; empty: string }) {
  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
      <span className="block text-xs font-bold uppercase tracking-[0.12em] text-gray-500">{label}</span>
      <span className="mt-1 block line-clamp-2 font-semibold text-gray-800">{value || empty}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label>
      <span className="mb-1 block text-sm font-semibold text-gray-700">{label}</span>
      {children}
    </label>
  );
}

function FilterButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button className={`focus-ring rounded-md border px-3 py-2 text-sm font-bold ${selected ? "text-white" : "border-gray-300 bg-white text-gray-700"}`} style={selected ? { borderColor: areaThemes.overview.accent, backgroundColor: areaThemes.overview.accent } : undefined} type="button" onClick={onClick}>
      {children}
    </button>
  );
}

function matchesSubject(entry: MappingEntry, subject: SubjectConfig | undefined) {
  if (!subject) return false;
  return entry.subjectId === subject.id || entry.subject === subject.name;
}

function matchesKeyword(entry: MappingEntry, keyword: string) {
  const needle = keyword.trim().toLowerCase();
  if (!needle) return true;
  return [entry.unit, entry.context, entry.activityDescription, entry.schemeReference, entry.note, entry.crossCuttingThemeNotes, ...(entry.frameworkReferences ?? []).map((reference) => reference.notes ?? ""), ...(entry.crossCuttingThemes ?? [])]
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

function groupMappings(entries: DisplayMappingEntry[], configuredYears: string[]) {
  const orderedYears = [...configuredYears].sort((a, b) => yearNumber(a) - yearNumber(b));
  return Array.from(new Set([...orderedYears, ...entries.map((entry) => entry.year)]))
    .sort((a, b) => yearNumber(a) - yearNumber(b))
    .map((year) => ({ year, entries: entries.filter((entry) => entry.year === year).sort(compareMappings) }))
    .filter((group) => group.entries.length > 0);
}

function collapseDuplicateMappings(entries: MappingEntry[]): DisplayMappingEntry[] {
  const grouped = new Map<string, MappingEntry[]>();
  for (const entry of entries) {
    const key = duplicateKey(entry);
    grouped.set(key, [...(grouped.get(key) ?? []), entry]);
  }

  return Array.from(grouped.values())
    .map((group) => mergeDuplicateGroup(group))
    .sort(compareMappings);
}

function duplicateKey(entry: MappingEntry) {
  return [
    entry.subjectId || entry.subject,
    entry.year,
    entry.term,
    normaliseDuplicateText(entry.schemeReference),
    normaliseDuplicateText(entry.unit || entry.context),
    normaliseDuplicateText(entry.activityDescription)
  ].join("::");
}

function mergeDuplicateGroup(group: MappingEntry[]): DisplayMappingEntry {
  const [first, ...rest] = group.sort(compareMappings);
  return {
    ...first,
    frameworkReferences: uniqueFrameworkReferences(group.flatMap((entry) => entry.frameworkReferences ?? [])),
    crossCuttingThemes: uniqueStrings(group.flatMap((entry) => entry.crossCuttingThemes ?? [])),
    crossCuttingThemeIds: uniqueStrings(group.flatMap((entry) => entry.crossCuttingThemeIds ?? [])),
    crossCuttingThemeElementIds: uniqueStrings(group.flatMap((entry) => entry.crossCuttingThemeElementIds ?? [])),
    crossCuttingThemeElementLinks: Array.from(new Map(group.flatMap((entry) => entry.crossCuttingThemeElementLinks ?? []).map((link) => [`${link.themeId}:${link.elementId}`, link])).values()),
    lastMappedDate: group.map((entry) => entry.lastMappedDate).sort().at(-1) ?? first.lastMappedDate,
    note: uniqueStrings(group.map((entry) => entry.note ?? "")).join(" · "),
    crossCuttingThemeNotes: uniqueStrings(group.map((entry) => entry.crossCuttingThemeNotes ?? "")).join(" · ")
  };
}

function uniqueFrameworkReferences(references: MappingFrameworkReference[]) {
  return Array.from(
    new Map(
      references.map((reference) => [
        [reference.frameworkId, reference.strandId, reference.elementId, reference.progressionDescriptorId ?? "", reference.progressionStep ?? "", reference.notes ?? ""].join("::"),
        reference
      ])
    ).values()
  );
}

function uniqueStrings(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function normaliseDuplicateText(value: string | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function compareMappings(a: MappingEntry, b: MappingEntry) {
  const yearDiff = yearNumber(a.year) - yearNumber(b.year);
  if (yearDiff !== 0) return yearDiff;
  const schemeDiff = compareSchemeReference(a.schemeReference, b.schemeReference);
  return schemeDiff || (a.unit || a.context).localeCompare(b.unit || b.context);
}

function yearNumber(year: string) {
  return Number(year.match(/\d+/)?.[0] ?? 99);
}

function compareSchemeReference(a: string, b: string) {
  const aParts = numericParts(a);
  const bParts = numericParts(b);
  if (aParts.length && !bParts.length) return -1;
  if (!aParts.length && bParts.length) return 1;
  if (aParts.length && bParts.length) {
    const max = Math.max(aParts.length, bParts.length);
    for (let index = 0; index < max; index += 1) {
      const diff = (aParts[index] ?? -1) - (bParts[index] ?? -1);
      if (diff !== 0) return diff;
    }
  }
  return a.localeCompare(b);
}

function numericParts(value: string) {
  return (value.match(/\d+/g) ?? []).map(Number);
}

function summariseSkills(references: MappingFrameworkReference[]) {
  const labels = references.map((reference) => `${reference.frameworkShortName ?? reference.framework}: ${reference.element} ${reference.progressionReference ?? ""}`.trim());
  return labels.length > 2 ? `${labels.slice(0, 2).join(", ")} +${labels.length - 2}` : labels.join(", ");
}

function summariseThemes(themes: string[]) {
  return themes.length > 2 ? `${themes.slice(0, 2).join(", ")} +${themes.length - 2}` : themes.join(", ");
}
