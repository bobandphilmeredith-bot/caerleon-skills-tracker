"use client";

import Link from "next/link";
import { CoverageHeatmap } from "@/components/Heatmap";
import { FrameworkCoveragePanel } from "@/components/FrameworkCoveragePanel";
import { PageHeader } from "@/components/PageHeader";
import { CoverageAlerts } from "@/components/PlanningVisibilityNotes";
import { RevisitFrequency } from "@/components/RevisitFrequency";
import { useCurrentSchoolData } from "@/lib/currentSchool";
import { frameworkReferenceText, frameworkShortLabel, matchingFrameworkReferences, primaryReferenceForFramework } from "@/lib/mappingFrameworks";
import type { Dashboard } from "@/lib/types";
import { themeForDashboard, themeForFramework } from "@/lib/theme";

export function DashboardPage({ dashboard }: { dashboard: Dashboard }) {
  const { subjectAoleMap, mappings, subjects, yearGroups, frameworkCoverage, crossCuttingThemes } = useCurrentSchoolData();
  const theme = themeForDashboard(dashboard.title, dashboard.coverage?.framework);
  const isWholeSchoolDashboard = dashboard.title === "Whole-school Dashboard";
  const isThemesDashboard = dashboard.title === "Cross-cutting Themes Dashboard";
  const frameworkEntries = dashboard.coverage ? mappings.filter((entry) => matchingFrameworkReferences(entry, dashboard.coverage?.framework).length > 0) : [];
  const themeEntries = isThemesDashboard ? mappings.filter((entry) => themeLinkCount(entry) > 0) : [];
  const recentEntries = [...(isWholeSchoolDashboard ? mappings : dashboard.coverage ? frameworkEntries : isThemesDashboard ? themeEntries : dashboard.entries)]
    .sort((a, b) => b.lastMappedDate.localeCompare(a.lastMappedDate))
    .slice(0, 8);

  return (
    <section className="space-y-6">
      <PageHeader eyebrow={dashboard.eyebrow} title={dashboard.title} description={dashboard.description} accent={theme.accent} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboard.cards.map((card) => (
          <article key={card.label} className="rounded-lg border bg-white p-5 shadow-sm" style={{ borderColor: theme.border }}>
            <div className="text-sm font-semibold text-gray-500">{card.label}</div>
            <div className="mt-3 text-3xl font-bold" style={{ color: theme.accent }}>
              {card.value}
            </div>
            <p className="mt-2 text-sm leading-6 text-gray-600">{card.note}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
        <CoverageHeatmap
          title={dashboard.heatmapTitle}
          description={dashboard.heatmapDescription}
          rows={dashboard.heatmapRows}
          rowTitles={dashboard.heatmapRowTitles}
          columns={dashboard.heatmapColumns}
          values={dashboard.heatmapValues}
          cells={dashboard.heatmapCells}
          theme={theme}
        />

        <CoverageAlerts dashboard={dashboard} mappings={mappings} subjects={subjects} yearGroups={yearGroups} frameworkCoverage={frameworkCoverage} crossCuttingThemes={crossCuttingThemes} theme={theme} />
      </div>

      {dashboard.coverage ? <FrameworkCoveragePanel coverage={dashboard.coverage} entries={mappings} yearGroups={yearGroups} theme={theme} /> : null}

      <RevisitFrequency framework={dashboard.coverage?.framework} theme={theme} />

      {isWholeSchoolDashboard ? (
        <WholeSchoolEvidenceSections mappings={mappings} subjects={subjects} subjectAoleMap={subjectAoleMap} yearGroups={yearGroups} theme={theme} />
      ) : dashboard.coverage ? (
        <FrameworkEvidenceSections coverage={dashboard.coverage} mappings={mappings} subjects={subjects} subjectAoleMap={subjectAoleMap} yearGroups={yearGroups} theme={theme} />
      ) : isThemesDashboard ? (
        <ThemeEvidenceSections mappings={mappings} subjects={subjects} subjectAoleMap={subjectAoleMap} yearGroups={yearGroups} themes={crossCuttingThemes} theme={theme} />
      ) : (
        null
      )}

      <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">{recentEntriesTitle(dashboard)}</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="py-3 pr-4 font-bold">Subject</th>
                <th className="py-3 pr-4 font-bold">Optional AoLE</th>
                <th className="py-3 pr-4 font-bold">Framework</th>
                <th className="py-3 pr-4 font-bold">Strand</th>
                <th className="py-3 pr-4 font-bold">Context</th>
                <th className="py-3 pr-4 font-bold">Year</th>
              </tr>
            </thead>
            <tbody>
              {!recentEntries.length ? (
                <tr>
                  <td className="py-4 pr-4 text-gray-600" colSpan={6}>
                    No curriculum mapping entries have been created yet.
                  </td>
                </tr>
              ) : null}
              {recentEntries.map((entry) => {
                const references = dashboard.coverage?.framework ? matchingFrameworkReferences(entry, dashboard.coverage.framework) : matchingFrameworkReferences(entry);
                const primaryReference = primaryReferenceForFramework(entry, dashboard.coverage?.framework);
                return (
                  <tr key={`${entry.id}-${dashboard.coverage?.framework ?? "all"}`} className="border-b border-gray-100">
                    <td className="py-3 pr-4 font-semibold text-gray-900">{entry.subject}</td>
                    <td className="py-3 pr-4 text-gray-700">{subjectAoleMap[entry.subject] ?? "Not set"}</td>
                    <td className="py-3 pr-4">
                      <FrameworkBadge framework={primaryReference?.framework ?? entry.framework} />
                    </td>
                    <td className="py-3 pr-4 text-gray-700">{references.map((reference) => reference.strandShortName ?? reference.strand).join(", ") || "No strand reference"}</td>
                    <td className="py-3 pr-4 text-gray-700">{references.map(frameworkReferenceText).join(", ") || entry.context}</td>
                    <td className="py-3 pr-4 text-gray-700">{entry.year}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

function WholeSchoolEvidenceSections({
  mappings,
  subjects,
  subjectAoleMap,
  yearGroups,
  theme
}: {
  mappings: ReturnType<typeof useCurrentSchoolData>["mappings"];
  subjects: string[];
  subjectAoleMap: Record<string, string | undefined>;
  yearGroups: string[];
  theme: ReturnType<typeof themeForDashboard>;
}) {
  const subjectRows = subjects
    .map((subject) => {
      const subjectMappings = mappings.filter((entry) => entry.subject === subject);
      return {
        subject,
        aole: subjectAoleMap[subject] ?? "Not set",
        entries: subjectMappings.length,
        literacy: countFrameworkReferences(subjectMappings, "Literacy"),
        numeracy: countFrameworkReferences(subjectMappings, "Numeracy"),
        dcf: countFrameworkReferences(subjectMappings, "DCF"),
        cct: countThemeLinks(subjectMappings),
        years: unique(subjectMappings.map((entry) => entry.year)),
        lastUpdated: latestDate(subjectMappings)
      };
    })
    .sort((a, b) => b.entries - a.entries || a.subject.localeCompare(b.subject));

  const yearRows = yearGroups.map((year) => {
    const yearMappings = mappings.filter((entry) => entry.year === year);
    return {
      year,
      entries: yearMappings.length,
      subjects: unique(yearMappings.map((entry) => entry.subject)).length,
      literacy: countFrameworkReferences(yearMappings, "Literacy"),
      numeracy: countFrameworkReferences(yearMappings, "Numeracy"),
      dcf: countFrameworkReferences(yearMappings, "DCF"),
      cct: countThemeLinks(yearMappings)
    };
  });

  const balanceRows = [
    frameworkBalanceRow("Literacy", mappings),
    frameworkBalanceRow("Numeracy", mappings),
    frameworkBalanceRow("DCF", mappings),
    themeBalanceRow(mappings)
  ];

  const unmappedSubjects = subjectRows.filter((row) => row.entries === 0).length;
  const entriesWithoutSkills = mappings.filter((entry) => matchingFrameworkReferences(entry).length === 0).length;
  const entriesWithoutThemes = mappings.filter((entry) => themeLinkCount(entry) === 0).length;

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
        <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Subject Evidence Overview</h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">All configured subjects are shown, including departments with no mapped curriculum entries yet.</p>
            </div>
            <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: theme.soft, color: theme.text }}>
              {subjects.length} subjects
            </span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="py-3 pr-4 font-bold">Subject</th>
                  <th className="py-3 pr-4 font-bold">Entries</th>
                  <th className="py-3 pr-4 font-bold">Literacy</th>
                  <th className="py-3 pr-4 font-bold">Numeracy</th>
                  <th className="py-3 pr-4 font-bold">DCF</th>
                  <th className="py-3 pr-4 font-bold">CCT</th>
                  <th className="py-3 pr-4 font-bold">Year groups</th>
                  <th className="py-3 pr-4 font-bold">Last updated</th>
                </tr>
              </thead>
              <tbody>
                {subjectRows.map((row) => (
                  <tr key={row.subject} className="border-b border-gray-100">
                    <td className="py-3 pr-4">
                      <div className="font-bold text-gray-900">{row.subject}</div>
                      <div className="text-xs font-semibold text-gray-500">AoLE: {row.aole}</div>
                    </td>
                    <td className="py-3 pr-4 font-bold" style={{ color: theme.accent }}>
                      {row.entries}
                    </td>
                    <td className="py-3 pr-4 text-gray-700">{row.literacy}</td>
                    <td className="py-3 pr-4 text-gray-700">{row.numeracy}</td>
                    <td className="py-3 pr-4 text-gray-700">{row.dcf}</td>
                    <td className="py-3 pr-4 text-gray-700">{row.cct}</td>
                    <td className="py-3 pr-4 text-gray-700">{row.years.join(", ") || "None"}</td>
                    <td className="py-3 pr-4 text-gray-700">{row.lastUpdated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Year Group Evidence Summary</h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">A quick check of where mapped entries and evidence links sit across the school.</p>
          <div className="mt-4 space-y-3">
            {yearRows.map((row) => (
              <div key={row.year} className="rounded-md border border-gray-200 p-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold text-gray-900">{row.year}</h3>
                  <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: theme.soft, color: theme.text }}>
                    {row.entries ? `${row.entries} entries` : "No mappings"}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold text-gray-600">
                  <span>{row.subjects} subjects</span>
                  <span>Literacy {row.literacy}</span>
                  <span>Numeracy {row.numeracy}</span>
                  <span>DCF {row.dcf}</span>
                  <span className="col-span-2">CCT {row.cct}</span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Framework and Theme Evidence Balance</h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">Counts are based on live framework and cross-cutting theme links attached to curriculum entries.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {balanceRows.map((row) => (
              <div key={row.label} className="rounded-md border border-gray-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold text-gray-900">{row.label}</h3>
                  <span className="text-2xl font-bold" style={{ color: theme.accent }}>
                    {row.references}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-600">{row.references === 1 ? "reference" : "references"} across mapped curriculum entries.</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold text-gray-500">
                  <span>{row.entries} entries</span>
                  <span>{row.subjects} subjects</span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Whole-school Checks</h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">Useful prompts for curriculum leaders before drilling into subject pages.</p>
          <div className="mt-4 space-y-3">
            <CheckRow value={unmappedSubjects} label={unmappedSubjects === 1 ? "subject has no mapped entries" : "subjects have no mapped entries"} theme={theme} />
            <CheckRow value={entriesWithoutSkills} label={entriesWithoutSkills === 1 ? "entry has no skill references" : "entries have no skill references"} theme={theme} />
            <CheckRow value={entriesWithoutThemes} label={entriesWithoutThemes === 1 ? "entry has no CCT element evidence" : "entries have no CCT element evidence"} theme={theme} />
            <Link href="/edit-curriculum" className="inline-flex rounded-md border px-4 py-2 text-sm font-bold" style={{ borderColor: theme.border, color: theme.text }}>
              Open curriculum browser
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}

function FrameworkEvidenceSections({
  coverage,
  mappings,
  subjects,
  subjectAoleMap,
  yearGroups,
  theme
}: {
  coverage: NonNullable<Dashboard["coverage"]>;
  mappings: ReturnType<typeof useCurrentSchoolData>["mappings"];
  subjects: string[];
  subjectAoleMap: Record<string, string | undefined>;
  yearGroups: string[];
  theme: ReturnType<typeof themeForDashboard>;
}) {
  const framework = coverage.framework;
  const frameworkLabel = frameworkShortLabel(framework);
  const areaMappings = mappings.filter((entry) => matchingFrameworkReferences(entry, framework).length > 0);
  const subjectRows = subjects
    .map((subject) => {
      const subjectMappings = areaMappings.filter((entry) => entry.subject === subject);
      return {
        subject,
        aole: subjectAoleMap[subject] ?? "Not set",
        entries: subjectMappings.length,
        references: subjectMappings.reduce((sum, entry) => sum + matchingFrameworkReferences(entry, framework).length, 0),
        years: unique(subjectMappings.map((entry) => entry.year)),
        lastUpdated: latestDate(subjectMappings)
      };
    })
    .sort((a, b) => b.references - a.references || b.entries - a.entries || a.subject.localeCompare(b.subject));

  const yearRows = yearGroups.map((year) => {
    const yearMappings = areaMappings.filter((entry) => entry.year === year);
    return {
      year,
      entries: yearMappings.length,
      references: yearMappings.reduce((sum, entry) => sum + matchingFrameworkReferences(entry, framework).length, 0),
      subjects: unique(yearMappings.map((entry) => entry.subject)).length
    };
  });

  const subjectsWithoutEvidence = subjectRows.filter((row) => row.references === 0).length;
  const yearGroupsWithoutEvidence = yearRows.filter((row) => row.references === 0).length;

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
        <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{frameworkLabel} Evidence by Subject</h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">Every configured subject is shown, so gaps are visible rather than hidden by recent activity.</p>
            </div>
            <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: theme.soft, color: theme.text }}>
              {areaMappings.length} entries
            </span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="py-3 pr-4 font-bold">Subject</th>
                  <th className="py-3 pr-4 font-bold">Entries</th>
                  <th className="py-3 pr-4 font-bold">References</th>
                  <th className="py-3 pr-4 font-bold">Year groups</th>
                  <th className="py-3 pr-4 font-bold">Last updated</th>
                </tr>
              </thead>
              <tbody>
                {subjectRows.map((row) => (
                  <tr key={row.subject} className="border-b border-gray-100">
                    <td className="py-3 pr-4">
                      <div className="font-bold text-gray-900">{row.subject}</div>
                      <div className="text-xs font-semibold text-gray-500">AoLE: {row.aole}</div>
                    </td>
                    <td className="py-3 pr-4 text-gray-700">{row.entries}</td>
                    <td className="py-3 pr-4 font-bold" style={{ color: theme.accent }}>
                      {row.references}
                    </td>
                    <td className="py-3 pr-4 text-gray-700">{row.years.join(", ") || "None"}</td>
                    <td className="py-3 pr-4 text-gray-700">{row.lastUpdated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">{frameworkLabel} by Year Group</h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">Shows spread across year groups using live curriculum mapping links.</p>
          <div className="mt-4 space-y-3">
            {yearRows.map((row) => (
              <div key={row.year} className="rounded-md border border-gray-200 p-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold text-gray-900">{row.year}</h3>
                  <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: theme.soft, color: theme.text }}>
                    {row.references ? `${row.references} refs` : "No evidence"}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold text-gray-600">
                  <span>{row.entries} entries</span>
                  <span>{row.subjects} subjects</span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">{frameworkLabel} Strand Balance</h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">Strand counts include unused strands, so less-used areas remain visible.</p>
          <div className="mt-4 space-y-3">
            {coverage.strands.map((strand) => (
              <div key={strand.strand} className="rounded-md border border-gray-200 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{strand.strandShortName ?? strand.strand}</h3>
                    {strand.strandShortName ? <p className="mt-1 text-xs text-gray-500">{strand.strand}</p> : null}
                  </div>
                  <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: theme.soft, color: theme.text }}>
                    {strand.count} refs
                  </span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">{frameworkLabel} Checks</h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">Use these to spot departments or year groups that may need review.</p>
          <div className="mt-4 space-y-3">
            <CheckRow value={subjectsWithoutEvidence} label={subjectsWithoutEvidence === 1 ? `subject has no ${frameworkLabel} evidence` : `subjects have no ${frameworkLabel} evidence`} theme={theme} />
            <CheckRow value={yearGroupsWithoutEvidence} label={yearGroupsWithoutEvidence === 1 ? `year group has no ${frameworkLabel} evidence` : `year groups have no ${frameworkLabel} evidence`} theme={theme} />
            <CheckRow value={coverage.unmappedElements.length} label={coverage.unmappedElements.length === 1 ? "element has no evidence" : "elements have no evidence"} theme={theme} />
            <Link href="/edit-curriculum" className="inline-flex rounded-md border px-4 py-2 text-sm font-bold" style={{ borderColor: theme.border, color: theme.text }}>
              Open curriculum browser
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}

function ThemeEvidenceSections({
  mappings,
  subjects,
  subjectAoleMap,
  yearGroups,
  themes,
  theme
}: {
  mappings: ReturnType<typeof useCurrentSchoolData>["mappings"];
  subjects: string[];
  subjectAoleMap: Record<string, string | undefined>;
  yearGroups: string[];
  themes: ReturnType<typeof useCurrentSchoolData>["crossCuttingThemes"];
  theme: ReturnType<typeof themeForDashboard>;
}) {
  const themeMappings = mappings.filter((entry) => themeLinkCount(entry) > 0);
  const subjectRows = subjects
    .map((subject) => {
      const subjectMappings = themeMappings.filter((entry) => entry.subject === subject);
      return {
        subject,
        aole: subjectAoleMap[subject] ?? "Not set",
        entries: subjectMappings.length,
        references: countThemeLinks(subjectMappings),
        years: unique(subjectMappings.map((entry) => entry.year)),
        lastUpdated: latestDate(subjectMappings)
      };
    })
    .sort((a, b) => b.references - a.references || b.entries - a.entries || a.subject.localeCompare(b.subject));

  const yearRows = yearGroups.map((year) => {
    const yearMappings = themeMappings.filter((entry) => entry.year === year);
    return {
      year,
      entries: yearMappings.length,
      references: countThemeLinks(yearMappings),
      subjects: unique(yearMappings.map((entry) => entry.subject)).length
    };
  });

  const themeRows = themes
    .filter((item) => item.active)
    .map((item) => {
      const entriesWithTheme = mappings.filter((entry) => entryHasTheme(entry, item.id, item.name));
      return {
        name: item.name,
        references: mappings.reduce((sum, entry) => sum + themeReferenceCount(entry, item.id, item.name), 0),
        entries: entriesWithTheme.length,
        subjects: unique(entriesWithTheme.map((entry) => entry.subject)).length
      };
    })
    .sort((a, b) => b.references - a.references || a.name.localeCompare(b.name));

  const subjectsWithoutThemes = subjectRows.filter((row) => row.references === 0).length;
  const yearGroupsWithoutThemes = yearRows.filter((row) => row.references === 0).length;

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
        <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">CCT Evidence by Subject</h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">Every subject is shown, including subjects with no cross-cutting theme element evidence.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="py-3 pr-4 font-bold">Subject</th>
                  <th className="py-3 pr-4 font-bold">Entries</th>
                  <th className="py-3 pr-4 font-bold">Theme refs</th>
                  <th className="py-3 pr-4 font-bold">Year groups</th>
                  <th className="py-3 pr-4 font-bold">Last updated</th>
                </tr>
              </thead>
              <tbody>
                {subjectRows.map((row) => (
                  <tr key={row.subject} className="border-b border-gray-100">
                    <td className="py-3 pr-4">
                      <div className="font-bold text-gray-900">{row.subject}</div>
                      <div className="text-xs font-semibold text-gray-500">AoLE: {row.aole}</div>
                    </td>
                    <td className="py-3 pr-4 text-gray-700">{row.entries}</td>
                    <td className="py-3 pr-4 font-bold" style={{ color: theme.accent }}>
                      {row.references}
                    </td>
                    <td className="py-3 pr-4 text-gray-700">{row.years.join(", ") || "None"}</td>
                    <td className="py-3 pr-4 text-gray-700">{row.lastUpdated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">CCT by Year Group</h2>
          <div className="mt-4 space-y-3">
            {yearRows.map((row) => (
              <div key={row.year} className="rounded-md border border-gray-200 p-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold text-gray-900">{row.year}</h3>
                  <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: theme.soft, color: theme.text }}>
                    {row.references ? `${row.references} refs` : "No evidence"}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold text-gray-600">
                  <span>{row.entries} entries</span>
                  <span>{row.subjects} subjects</span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Theme Balance</h2>
          <div className="mt-4 space-y-3">
            {themeRows.map((row) => (
              <div key={row.name} className="rounded-md border border-gray-200 p-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold text-gray-900">{row.name}</h3>
                  <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: theme.soft, color: theme.text }}>
                    {row.references} refs
                  </span>
                </div>
                <p className="mt-2 text-xs font-semibold text-gray-500">
                  {row.entries} entries · {row.subjects} subjects
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">CCT Checks</h2>
          <div className="mt-4 space-y-3">
            <CheckRow value={subjectsWithoutThemes} label={subjectsWithoutThemes === 1 ? "subject has no CCT evidence" : "subjects have no CCT evidence"} theme={theme} />
            <CheckRow value={yearGroupsWithoutThemes} label={yearGroupsWithoutThemes === 1 ? "year group has no CCT evidence" : "year groups have no CCT evidence"} theme={theme} />
            <Link href="/edit-curriculum" className="inline-flex rounded-md border px-4 py-2 text-sm font-bold" style={{ borderColor: theme.border, color: theme.text }}>
              Open curriculum browser
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}

function CheckRow({ value, label, theme }: { value: number; label: string; theme: ReturnType<typeof themeForDashboard> }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-gray-50 p-3">
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: theme.soft, color: theme.text }}>
        {value}
      </span>
    </div>
  );
}

function countFrameworkReferences(entries: ReturnType<typeof useCurrentSchoolData>["mappings"], framework: "Literacy" | "Numeracy" | "DCF") {
  return entries.reduce((sum, entry) => sum + matchingFrameworkReferences(entry).filter((reference) => frameworkKey(reference.frameworkShortName ?? reference.framework) === framework).length, 0);
}

function countThemeLinks(entries: ReturnType<typeof useCurrentSchoolData>["mappings"]) {
  return entries.reduce((sum, entry) => sum + themeLinkCount(entry), 0);
}

function themeLinkCount(entry: ReturnType<typeof useCurrentSchoolData>["mappings"][number]) {
  return entry.crossCuttingThemeElementIds?.length ?? entry.crossCuttingThemeElementLinks?.length ?? entry.crossCuttingThemeIds?.length ?? entry.crossCuttingThemes?.length ?? 0;
}

function frameworkBalanceRow(framework: "Literacy" | "Numeracy" | "DCF", entries: ReturnType<typeof useCurrentSchoolData>["mappings"]) {
  const entriesWithFramework = entries.filter((entry) => matchingFrameworkReferences(entry).some((reference) => frameworkKey(reference.frameworkShortName ?? reference.framework) === framework));
  return {
    label: framework,
    references: countFrameworkReferences(entries, framework),
    entries: entriesWithFramework.length,
    subjects: unique(entriesWithFramework.map((entry) => entry.subject)).length
  };
}

function themeBalanceRow(entries: ReturnType<typeof useCurrentSchoolData>["mappings"]) {
  const entriesWithThemes = entries.filter((entry) => themeLinkCount(entry) > 0);
  return {
    label: "Cross-cutting themes",
    references: countThemeLinks(entries),
    entries: entriesWithThemes.length,
    subjects: unique(entriesWithThemes.map((entry) => entry.subject)).length
  };
}

function frameworkKey(framework: string) {
  return frameworkShortLabel(framework);
}

function latestDate(entries: ReturnType<typeof useCurrentSchoolData>["mappings"]) {
  const latest = entries.map((entry) => entry.lastMappedDate).filter(Boolean).sort((a, b) => b.localeCompare(a))[0];
  return latest ?? "No mappings";
}

function unique(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

function recentEntriesTitle(dashboard: Dashboard) {
  if (dashboard.title === "Whole-school Dashboard") return "Recent Whole-school Mapping Entries";
  if (dashboard.coverage?.framework) return `Recent ${frameworkShortLabel(dashboard.coverage.framework)} Mapping Entries`;
  if (dashboard.title === "Cross-cutting Themes Dashboard") return "Recent Cross-cutting Theme Mapping Entries";
  return "Recent Curriculum Mapping Entries";
}

function entryHasTheme(entry: ReturnType<typeof useCurrentSchoolData>["mappings"][number], themeId: string, themeName: string) {
  return themeReferenceCount(entry, themeId, themeName) > 0;
}

function themeReferenceCount(entry: ReturnType<typeof useCurrentSchoolData>["mappings"][number], themeId: string, themeName: string) {
  const elementLinks = entry.crossCuttingThemeElementLinks?.filter((link) => link.themeId === themeId).length ?? 0;
  const themeIds = entry.crossCuttingThemeIds?.filter((id) => id === themeId).length ?? 0;
  const themeNames = entry.crossCuttingThemes?.filter((name) => name === themeName).length ?? 0;
  return elementLinks + themeIds + themeNames;
}

function FrameworkBadge({ framework }: { framework: string }) {
  const theme = themeForFramework(framework);
  return (
    <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: theme.soft, color: theme.text, border: `1px solid ${theme.border}` }}>
      {frameworkShortLabel(framework)}
    </span>
  );
}
