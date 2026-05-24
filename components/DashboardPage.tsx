"use client";

import { CoverageHeatmap } from "@/components/Heatmap";
import { FrameworkCoveragePanel } from "@/components/FrameworkCoveragePanel";
import { PageHeader } from "@/components/PageHeader";
import { CoverageAlerts } from "@/components/PlanningVisibilityNotes";
import { RevisitFrequency } from "@/components/RevisitFrequency";
import { useCurrentSchoolData } from "@/lib/currentSchool";
import type { Dashboard } from "@/lib/types";
import { themeForDashboard, themeForFramework } from "@/lib/theme";

export function DashboardPage({ dashboard }: { dashboard: Dashboard }) {
  const { subjectAoleMap, mappings, subjects, yearGroups, frameworkCoverage, crossCuttingThemes } = useCurrentSchoolData();
  const theme = themeForDashboard(dashboard.title, dashboard.coverage?.framework);
  const subjectSummary = topCounts(dashboard.entries.map((entry) => entry.subject)).slice(0, 6);
  const journeyHighlights = dashboard.entries.slice(0, 5);

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
        <CoverageHeatmap title={dashboard.heatmapTitle} rows={dashboard.heatmapRows} rowTitles={dashboard.heatmapRowTitles} columns={dashboard.heatmapColumns} values={dashboard.heatmapValues} theme={theme} />

        <CoverageAlerts dashboard={dashboard} mappings={mappings} subjects={subjects} yearGroups={yearGroups} frameworkCoverage={frameworkCoverage} crossCuttingThemes={crossCuttingThemes} theme={theme} />
      </div>

      {dashboard.coverage ? <FrameworkCoveragePanel coverage={dashboard.coverage} theme={theme} /> : null}

      <RevisitFrequency framework={dashboard.coverage?.framework} theme={theme} />

      <div className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Subject Summary</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {!subjectSummary.length ? <p className="text-sm text-gray-600 sm:col-span-2">No curriculum mapping entries have been created yet.</p> : null}
            {subjectSummary.map((item) => (
              <div key={item.label} className="rounded-md bg-gray-50 p-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-bold text-gray-900">{item.label}</span>
                  <span className="font-bold" style={{ color: theme.accent }}>
                    {item.value}
                  </span>
                </div>
                <p className="mt-1 text-xs font-semibold text-gray-500">AoLE: {subjectAoleMap[item.label] ?? "Not set"}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Curriculum Journey Highlights</h2>
          <div className="mt-4 space-y-3">
            {!journeyHighlights.length ? <p className="text-sm text-gray-600">No curriculum mapping entries have been created yet.</p> : null}
            {journeyHighlights.map((entry) => (
              <div key={entry.id} className="rounded-md border border-gray-200 p-3">
                <div className="text-sm font-bold text-gray-900">
                  {entry.year} · {entry.subject}
                </div>
                <p className="mt-1 text-sm text-gray-700">{entry.unit}</p>
                <p className="mt-1 text-xs font-semibold text-gray-500">
                  {entry.term} · {entry.schemeReference}
                </p>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">Recent Curriculum Mapping Entries</h2>
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
              {!dashboard.entries.length ? (
                <tr>
                  <td className="py-4 pr-4 text-gray-600" colSpan={6}>
                    No curriculum mapping entries have been created yet.
                  </td>
                </tr>
              ) : null}
              {dashboard.entries.map((entry) => (
                <tr key={`${entry.subject}-${entry.framework}-${entry.context}`} className="border-b border-gray-100">
                  <td className="py-3 pr-4 font-semibold text-gray-900">{entry.subject}</td>
                  <td className="py-3 pr-4 text-gray-700">{subjectAoleMap[entry.subject] ?? "Not set"}</td>
                  <td className="py-3 pr-4">
                    <FrameworkBadge framework={entry.framework} />
                  </td>
                  <td className="py-3 pr-4 text-gray-700">{entry.strand}</td>
                  <td className="py-3 pr-4 text-gray-700">{entry.context}</td>
                  <td className="py-3 pr-4 text-gray-700">{entry.year}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
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

function FrameworkBadge({ framework }: { framework: string }) {
  const theme = themeForFramework(framework);
  return (
    <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: theme.soft, color: theme.text, border: `1px solid ${theme.border}` }}>
      {framework === "Digital Competence Framework" ? "DCF" : framework}
    </span>
  );
}
