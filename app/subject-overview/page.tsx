"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { useCurrentSchoolData } from "@/lib/currentSchool";
import { areaThemes, themeForFramework } from "@/lib/theme";

export default function SubjectOverviewPage() {
  const { subjectOverviews } = useCurrentSchoolData();
  const [query, setQuery] = useState("");
  const filteredSubjects = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return subjectOverviews;
    return subjectOverviews.filter((subject) => [subject.subject, subject.aole ?? "", subject.department, subject.faculty].join(" ").toLowerCase().includes(term));
  }, [query, subjectOverviews]);

  return (
    <section className="space-y-6">
      <PageHeader
        title="Subject Curriculum Overview"
        eyebrow="Subject Curriculum"
        description="Review curriculum mappings, skills coverage and theme evidence by subject."
        accent={areaThemes.overview.accent}
      />

      <article className="rounded-lg border bg-white p-5 shadow-sm" style={{ borderColor: areaThemes.overview.border }}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <label className="min-w-72 flex-1">
            <span className="mb-1 block text-sm font-semibold text-gray-700">Find a subject</span>
            <input className="focus-ring w-full rounded-md border border-gray-300 px-3 py-2" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by subject or optional AoLE" />
          </label>
          <Link className="focus-ring btn btn-primary" href="/add-entry">
            Add mapping entry
          </Link>
        </div>
      </article>

      <section>
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {filteredSubjects.map((subject) => (
            <article key={subject.subject} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-950">{subject.subject}</h2>
                  <p className="mt-1 text-sm font-semibold text-gray-500">AoLE: {subject.aole ?? "Not set"}</p>
                </div>
                <span className="rounded-full bg-[#f7edf3] px-3 py-1 text-xs font-bold text-[#571435]">{subject.total} mapped opportunities</span>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2">
                <MiniFramework label="Literacy" value={subject.literacy} framework="Literacy" />
                <MiniFramework label="Numeracy" value={subject.numeracy} framework="Numeracy" />
                <MiniFramework label="DCF" value={subject.dcf} framework="Digital Competence Framework" />
                <MiniFramework label="Themes" value={subject.themes} framework="Cross-cutting Themes" />
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <Link className="focus-ring btn btn-secondary text-xs" href={`/subject-overview/${encodeURIComponent(subject.subject)}`}>
                  Open subject detail
                </Link>
              </div>
            </article>
          ))}
        </div>
        {!filteredSubjects.length ? <p className="rounded-lg border border-gray-200 bg-white p-5 text-sm text-gray-600">No subjects match that search.</p> : null}
      </section>
    </section>
  );
}

function MiniFramework({ label, value, framework }: { label: string; value: number; framework: string }) {
  const theme = themeForFramework(framework);
  return (
    <div className="rounded-md px-2 py-2 text-center" style={{ backgroundColor: theme.soft, color: theme.text, border: `1px solid ${theme.border}` }}>
      <div className="text-xs font-bold">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}
