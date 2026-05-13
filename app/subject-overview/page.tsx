"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { useCurrentSchoolData } from "@/lib/currentSchool";
import { areaThemes, themeForFramework } from "@/lib/theme";

export default function SubjectOverviewPage() {
  const { subjectDetails, subjectOverviews, yearGroups } = useCurrentSchoolData();
  const [selectedSubject, setSelectedSubject] = useState(subjectOverviews[0].subject);
  const activeSubject = subjectDetails[selectedSubject] ? selectedSubject : subjectOverviews[0].subject;
  const detail = subjectDetails[activeSubject];

  return (
    <section className="space-y-6">
      <PageHeader
        title="Subject Overview"
        eyebrow="Subject visibility"
        description="Compare curriculum mappings across subjects, with AoLE shown only as optional metadata."
        accent={areaThemes.overview.accent}
      />

      <article className="rounded-lg border bg-white p-5 shadow-sm" style={{ borderColor: areaThemes.overview.border }}>
        <h2 className="text-lg font-bold text-gray-900">Subject Mapping Summary</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="py-3 pr-4 font-bold">Subject</th>
                <th className="py-3 pr-4 font-bold">Optional AoLE</th>
                <th className="py-3 pr-4 font-bold">Total mappings</th>
                <th className="py-3 pr-4 font-bold">Literacy mappings</th>
                <th className="py-3 pr-4 font-bold">Numeracy mappings</th>
                <th className="py-3 pr-4 font-bold">DCF mappings</th>
                <th className="py-3 pr-4 font-bold">Cross-cutting theme mappings</th>
                <th className="py-3 pr-4 font-bold">Last reviewed date</th>
                <th className="py-3 pr-4 font-bold">Status</th>
                <th className="py-3 pr-4 font-bold">Detail</th>
              </tr>
            </thead>
            <tbody>
              {subjectOverviews.map((subject) => (
                <tr key={subject.subject} className="border-b border-gray-100">
                  <td className="py-3 pr-4 font-semibold text-gray-900">{subject.subject}</td>
                  <td className="py-3 pr-4 text-gray-700">{subject.aole ?? "Not set"}</td>
                  <td className="py-3 pr-4 text-gray-700">{subject.total}</td>
                  <td className="py-3 pr-4">
                    <CountBadge value={subject.literacy} framework="Literacy" />
                  </td>
                  <td className="py-3 pr-4">
                    <CountBadge value={subject.numeracy} framework="Numeracy" />
                  </td>
                  <td className="py-3 pr-4">
                    <CountBadge value={subject.dcf} framework="Digital Competence Framework" />
                  </td>
                  <td className="py-3 pr-4">
                    <CountBadge value={subject.themes} framework="Cross-cutting Themes" />
                  </td>
                  <td className="py-3 pr-4 text-gray-700">{subject.lastReviewedDate}</td>
                  <td className="py-3 pr-4">
                    <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: subject.active ? "#ecfdf3" : "#f3f4f6", color: subject.active ? "#166534" : "#4b5563" }}>
                      {subject.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <Link
                      className="focus-ring inline-flex min-w-28 items-center justify-center rounded-md border px-3 py-2 text-center text-xs font-bold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      style={{ backgroundColor: "#741B47", borderColor: "#571435", color: "#ffffff" }}
                      href={`/subject-overview/${encodeURIComponent(subject.subject)}`}
                    >
                      Open detail
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="rounded-lg border bg-white p-5 shadow-sm" style={{ borderColor: areaThemes.overview.border }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{detail.subject} Detail</h2>
            <p className="mt-1 text-sm text-gray-600">
              AoLE: {detail.aole ?? "Not set"} · {detail.appearsInMappingDropdowns ? "Shown in mapping dropdowns" : "Hidden from mapping dropdowns"}
            </p>
          </div>
          <Link className="focus-ring rounded-md border px-3 py-2 text-sm font-bold" style={{ borderColor: areaThemes.overview.accent, color: areaThemes.overview.text }} href="/subjects">
            Open subject dashboard
          </Link>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <DetailBars title="Mappings by year group" values={Object.fromEntries(yearGroups.map((year) => [year, detail.byYearGroup[year] ?? 0]))} />
          <DetailBars title="Mappings by framework" values={detail.byFramework} />
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <ListBlock title="Schemes of learning references" items={detail.schemes} />
          <ListBlock title="Strands covered" items={detail.strandsCovered} />
          <ListBlock title="Elements covered" items={detail.elementsCovered} />
        </div>
      </article>
    </section>
  );
}

function DetailBars({ title, values }: { title: string; values: Record<string, number> }) {
  const max = Math.max(...Object.values(values), 1);
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <h3 className="font-bold text-gray-900">{title}</h3>
      <div className="mt-4 space-y-3">
        {Object.entries(values).map(([label, value]) => (
          <div key={label}>
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
        ))}
      </div>
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <h3 className="font-bold text-gray-900">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {(items.length ? items : ["No current entries yet"]).map((item) => (
          <span key={item} className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: areaThemes.overview.soft, color: areaThemes.overview.text }}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function CountBadge({ value, framework }: { value: number; framework: string }) {
  const theme = themeForFramework(framework);
  return (
    <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: theme.soft, color: theme.text, border: `1px solid ${theme.border}` }}>
      {value}
    </span>
  );
}
