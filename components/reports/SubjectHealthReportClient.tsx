"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AccessDenied } from "@/components/AccessDenied";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/lib/auth";
import { useCurrentSchool } from "@/lib/currentSchool";
import {
  buildReportData,
  compactFrameworkName,
  countBy,
  formatMappingDescription,
  formatMappingTitle,
  frameworkCount,
  frameworkDetailText,
  groupBy,
  groupEntriesByYear,
  progressionCounts,
  reportFrameworks,
  reportSteps,
  reportYearGroups,
  searchableMappingText,
  summariseFrameworkCounts,
  summariseThemeCounts,
  themeElementCount,
  unique,
  type MappingEvidence
} from "@/lib/reporting";
import { areaThemes, themeForFramework } from "@/lib/theme";
import type { FrameworkDefinition, MappingFrameworkReference } from "@/lib/types";

const allValue = "All";

export function SubjectHealthReportClient() {
  const { data, liveDiagnostics } = useCurrentSchool();
  const { currentUser, canManageSchool, canEditSubject, isDemoMode } = useAuth();
  const reportData = useMemo(() => buildReportData(data.mappings, data.crossCuttingThemes), [data.crossCuttingThemes, data.mappings]);
  const permittedSubjects = useMemo(() => {
    if (canManageSchool) return data.subjects;
    if (!currentUser || currentUser.role === "viewer") return [];
    return data.subjects.filter((subject) => canEditSubject(subject));
  }, [canEditSubject, canManageSchool, currentUser, data.subjects]);
  const [selectedSubject, setSelectedSubject] = useState(permittedSubjects[0] ?? "");
  const [yearFilter, setYearFilter] = useState(allValue);
  const [termFilter, setTermFilter] = useState(allValue);
  const [query, setQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const subject = permittedSubjects.includes(selectedSubject) ? selectedSubject : permittedSubjects[0] ?? "";
  const entries = useMemo(() => reportData.subjectEntries[subject] ?? [], [reportData.subjectEntries, subject]);
  const frameworkRefs = entries.flatMap((entry) => entry.frameworkRefs);
  const termOptions = unique(entries.map((entry) => entry.mapping.term)).sort();
  const filteredEntries = useMemo(
    () =>
      entries.filter((entry) => {
        if (yearFilter !== allValue && entry.mapping.year !== yearFilter) return false;
        if (termFilter !== allValue && entry.mapping.term !== termFilter) return false;
        const search = query.trim().toLowerCase();
        return !search || searchableMappingText(entry).includes(search);
      }),
    [entries, query, termFilter, yearFilter]
  );
  const groupedEntries = groupEntriesByYear(filteredEntries);
  const gaps = buildSubjectGaps(entries);
  const frameworkByYear = buildFrameworkByYear(entries);
  const frameworkElementCoverage = useMemo(() => buildFrameworkElementCoverage(data.frameworkLibrary, filteredEntries), [data.frameworkLibrary, filteredEntries]);
  const cctCoverage = buildCctCoverage(entries, data.crossCuttingThemes);
  const stepCounts = progressionCounts(frameworkRefs);

  if (!isDemoMode && !liveDiagnostics) {
    return (
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-950">Loading live report data</h1>
        <p className="mt-2 text-sm text-gray-600">Preparing the Subject Curriculum Health Report from Supabase.</p>
      </section>
    );
  }

  if (!permittedSubjects.length) {
    return <AccessDenied title="Subject report restricted" message="Your current role does not have an assigned subject for this report." />;
  }

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
        eyebrow="Curriculum Reporting"
        title="Subject Curriculum Health Report"
        description="Review curriculum coverage, skills progression and theme evidence for this subject."
        accent={areaThemes.overview.accent}
      />

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(220px,0.8fr)_1fr_auto] lg:items-end">
          <label>
            <span className="mb-1 block text-sm font-bold text-gray-700">Subject</span>
            <select className="focus-ring w-full rounded-md border border-gray-300 bg-white px-3 py-2" value={subject} onChange={(event) => setSelectedSubject(event.target.value)}>
              {permittedSubjects.map((subjectName) => (
                <option key={subjectName} value={subjectName}>
                  {subjectName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-sm font-bold text-gray-700">Keyword search</span>
            <input className="focus-ring w-full rounded-md border border-gray-300 px-3 py-2" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search schemes, notes, skills or theme elements" />
          </label>
          <button className="focus-ring btn btn-secondary" type="button" onClick={() => window.print()}>
            Print report
          </button>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <FilterSelect label="Year group" value={yearFilter} options={[allValue, ...reportYearGroups]} onChange={setYearFilter} />
          <FilterSelect label="Term" value={termFilter} options={[allValue, ...termOptions]} onChange={setTermFilter} />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <SummaryCard label="Subject" value={subject} note="Selected subject report." />
        <SummaryCard label="Curriculum entries" value={entries.length} note="Real curriculum_mappings rows." />
        <SummaryCard label="Schemes referenced" value={unique(entries.map((entry) => entry.mapping.schemeReference)).length} note="Unique scheme references." />
        <SummaryCard label="Literacy" value={countFramework(entries, "Literacy")} note="Framework link rows." framework="Literacy" />
        <SummaryCard label="Numeracy" value={countFramework(entries, "Numeracy")} note="Framework link rows." framework="Numeracy" />
        <SummaryCard label="DCF" value={countFramework(entries, "DCF")} note="Framework link rows." framework="DCF" />
        <SummaryCard label="CCT elements" value={entries.reduce((total, entry) => total + themeElementCount(entry), 0)} note="Theme element link rows." framework="Cross-cutting Themes" />
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-950">Framework strand and element coverage</h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">Shows which live framework strands and elements are represented by the current subject report filters.</p>
          </div>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">{filteredEntries.length} filtered mappings</span>
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          {frameworkElementCoverage.map((framework) => (
            <FrameworkCoverageCard key={framework.framework} coverage={framework} />
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-gray-950">Skills coverage summary</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.12em] text-gray-500">
              <tr>
                <th className="py-2 pr-4">Year group</th>
                <th className="py-2 pr-4">Literacy</th>
                <th className="py-2 pr-4">Numeracy</th>
                <th className="py-2 pr-4">DCF</th>
                <th className="py-2 pr-4">CCT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reportYearGroups.map((year) => (
                <tr key={year}>
                  <th className="py-3 pr-4 font-bold text-gray-900">{year}</th>
                  <td className="py-3 pr-4">{frameworkByYear[year]?.Literacy ?? 0}</td>
                  <td className="py-3 pr-4">{frameworkByYear[year]?.Numeracy ?? 0}</td>
                  <td className="py-3 pr-4">{frameworkByYear[year]?.DCF ?? 0}</td>
                  <td className="py-3 pr-4">{frameworkByYear[year]?.CCT ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-gray-950">Progression check</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {reportSteps.map((step) => (
            <SummaryCard key={step} label={`Step ${step}`} value={stepCounts[step] ?? 0} note="Skill references mapped at this step." />
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-gray-950">CCT coverage</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {cctCoverage.map((theme) => (
            <article key={theme.themeId} className="rounded-md border border-gray-200 bg-gray-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold text-gray-950">{theme.theme}</h3>
                <span className="rounded-full px-2 py-1 text-xs font-bold" style={{ backgroundColor: areaThemes.themes.soft, color: areaThemes.themes.text }}>
                  {theme.count} mapped
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-600">Schemes: {theme.schemes.length ? theme.schemes.join(", ") : "No CCT evidence yet"}</p>
              <p className="mt-1 text-sm text-gray-600">Elements: {theme.elements.length ? theme.elements.join(", ") : "No elements mapped"}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-gray-950">Gaps and improvement actions</h2>
        <div className="mt-4 space-y-3">
          {gaps.length ? gaps.map((gap) => <ActionCard key={gap.issue} {...gap} />) : <p className="rounded-md bg-gray-50 p-3 text-sm font-semibold text-gray-700">No urgent mapping gaps found for this subject.</p>}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gray-950">Curriculum journey by year group</h2>
        {!entries.length ? (
          <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-700">No curriculum mappings found for this subject yet.</p>
            <Link className="focus-ring btn btn-primary mt-4 inline-flex" href="/add-entry">
              Add Curriculum
            </Link>
          </article>
        ) : null}
        {entries.length && !filteredEntries.length ? <p className="rounded-lg border border-gray-200 bg-white p-5 text-sm font-semibold text-gray-700 shadow-sm">No mappings match the current filters.</p> : null}
        {groupedEntries.map((group) => (
          <article key={group.year} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-950">{group.year}</h3>
              <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: areaThemes.overview.soft, color: areaThemes.overview.text }}>
                {group.entries.length} mappings
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {group.entries.map((entry) => (
                <MappingCard key={entry.mapping.id} entry={entry} expanded={expandedIds.has(entry.mapping.id)} onToggle={() => toggleExpanded(entry.mapping.id)} />
              ))}
            </div>
          </article>
        ))}
      </section>
    </section>
  );
}

function MappingCard({ entry, expanded, onToggle }: { entry: MappingEvidence; expanded: boolean; onToggle: () => void }) {
  const mapping = entry.mapping;
  const frameworkSummary = summariseFrameworkCounts(entry);
  const themeSummary = summariseThemeCounts(entry);
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-500">{mapping.schemeReference || "No scheme reference"} · {mapping.term}</p>
          <h3 className="mt-1 text-lg font-bold text-gray-950">{formatMappingTitle(mapping)}</h3>
          {formatMappingDescription(mapping) ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">{formatMappingDescription(mapping)}</p> : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button type="button" className="focus-ring btn btn-muted text-xs" onClick={onToggle}>{expanded ? "Hide details" : "View details"}</button>
          <Link className="focus-ring btn btn-secondary text-xs" href={`/edit-curriculum/${mapping.id}`}>Edit</Link>
        </div>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <MiniSummary title="Skills" items={frameworkSummary.map((item) => `${item.framework} ${item.count}`)} empty="No skill references mapped." />
        <MiniSummary title="CCT" items={themeSummary.map((item) => `${item.theme} ${item.count}`)} empty="No CCT element evidence mapped." />
      </div>
      {expanded ? (
        <div className="mt-4 grid gap-4 border-t border-gray-100 pt-4 lg:grid-cols-2">
          <DetailList title="Skills mapped" items={entry.frameworkRefs.map((reference) => frameworkDetailText(reference))} empty="No skill references mapped." />
          <DetailList title="CCT theme elements" items={entry.themeItems.map((item) => item.element ? `${item.theme} → ${item.element}` : `${item.theme} (legacy broad theme)`)} empty="No theme elements mapped." />
          <DetailList title="Notes" items={unique([...entry.frameworkRefs.map((reference) => reference.notes ?? ""), mapping.crossCuttingThemeNotes ?? "", mapping.note ?? ""])} empty="" />
        </div>
      ) : null}
    </article>
  );
}

function buildFrameworkByYear(entries: MappingEvidence[]) {
  return Object.fromEntries(
    reportYearGroups.map((year) => {
      const yearEntries = entries.filter((entry) => entry.mapping.year === year);
      return [
        year,
        {
          Literacy: countFramework(yearEntries, "Literacy"),
          Numeracy: countFramework(yearEntries, "Numeracy"),
          DCF: countFramework(yearEntries, "DCF"),
          CCT: yearEntries.reduce((total, entry) => total + themeElementCount(entry), 0)
        }
      ];
    })
  );
}

type ElementCoverage = {
  name: string;
  mapped: boolean;
  count: number;
  years: string[];
  schemes: string[];
};

type StrandElementCoverage = {
  strand: string;
  strandShortName?: string | null;
  total: number;
  mapped: number;
  elements: ElementCoverage[];
};

type FrameworkElementCoverage = {
  framework: string;
  shortName: "Literacy" | "Numeracy" | "DCF";
  total: number;
  mapped: number;
  strands: StrandElementCoverage[];
};

function buildFrameworkElementCoverage(frameworkLibrary: FrameworkDefinition[], entries: MappingEvidence[]): FrameworkElementCoverage[] {
  const references = entries.flatMap((entry) => entry.frameworkRefs.map((reference) => ({ reference, entry })));
  return reportFrameworks.map((shortName) => {
    const framework = frameworkLibrary.find((item) => frameworkLibraryMatches(item, shortName));
    const strands = (framework?.strands ?? []).map((strand) => {
      const elements = strand.elements.map((element) => {
        const matches = references.filter(({ reference }) => referenceMatchesElement(reference, shortName, strand.name, element.name));
        return {
          name: element.name,
          mapped: matches.length > 0,
          count: matches.length,
          years: unique(matches.map(({ entry }) => entry.mapping.year)).sort(),
          schemes: unique(matches.map(({ entry }) => entry.mapping.schemeReference || formatMappingTitle(entry.mapping))).slice(0, 4)
        };
      });
      return {
        strand: strand.name,
        strandShortName: strand.shortName,
        total: elements.length,
        mapped: elements.filter((element) => element.mapped).length,
        elements
      };
    });
    const total = strands.reduce((sum, strand) => sum + strand.total, 0);
    const mapped = strands.reduce((sum, strand) => sum + strand.mapped, 0);
    return {
      framework: framework?.name ?? `${shortName} Framework`,
      shortName,
      total,
      mapped,
      strands
    };
  });
}

function FrameworkCoverageCard({ coverage }: { coverage: FrameworkElementCoverage }) {
  const theme = themeForFramework(coverage.shortName);
  const unmapped = coverage.total - coverage.mapped;
  return (
    <article className="rounded-lg border bg-white p-4" style={{ borderColor: theme.border }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-gray-950">{coverage.shortName}</h3>
          <p className="mt-1 text-sm text-gray-600">{coverage.mapped} of {coverage.total} elements represented.</p>
        </div>
        <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: theme.soft, color: theme.text }}>
          {unmapped} not mapped
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {coverage.strands.map((strand) => (
          <details key={strand.strand} className="rounded-md border border-gray-200 bg-gray-50 p-3" open={strand.mapped > 0 && strand.mapped < strand.total}>
            <summary className="cursor-pointer list-none">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-bold text-gray-900">{strand.strandShortName ?? strand.strand}</h4>
                <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-gray-600">{strand.mapped}/{strand.total}</span>
              </div>
              {strand.strandShortName && strand.strandShortName !== strand.strand ? <p className="mt-1 text-xs leading-5 text-gray-500">{strand.strand}</p> : null}
            </summary>
            <div className="mt-3 space-y-2">
              {strand.elements.map((element) => (
                <ElementCoverageRow key={element.name} element={element} />
              ))}
            </div>
          </details>
        ))}
        {!coverage.strands.length ? <p className="rounded-md bg-gray-50 p-3 text-sm text-gray-600">No live framework structure found for this framework.</p> : null}
      </div>
    </article>
  );
}

function ElementCoverageRow({ element }: { element: ElementCoverage }) {
  return (
    <div className={`rounded-md border px-3 py-2 ${element.mapped ? "border-green-200 bg-green-50" : "border-gray-200 bg-white"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-bold text-gray-900">{element.name}</p>
        <span className={`rounded-full px-2 py-1 text-xs font-bold ${element.mapped ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
          {element.mapped ? `${element.count} mapped` : "Not mapped"}
        </span>
      </div>
      {element.mapped ? (
        <p className="mt-1 text-xs leading-5 text-gray-600">
          {element.years.join(", ")}{element.schemes.length ? ` · ${element.schemes.join(", ")}` : ""}
        </p>
      ) : null}
    </div>
  );
}

function frameworkLibraryMatches(framework: FrameworkDefinition, target: "Literacy" | "Numeracy" | "DCF") {
  if (target === "DCF") return framework.shortName === "DCF" || framework.name === "Digital Competence Framework";
  return framework.shortName === target || framework.name === `${target} Framework` || framework.name === target;
}

function referenceMatchesElement(reference: MappingFrameworkReference, framework: "Literacy" | "Numeracy" | "DCF", strand: string, element: string) {
  return compactFrameworkName(reference) === framework && normaliseCoverageLabel(reference.strand) === normaliseCoverageLabel(strand) && normaliseCoverageLabel(reference.element) === normaliseCoverageLabel(element);
}

function normaliseCoverageLabel(value: string) {
  return value.trim().toLowerCase();
}

function buildCctCoverage(entries: MappingEvidence[], themes: ReturnType<typeof useCurrentSchool>["data"]["crossCuttingThemes"]) {
  return themes.map((theme) => {
    const items = entries.flatMap((entry) => entry.themeItems.filter((item) => item.themeId === theme.id || item.theme === theme.name));
    return {
      themeId: theme.id,
      theme: theme.name,
      count: items.length,
      schemes: unique(entries.filter((entry) => entry.themeItems.some((item) => item.themeId === theme.id || item.theme === theme.name)).map((entry) => entry.mapping.schemeReference || formatMappingTitle(entry.mapping))),
      elements: unique(items.map((item) => item.element ?? "").filter(Boolean))
    };
  });
}

function buildSubjectGaps(entries: MappingEvidence[]) {
  const gaps: { issue: string; evidence: string; action: string; href?: string }[] = [];
  for (const year of reportYearGroups) {
    const yearEntries = entries.filter((entry) => entry.mapping.year === year);
    if (!yearEntries.length) gaps.push({ issue: `${year} has no curriculum mappings.`, evidence: "0 mapped curriculum entries.", action: "Add or import the planned schemes for this year group.", href: "/add-entry" });
    if (yearEntries.length && !yearEntries.some((entry) => frameworkCount(entry, "DCF") > 0)) {
      gaps.push({ issue: `${year} has no DCF references.`, evidence: `0 DCF links across ${yearEntries.length} mapped ${yearEntries.length === 1 ? "entry" : "entries"}.`, action: "Review schemes for authentic digital competence opportunities." });
    }
  }
  for (const entry of entries) {
    if (!entry.frameworkRefs.length) gaps.push({ issue: `${formatMappingTitle(entry.mapping)} has no skill references.`, evidence: "0 Literacy, Numeracy or DCF links.", action: "Open the mapping and attach relevant skill references.", href: `/edit-curriculum/${entry.mapping.id}` });
    if (!themeElementCount(entry)) gaps.push({ issue: `${formatMappingTitle(entry.mapping)} has no CCT theme elements.`, evidence: "0 CCT element links.", action: "Review whether wider curriculum themes are evidenced.", href: `/edit-curriculum/${entry.mapping.id}` });
  }
  if (!entries.some((entry) => entry.frameworkRefs.some((reference) => reference.progressionStep === 5 || reference.progressionReference === "Step 5"))) {
    gaps.push({ issue: "No Step 5 skill references are visible.", evidence: "0 Step 5 framework links for this subject.", action: "Check Year 10 and Year 11 schemes for appropriate Step 5 opportunities." });
  }
  const frameworkTotals = reportFrameworks.map((framework) => ({ framework, count: countFramework(entries, framework) }));
  const represented = frameworkTotals.filter((item) => item.count > 0);
  if (represented.length === 1 && entries.length) {
    gaps.push({ issue: `Mapping is currently concentrated in ${represented[0].framework}.`, evidence: `${represented[0].count} links in one framework type.`, action: "Check whether the subject also provides meaningful Literacy, Numeracy or DCF evidence." });
  }
  return gaps.slice(0, 10);
}

function countFramework(entries: MappingEvidence[], framework: "Literacy" | "Numeracy" | "DCF") {
  return entries.reduce((total, entry) => total + frameworkCount(entry, framework), 0);
}

function SummaryCard({ label, value, note, framework }: { label: string; value: string | number; note: string; framework?: string }) {
  const theme = framework ? themeForFramework(framework) : areaThemes.overview;
  return (
    <article className="rounded-lg border bg-white p-4 shadow-sm" style={{ borderColor: theme.border }}>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-gray-950">{value}</p>
      <p className="mt-1 text-xs leading-5 text-gray-600">{note}</p>
    </article>
  );
}

function MiniSummary({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">{title}</p>
      <p className="mt-1 text-sm font-semibold text-gray-800">{items.length ? items.join(" · ") : empty}</p>
    </div>
  );
}

function DetailList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  const visible = items.filter((item) => item.trim());
  if (!visible.length && !empty) return null;
  return (
    <div>
      <h4 className="text-sm font-bold text-gray-950">{title}</h4>
      {visible.length ? (
        <ul className="mt-2 space-y-1 text-sm leading-6 text-gray-700">
          {visible.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-gray-600">{empty}</p>
      )}
    </div>
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

function ActionCard({ issue, evidence, action, href }: { issue: string; evidence: string; action: string; href?: string }) {
  return (
    <article className="rounded-md border border-gray-200 bg-gray-50 p-3">
      <h3 className="font-bold text-gray-950">Issue: {issue}</h3>
      <p className="mt-1 text-sm text-gray-700">Evidence: {evidence}</p>
      <p className="mt-1 text-sm text-gray-700">Suggested action: {action}</p>
      {href ? <Link className="focus-ring btn btn-secondary mt-3 inline-flex text-xs" href={href}>Open mapping</Link> : null}
    </article>
  );
}
