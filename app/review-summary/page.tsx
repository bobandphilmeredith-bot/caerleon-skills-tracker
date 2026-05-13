"use client";

import { PageHeader } from "@/components/PageHeader";
import { reviewSummaryNotes } from "@/lib/curriculumOutputs";
import { areaThemes, themeForFramework } from "@/lib/theme";
import { useSchoolSettings } from "@/lib/schoolSettings";
import { useCurrentSchoolData } from "@/lib/currentSchool";

export default function ReviewSummaryPage() {
  const { settings } = useSchoolSettings();
  const { mappings, subjectAoleMap, subjectOverviews, wholeSchoolDashboard, yearGroups } = useCurrentSchoolData();
  const journeyExample = yearGroups.map((year) => ({
    year,
    entries: mappings.filter((entry) => entry.year === year && entry.framework === "Numeracy" && entry.strand === "Using data skills")
  }));

  return (
    <section className="space-y-6">
      <div className="print:hidden">
        <PageHeader
          title="Review Summary"
          eyebrow="Printable curriculum visibility"
          description="A neutral summary of mapped opportunities, curriculum connections and areas for review using local curriculum data."
          accent={areaThemes.overview.accent}
        />
      </div>

      <div className="flex justify-end print:hidden">
        <button className="focus-ring rounded-md px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:shadow-md" style={{ backgroundColor: areaThemes.overview.accent }} type="button" onClick={() => window.print()}>
          Print review summary
        </button>
      </div>

      <article className="rounded-lg border bg-white p-6 shadow-sm print:border-gray-300 print:shadow-none" style={{ borderColor: areaThemes.overview.border }}>
        <div className="flex flex-wrap items-start gap-4 border-b border-gray-200 pb-5">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-md border border-gray-200 bg-white p-2">
            <img src={settings.branding.logoDataUrl} alt="" className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em]" style={{ color: areaThemes.overview.accent }}>
              {settings.branding.schoolName}
            </p>
            <h1 className="mt-2 text-3xl font-bold text-gray-950">Whole-school Review Summary</h1>
            <p className="mt-1 text-sm font-semibold text-gray-700">{settings.branding.motto}</p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
              This review summary is designed for curriculum visibility only. It uses local curriculum records and avoids pupil data, assessment data, behaviour data or quality ratings.
            </p>
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
          <h2 className="text-xl font-bold text-gray-950">Curriculum journey example</h2>
          <p className="mt-1 text-sm text-gray-600">Numeracy: Using data skills across Year 7 to Year 11.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            {journeyExample.map((year) => (
              <div key={year.year} className="rounded-lg border border-gray-200 p-3">
                <h3 className="font-bold text-gray-900">{year.year}</h3>
                <div className="mt-3 space-y-2">
                  {(year.entries.length ? year.entries : []).slice(0, 2).map((entry) => (
                    <div key={entry.id} className="rounded-md p-3 text-xs leading-5" style={{ backgroundColor: themeForFramework(entry.framework).soft }}>
                      <p className="font-bold text-gray-950">{entry.subject}</p>
                      <p className="text-gray-700">{entry.unit}</p>
                      <p className="mt-1 font-semibold text-gray-600">
                        {entry.term} · {entry.schemeReference}
                      </p>
                    </div>
                  ))}
                  {!year.entries.length ? <p className="rounded-md bg-gray-50 p-3 text-xs leading-5 text-gray-600">Fewer recorded opportunities in this current school sample.</p> : null}
                </div>
              </div>
            ))}
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
            <h2 className="text-xl font-bold text-gray-950">Examples of mapped activities</h2>
            <div className="mt-4 space-y-3">
              {mappings.slice(0, 5).map((entry) => {
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
            <h2 className="text-xl font-bold text-gray-950">Areas for review</h2>
            <div className="mt-4 space-y-3">
              {reviewSummaryNotes.map((note) => (
                <div key={note} className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-700">
                  {note}
                </div>
              ))}
            </div>
          </div>
        </section>
      </article>
    </section>
  );
}
