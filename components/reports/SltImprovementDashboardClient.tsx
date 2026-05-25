"use client";

import Link from "next/link";
import { AccessDenied } from "@/components/AccessDenied";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/lib/auth";
import { useCurrentSchool } from "@/lib/currentSchool";
import {
  buildReportData,
  countBy,
  frameworkCount,
  groupBy,
  normaliseYear,
  progressionCounts,
  reportFrameworks,
  reportSteps,
  reportYearGroups,
  subjectHasFramework,
  themeElementCount,
  unique,
  type MappingEvidence,
  type ReportFramework,
  type ThemeEvidenceItem
} from "@/lib/reporting";
import { areaThemes, themeForFramework } from "@/lib/theme";

type SubjectRow = {
  subject: string;
  entries: MappingEvidence[];
  literacy: number;
  numeracy: number;
  dcf: number;
  cct: number;
  years: string[];
  status: "Green" | "Amber" | "Red";
  reason: string;
};

export function SltImprovementDashboardClient() {
  const { data, liveDiagnostics } = useCurrentSchool();
  const { canManageSchool, isDemoMode } = useAuth();
  const reportData = buildReportData(data.mappings, data.crossCuttingThemes);
  const subjectRows = data.subjects.map((subject) => buildSubjectRow(subject, reportData.subjectEntries[subject] ?? []));
  const allFrameworkRefs = reportData.entries.flatMap((entry) => entry.frameworkRefs);
  const allThemeItems = reportData.entries.flatMap((entry) => entry.themeItems);
  const stepCounts = progressionCounts(allFrameworkRefs);
  const noMappingSubjects = subjectRows.filter((row) => row.entries.length === 0);
  const schemesWithoutCct = reportData.entries.filter((entry) => themeElementCount(entry) === 0);
  const alerts = buildWholeSchoolAlerts(subjectRows, reportData.entries, allThemeItems);
  const recommendations = buildRecommendations(subjectRows, reportData.entries, allThemeItems);
  const cctRows = data.crossCuttingThemes.map((theme) => buildThemeRow(theme.id, theme.name, reportData.entries));

  if (!canManageSchool) {
    return <AccessDenied title="SLT dashboard restricted" message="Only school admins and platform admins can view whole-school improvement reports." />;
  }

  if (!isDemoMode && !liveDiagnostics) {
    return (
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-950">Loading live report data</h1>
        <p className="mt-2 text-sm text-gray-600">Preparing the whole-school improvement dashboard from Supabase.</p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Curriculum Reporting"
        title="Whole-School Skills & Themes Improvement Dashboard"
        description="Identify strengths, gaps and improvement priorities across Literacy, Numeracy, DCF and cross-cutting themes."
        accent={areaThemes.overview.accent}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Curriculum mappings" value={reportData.entries.length} note="Real curriculum_mappings rows." />
        <SummaryCard label="Subjects represented" value={subjectRows.filter((row) => row.entries.length > 0).length} note="Subjects with at least one mapping." />
        <SummaryCard label="Literacy references" value={countFramework(reportData.entries, "Literacy")} note="Framework link rows." framework="Literacy" />
        <SummaryCard label="Numeracy references" value={countFramework(reportData.entries, "Numeracy")} note="Framework link rows." framework="Numeracy" />
        <SummaryCard label="DCF references" value={countFramework(reportData.entries, "DCF")} note="Framework link rows." framework="DCF" />
        <SummaryCard label="CCT element references" value={allThemeItems.filter((item) => item.elementId || item.element).length} note="Theme element link rows." framework="Cross-cutting Themes" />
        <SummaryCard label="Subjects with no mappings" value={noMappingSubjects.length} note="Subjects needing initial curriculum evidence." />
        <SummaryCard label="Schemes with no CCT" value={schemesWithoutCct.length} note="Mapped activities with no theme element evidence." framework="Cross-cutting Themes" />
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-gray-950">Whole-school gap alerts</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {alerts.length ? alerts.map((alert) => <ActionCard key={alert.issue} {...alert} />) : <p className="rounded-md bg-gray-50 p-3 text-sm font-semibold text-gray-700">No major whole-school coverage alerts at the moment.</p>}
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-gray-950">Department RAG summary</h2>
          <span className="text-sm font-semibold text-gray-500">Status is calculated from mapping breadth, framework range and CCT evidence.</span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.12em] text-gray-500">
              <tr>
                <th className="py-2 pr-4">Subject</th>
                <th className="py-2 pr-4">Entries</th>
                <th className="py-2 pr-4">Literacy</th>
                <th className="py-2 pr-4">Numeracy</th>
                <th className="py-2 pr-4">DCF</th>
                <th className="py-2 pr-4">CCT</th>
                <th className="py-2 pr-4">Year groups</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {subjectRows.map((row) => (
                <tr key={row.subject}>
                  <th className="py-3 pr-4 font-bold text-gray-900">{row.subject}</th>
                  <td className="py-3 pr-4">{row.entries.length}</td>
                  <td className="py-3 pr-4">{row.literacy}</td>
                  <td className="py-3 pr-4">{row.numeracy}</td>
                  <td className="py-3 pr-4">{row.dcf}</td>
                  <td className="py-3 pr-4">{row.cct}</td>
                  <td className="py-3 pr-4">{row.years.length ? row.years.join(", ") : "None"}</td>
                  <td className="py-3 pr-4">
                    <span className="rounded-full px-2 py-1 text-xs font-bold" style={{ backgroundColor: statusTheme(row.status).soft, color: statusTheme(row.status).text }}>
                      {row.status}
                    </span>
                    <p className="mt-1 text-xs text-gray-500">{row.reason}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <Link className="focus-ring btn btn-secondary text-xs" href={`/subject-overview/${encodeURIComponent(row.subject)}`}>
                      Drill down
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-gray-950">Framework coverage by subject</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {subjectRows.map((row) => (
            <article key={row.subject} className="rounded-md border border-gray-200 bg-gray-50 p-3">
              <h3 className="font-bold text-gray-950">{row.subject}</h3>
              <p className="mt-2 text-sm text-gray-700">Literacy {row.literacy} · Numeracy {row.numeracy} · DCF {row.dcf} · CCT {row.cct}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-gray-950">CCT theme equity check</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {cctRows.map((row) => (
            <article key={row.themeId} className="rounded-md border border-gray-200 bg-gray-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold text-gray-950">{row.theme}</h3>
                <span className="rounded-full px-2 py-1 text-xs font-bold" style={{ backgroundColor: areaThemes.themes.soft, color: areaThemes.themes.text }}>{row.total} references</span>
              </div>
              <p className="mt-2 text-sm text-gray-700">Subjects: {row.subjects.length ? row.subjects.join(", ") : "None yet"}</p>
              <p className="mt-1 text-sm text-gray-700">Year groups: {row.years.length ? row.years.join(", ") : "None yet"}</p>
              <p className="mt-1 text-sm text-gray-700">Elements: {row.elements.length ? row.elements.join(", ") : "No elements represented"}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-gray-950">Progression overview</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {reportSteps.map((step) => (
            <SummaryCard key={step} label={`Step ${step}`} value={stepCounts[step] ?? 0} note="Skill references mapped at this step." />
          ))}
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <ActionCard
            issue="Subjects with no Step 5 references"
            evidence={`${subjectsWithoutStep(subjectRows, 5).length} subjects have no Step 5 skill references.`}
            action="Check Key Stage 4 schemes for appropriate Step 5 Literacy, Numeracy or DCF evidence."
          />
          <ActionCard
            issue="Subjects concentrated at one progression step"
            evidence={`${subjectsConcentratedAtOneStep(subjectRows).length} subjects have all skill links at one progression step.`}
            action="Review whether progression evidence reflects the spread of year groups being taught."
          />
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-gray-950">Recommended SLT actions</h2>
        <div className="mt-4 space-y-3">
          {recommendations.map((recommendation) => <ActionCard key={recommendation.issue} {...recommendation} />)}
        </div>
      </section>
    </section>
  );
}

function buildSubjectRow(subject: string, entries: MappingEvidence[]): SubjectRow {
  const literacy = countFramework(entries, "Literacy");
  const numeracy = countFramework(entries, "Numeracy");
  const dcf = countFramework(entries, "DCF");
  const cct = entries.reduce((total, entry) => total + themeElementCount(entry), 0);
  const years = unique(entries.map((entry) => normaliseYear(entry.mapping.year))).sort((a, b) => reportYearGroups.indexOf(a) - reportYearGroups.indexOf(b));
  const representedFrameworkTypes = [literacy > 0, numeracy > 0, dcf > 0].filter(Boolean).length;
  if (!entries.length) return { subject, entries, literacy, numeracy, dcf, cct, years, status: "Red", reason: "No mappings" };
  if (entries.length < 2 || representedFrameworkTypes < 2 || cct === 0 || years.length < 2) return { subject, entries, literacy, numeracy, dcf, cct, years, status: "Amber", reason: "Some gaps" };
  return { subject, entries, literacy, numeracy, dcf, cct, years, status: "Green", reason: "Broad evidence" };
}

function buildWholeSchoolAlerts(subjectRows: SubjectRow[], entries: MappingEvidence[], themeItems: ThemeEvidenceItem[]) {
  const alerts: { issue: string; evidence: string; action: string }[] = [];
  const noDcf = subjectRows.filter((row) => row.dcf === 0);
  const noCct = subjectRows.filter((row) => row.cct === 0);
  const byYear = countBy(entries, (entry) => normaliseYear(entry.mapping.year));
  const minYear = reportYearGroups.map((year) => ({ year, count: byYear[year] ?? 0 })).sort((a, b) => a.count - b.count)[0];
  if (noDcf.length) alerts.push({ issue: `${noDcf.length} subjects have no DCF references.`, evidence: noDcf.map((row) => row.subject).slice(0, 6).join(", "), action: "Ask these departments to identify authentic digital competence opportunities." });
  if (noCct.length) alerts.push({ issue: `${noCct.length} subjects have no CCT element evidence.`, evidence: noCct.map((row) => row.subject).slice(0, 6).join(", "), action: "Review wider curriculum themes with subject leads." });
  if (minYear && minYear.count === 0) alerts.push({ issue: `${minYear.year} has no mapped opportunities.`, evidence: "0 curriculum mappings for this year group.", action: "Prioritise mapping for this year group." });
  if (minYear && minYear.count > 0) alerts.push({ issue: `${minYear.year} has fewer mapped opportunities than other year groups.`, evidence: `${minYear.count} mapped entries.`, action: "Check whether mapping is incomplete or genuinely lighter in this year group." });
  const themeCounts = countBy(themeItems, (item) => item.theme);
  const underusedTheme = Object.entries(themeCounts).sort((a, b) => a[1] - b[1])[0];
  if (underusedTheme) alerts.push({ issue: `${underusedTheme[0]} is the least evidenced CCT theme.`, evidence: `${underusedTheme[1]} element references.`, action: "Review curriculum opportunities that could evidence this theme authentically." });
  return alerts.slice(0, 5);
}

function buildRecommendations(subjectRows: SubjectRow[], entries: MappingEvidence[], themeItems: ThemeEvidenceItem[]) {
  const recommendations: { issue: string; evidence: string; action: string }[] = [];
  const noDcf = subjectRows.filter((row) => row.dcf === 0);
  const strongSubjects = subjectRows.filter((row) => row.status === "Green");
  const stepCounts = progressionCounts(entries.flatMap((entry) => entry.frameworkRefs));
  if (noDcf.length) recommendations.push({ issue: "Digital competence visibility", evidence: `${noDcf.length} subjects have no DCF references.`, action: "Ask those departments to map one authentic DCF opportunity per year group." });
  if ((stepCounts[5] ?? 0) < (stepCounts[3] ?? 0) || (stepCounts[5] ?? 0) < (stepCounts[4] ?? 0)) {
    recommendations.push({ issue: "Step 5 progression", evidence: `Step 5 has ${stepCounts[5] ?? 0} links across the school.`, action: "Check Key Stage 4 mapping and MAT challenge visibility." });
  }
  const themeSubjects = groupBy(themeItems, (item) => item.theme);
  const lowTheme = Object.entries(themeSubjects).sort((a, b) => unique(a[1].map((item) => item.theme)).length - unique(b[1].map((item) => item.theme)).length)[0];
  if (lowTheme) recommendations.push({ issue: "Cross-cutting theme spread", evidence: `${lowTheme[0]} has ${lowTheme[1].length} references.`, action: "Review whether evidence is concentrated in a small number of departments." });
  if (strongSubjects.length) recommendations.push({ issue: "Use strong mapping as a model", evidence: `${strongSubjects.map((row) => row.subject).slice(0, 4).join(", ")} show broader evidence.`, action: "Use these departments as examples in curriculum improvement discussions." });
  if (!recommendations.length) recommendations.push({ issue: "Continue routine review", evidence: "No urgent whole-school reporting gaps were detected.", action: "Use subject drill-downs to keep mapping quality under review." });
  return recommendations.slice(0, 5);
}

function buildThemeRow(themeId: string, theme: string, entries: MappingEvidence[]) {
  const evidence = entries.flatMap((entry) => entry.themeItems.map((item) => ({ ...item, mapping: entry.mapping }))).filter((item) => item.themeId === themeId || item.theme === theme);
  return {
    themeId,
    theme,
    total: evidence.length,
    subjects: unique(evidence.map((item) => item.mapping.subject)),
    years: unique(evidence.map((item) => normaliseYear(item.mapping.year))).sort((a, b) => reportYearGroups.indexOf(a) - reportYearGroups.indexOf(b)),
    elements: unique(evidence.map((item) => item.element ?? "").filter(Boolean))
  };
}

function subjectsWithoutStep(rows: SubjectRow[], step: number) {
  return rows.filter((row) => !row.entries.some((entry) => entry.frameworkRefs.some((reference) => reference.progressionStep === step || reference.progressionReference === `Step ${step}`)));
}

function subjectsConcentratedAtOneStep(rows: SubjectRow[]) {
  return rows.filter((row) => {
    const counts = progressionCounts(row.entries.flatMap((entry) => entry.frameworkRefs));
    return Object.values(counts).filter((count) => count > 0).length === 1;
  });
}

function countFramework(entries: MappingEvidence[], framework: ReportFramework) {
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

function ActionCard({ issue, evidence, action }: { issue: string; evidence: string; action: string }) {
  return (
    <article className="rounded-md border border-gray-200 bg-gray-50 p-3">
      <h3 className="font-bold text-gray-950">{issue}</h3>
      <p className="mt-1 text-sm text-gray-700">Evidence: {evidence}</p>
      <p className="mt-1 text-sm text-gray-700">Suggested action: {action}</p>
    </article>
  );
}

function statusTheme(status: SubjectRow["status"]) {
  if (status === "Green") return areaThemes.themes;
  if (status === "Amber") return areaThemes.dcf;
  return areaThemes.overview;
}
