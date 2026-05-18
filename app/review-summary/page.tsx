"use client";

import { reviewSummaryNotes } from "@/lib/curriculumOutputs";
import { areaThemes, themeForFramework } from "@/lib/theme";
import { useSchoolSettings } from "@/lib/schoolSettings";
import { useCurrentSchoolData } from "@/lib/currentSchool";
import type { MappingEntry } from "@/lib/types";

const frameworkOrder = ["Literacy", "Numeracy", "Digital Competence Framework", "Cross-cutting Themes"];

export default function ReviewSummaryPage() {
  const { settings } = useSchoolSettings();
  const { mappings, subjectAoleMap, subjectOverviews, wholeSchoolDashboard, yearGroups } = useCurrentSchoolData();
  const frameworks = frameworkOrder.filter((framework) => mappings.some((entry) => entry.framework === framework));
  const frameworkRows = frameworks.map((framework) => ({
    framework,
    total: mappings.filter((entry) => entry.framework === framework).length,
    byYear: Object.fromEntries(yearGroups.map((year) => [year, mappings.filter((entry) => entry.framework === framework && entry.year === year).length]))
  }));
  const yearRows = yearGroups.map((year) => ({
    year,
    total: mappings.filter((entry) => entry.year === year).length,
    frameworks: Object.fromEntries(frameworks.map((framework) => [framework, mappings.filter((entry) => entry.year === year && entry.framework === framework).length]))
  }));
  const subjectReviewList = [...subjectOverviews].sort((a, b) => a.total - b.total || a.subject.localeCompare(b.subject)).slice(0, 6);
  const recentMappings = [...mappings].sort((a, b) => b.lastMappedDate.localeCompare(a.lastMappedDate)).slice(0, 6);

  return (
    <section className="space-y-6">
      <article className="rounded-lg border bg-white p-6 shadow-sm print:border-gray-300 print:shadow-none" style={{ borderColor: areaThemes.overview.border }}>
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 pb-5">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-md border border-gray-200 bg-white p-2">
            <img src={settings.branding.logoDataUrl} alt="" className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.14em]" style={{ color: areaThemes.overview.accent }}>
                  {settings.branding.schoolName}
                </p>
                <h1 className="mt-2 text-3xl font-bold text-gray-950">Whole-school Review Summary</h1>
              </div>
              <button className="focus-ring rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-600 transition hover:border-gray-400 hover:bg-gray-50 print:hidden" type="button" onClick={() => window.print()}>
                Print
              </button>
            </div>
            <p className="mt-1 text-sm font-semibold text-gray-700">{settings.branding.motto}</p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">This review summary brings together mapped opportunities, curriculum connections and suggested discussion points for planning conversations.</p>
          </div>
        </div>

        <section className="mt-6">
          <h2 className="text-xl font-bold text-gray-950">Whole-school framework overview</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {wholeSchoolDashboard.cards.map((card) => (
              <div key={card.label} className="rounded-lg border border-gray-200 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">{card.label}</p>
                <p className="mt-2 text-2xl font-bold" style={{ color: areaThemes.overview.accent }}>
                  {card.value}
                </p>
                <p className="mt-2 text-xs leading-5 text-gray-600">{card.note}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-gray-950">Framework visibility by year group</h2>
              <p className="mt-1 text-sm text-gray-600">Use this to see how mapped opportunities are represented across the school curriculum.</p>
            </div>
            <div className="flex flex-wrap gap-2 print:hidden">
              <a className="focus-ring btn btn-secondary" href="/curriculum-explorer">
                Open explorer
              </a>
              <a className="focus-ring btn btn-secondary" href="/progression-overview">
                Open progression overview
              </a>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full min-w-[820px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-gray-600">
                  <th className="py-3 pl-4 pr-3 font-bold">Framework</th>
                  {yearGroups.map((year) => (
                    <th key={year} className="px-3 py-3 text-center font-bold">
                      {year}
                    </th>
                  ))}
                  <th className="py-3 pl-3 pr-4 text-right font-bold">Total</th>
                </tr>
              </thead>
              <tbody>
                {frameworkRows.map((row) => {
                  const theme = themeForFramework(row.framework);
                  return (
                    <tr key={row.framework} className="border-b border-gray-100 last:border-b-0">
                      <td className="py-3 pl-4 pr-3 font-bold text-gray-900">
                        <span className="inline-flex rounded-full px-3 py-1 text-xs" style={{ backgroundColor: theme.soft, color: theme.text, border: `1px solid ${theme.border}` }}>
                          {frameworkLabel(row.framework)}
                        </span>
                      </td>
                      {yearGroups.map((year) => (
                        <td key={year} className="px-3 py-3 text-center">
                          <span className="font-bold text-gray-900">{row.byYear[year]}</span>
                        </td>
                      ))}
                      <td className="py-3 pl-3 pr-4 text-right font-bold text-gray-900">{row.total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8">
          <div className="rounded-lg border border-gray-200 p-5">
            <h2 className="text-xl font-bold text-gray-950">Year group spread</h2>
            <p className="mt-1 text-sm text-gray-600">Mapped opportunities currently visible by year group.</p>
            <div className="mt-4 space-y-3">
              {yearRows.map((row) => (
                <SummaryBar key={row.year} label={row.year} value={row.total} max={Math.max(...yearRows.map((year) => year.total), 1)} />
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-bold text-gray-950">Subject representation overview</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="py-3 pr-4 font-bold">Subject</th>
                  <th className="py-3 pr-4 font-bold">Optional AoLE</th>
                  <th className="py-3 pr-4 font-bold">Total</th>
                  <th className="py-3 pr-4 font-bold">Literacy</th>
                  <th className="py-3 pr-4 font-bold">Numeracy</th>
                  <th className="py-3 pr-4 font-bold">DCF</th>
                  <th className="py-3 pr-4 font-bold">Cross-cutting themes</th>
                  <th className="py-3 pr-4 font-bold">Last reviewed</th>
                </tr>
              </thead>
              <tbody>
                {subjectOverviews.slice(0, 7).map((subject) => (
                  <tr key={subject.subject} className="border-b border-gray-100">
                    <td className="py-3 pr-4 font-semibold text-gray-900">{subject.subject}</td>
                    <td className="py-3 pr-4 text-gray-700">{subject.aole ?? "Not set"}</td>
                    <td className="py-3 pr-4 text-gray-700">{subject.total}</td>
                    <td className="py-3 pr-4 text-gray-700">{subject.literacy}</td>
                    <td className="py-3 pr-4 text-gray-700">{subject.numeracy}</td>
                    <td className="py-3 pr-4 text-gray-700">{subject.dcf}</td>
                    <td className="py-3 pr-4 text-gray-700">{subject.themes}</td>
                    <td className="py-3 pr-4 text-gray-700">{subject.lastReviewedDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <div>
            <h2 className="text-xl font-bold text-gray-950">Recent mapped opportunities</h2>
            <div className="mt-4 space-y-3">
              {recentMappings.map((entry) => {
                const theme = themeForFramework(entry.framework);
                return (
                  <div key={entry.id} className="rounded-lg border p-4" style={{ borderColor: theme.border }}>
                    <p className="text-sm font-bold text-gray-950">
                      {entry.subject} · {entry.year} · {entry.term}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-gray-500">AoLE: {subjectAoleMap[entry.subject] ?? "Not set"}</p>
                    <p className="mt-1 text-sm font-semibold" style={{ color: theme.text }}>
                      {entry.framework}: {entry.element}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-gray-700">{entry.activityDescription}</p>
                    <p className="mt-2 text-xs font-semibold text-gray-500">{entry.schemeReference}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-950">Subjects for planning conversation</h2>
            <p className="mt-1 text-sm text-gray-600">Subjects with fewer mapped opportunities in the current data view.</p>
            <div className="mt-4 space-y-3">
              {subjectReviewList.map((subject) => (
                <div key={subject.subject} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-gray-950">{subject.subject}</h3>
                      <p className="mt-1 text-xs font-semibold text-gray-500">AoLE: {subject.aole ?? "Not set"}</p>
                    </div>
                    <span className="text-sm font-bold" style={{ color: areaThemes.overview.accent }}>
                      {subject.total}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs font-bold">
                    <MiniCount label="Lit" value={subject.literacy} framework="Literacy" />
                    <MiniCount label="Num" value={subject.numeracy} framework="Numeracy" />
                    <MiniCount label="DCF" value={subject.dcf} framework="Digital Competence Framework" />
                    <MiniCount label="Themes" value={subject.themes} framework="Cross-cutting Themes" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-bold text-gray-950">Review notes</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {reviewSummaryNotes.map((note) => (
              <div key={note} className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-700">
                {note}
              </div>
            ))}
          </div>
        </section>
      </article>
    </section>
  );
}

function SummaryBar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div>
      <div className="flex justify-between gap-3 text-sm">
        <span className="font-semibold text-gray-700">{label}</span>
        <span className="font-bold" style={{ color: areaThemes.overview.accent }}>
          {value}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full" style={{ width: `${(value / max) * 100}%`, backgroundColor: areaThemes.overview.accent }} />
      </div>
    </div>
  );
}

function MiniCount({ label, value, framework }: { label: string; value: number; framework: string }) {
  const theme = themeForFramework(framework);
  return (
    <div className="rounded-md px-2 py-2" style={{ backgroundColor: theme.soft, color: theme.text }}>
      <div>{label}</div>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  );
}

function frameworkLabel(framework: MappingEntry["framework"]) {
  return framework === "Digital Competence Framework" ? "DCF" : framework;
}
