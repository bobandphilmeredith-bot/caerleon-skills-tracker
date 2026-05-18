"use client";

import { useMemo, useState } from "react";
import { CoverageHeatmap } from "@/components/Heatmap";
import { PageHeader } from "@/components/PageHeader";
import { useCurrentSchoolData } from "@/lib/currentSchool";
import { progressionReferenceForEntry, progressionSummary } from "@/lib/progression";
import { areaThemes } from "@/lib/theme";

export function SubjectDashboard() {
  const { mappings, subjectAoleMap, subjectProfiles, subjects } = useCurrentSchoolData();
  const [subject, setSubject] = useState(subjects[0]);
  const selectedSubject = subjects.includes(subject) ? subject : subjects[0];
  const profile = useMemo(() => subjectProfiles[selectedSubject], [selectedSubject, subjectProfiles]);
  const subjectMappings = useMemo(() => mappings.filter((entry) => entry.subject === selectedSubject), [mappings, selectedSubject]);
  const progressionTotals = progressionSummary(subjectMappings);
  const aole = subjectAoleMap[selectedSubject];

  return (
    <section className="space-y-6">
      <PageHeader
        title="Subject Dashboard"
        eyebrow="Subject view"
        description="Explore where a subject has mapped Literacy, Numeracy, DCF and cross-cutting themes across planning."
        accent={areaThemes.overview.accent}
      />

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <label className="text-sm font-bold text-gray-700" htmlFor="subject-select">
          Subject
        </label>
        <select
          id="subject-select"
          className="focus-ring min-w-60 rounded-md border border-gray-300 bg-white px-3 py-2"
          value={selectedSubject}
          onChange={(event) => setSubject(event.target.value)}
        >
          {subjects.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <span className="rounded-full border border-[#e8cfe0] bg-[#f7edf3] px-3 py-2 text-sm font-bold text-[#571435]">AoLE: {aole ?? "Not set"}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {profile?.cards.map((card) => (
          <article key={card.label} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-gray-500">{card.label}</div>
            <div className="mt-3 text-3xl font-bold" style={{ color: areaThemes.overview.accent }}>
              {card.value}
            </div>
            <p className="mt-2 text-sm leading-6 text-gray-600">{card.note}</p>
          </article>
        ))}
      </div>

      <CoverageHeatmap title={`${selectedSubject} Coverage by Year Group`} rows={profile.rows} columns={profile.columns} values={profile.values} theme={areaThemes.overview} />

      <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">Progression Reference Summary</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Step 3", progressionTotals["Step 3"]],
            ["Step 4", progressionTotals["Step 4"]],
            ["Step 5", progressionTotals["Step 5"]],
            ["Step 3–4 / 4–5", progressionTotals.Bridging]
          ].map(([label, value]) => (
            <div key={label} className="rounded-md bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-600">{label}</p>
              <p className="mt-2 text-2xl font-bold text-[#741B47]">{value}</p>
              <p className="mt-1 text-xs font-semibold text-gray-500">Mapped opportunities</p>
            </div>
          ))}
        </div>
      </article>

      <div className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Recent curriculum activity descriptions</h2>
          <div className="mt-4 space-y-3">
            {(subjectMappings.length ? subjectMappings : []).slice(0, 4).map((entry) => (
              <div key={entry.id} className="rounded-md bg-gray-50 p-4 text-sm leading-6 text-gray-700">
                <div className="font-bold text-gray-950">
                  {entry.year} · {entry.term} · {entry.framework}
                </div>
                <div className="mt-1">{entry.activityDescription}</div>
                <div className="mt-2 text-xs font-semibold text-gray-500">{entry.schemeReference} · Progression reference: {progressionReferenceForEntry(entry)}</div>
              </div>
            ))}
            {!subjectMappings.length ? <p className="rounded-md bg-gray-50 p-4 text-sm text-gray-600">No mapped activities recorded for this subject yet.</p> : null}
          </div>
        </article>

        <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Strands, elements and scheme references</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {Array.from(new Set(subjectMappings.flatMap((entry) => [entry.strand, entry.element, entry.schemeReference]))).slice(0, 14).map((item) => (
              <span key={item} className="rounded-full bg-[#f7edf3] px-3 py-1 text-xs font-semibold text-[#571435]">
                {item}
              </span>
            ))}
            {!subjectMappings.length ? <span className="text-sm text-gray-600">Review suggested when curriculum mappings are added.</span> : null}
          </div>
        </article>
      </div>

      <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">Review status</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {profile.notes.map((note) => (
            <div key={note} className="rounded-md bg-gray-50 p-4 text-sm leading-6 text-gray-700">
              {note}
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
