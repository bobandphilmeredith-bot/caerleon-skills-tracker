"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AccessDenied } from "@/components/AccessDenied";
import { useAuth } from "@/lib/auth";
import { useCurrentSchool } from "@/lib/currentSchool";
import { buildProvisionReport, progressionLabel, reportCsv, type ProvisionFilters } from "@/lib/provision";
import { compareTerms, compareYear, formatMappingDescription, formatMappingTitle, frameworkDetailText, normaliseYear, searchableMappingText, unique, type MappingEvidence } from "@/lib/reporting";

export function ProvisionReview({ mode }: { mode: "school" | "subject" }) {
  const school = useCurrentSchool();
  const auth = useAuth();
  const subjects = unique([...school.data.subjectConfigs.filter((item) => item.active).map((item) => item.name), ...school.data.mappings.map((entry) => entry.subject)]).sort();
  const permitted = auth.canManageSchool ? subjects : subjects.filter(auth.canEditSubject);
  if (mode === "school" && !auth.canManageSchool) return <AccessDenied title="Leadership report restricted" message="Your role does not have access to the whole-school report." />;
  if (school.dataLoading) return <p role="status" className="py-12">Loading curriculum provision...</p>;
  if (school.dataError) return <div role="alert" className="border-l-4 border-red-600 p-5"><h1 className="text-xl font-bold">Report unavailable</h1><p className="my-3">Curriculum data could not be loaded completely. Coverage totals have been withheld.</p><button className="btn btn-secondary" onClick={() => void school.refreshData()}>Retry</button></div>;
  if (mode === "subject" && !permitted.length && !auth.canManageSchool) return <AccessDenied title="No assigned subject" message="Ask your school administrator to assign your department before opening its report." />;
  return <Review key={`${school.data.schoolId}-${auth.currentUser?.id}-${auth.currentUser?.role}-${mode}`} mode={mode} subjects={mode === "school" ? subjects : permitted} />;
}

function Review({ mode, subjects }: { mode: "school" | "subject"; subjects: string[] }) {
  const { data, currentSchool } = useCurrentSchool();
  const { canEditSubject } = useAuth();
  const [selectedSubject, setSubject] = useState("");
  const [year, setYear] = useState("");
  const [term, setTerm] = useState("");
  const [view, setView] = useState("Overview");
  const [framework, setFramework] = useState("");
  const [coverageStatus, setCoverageStatus] = useState("");
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<{ label: string; ids: string[] } | null>(null);
  const [generated, setGenerated] = useState("");
  useEffect(() => {
    setSubject(new URLSearchParams(window.location.search).get("subject") ?? "");
    setGenerated(new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Europe/London" }).format(new Date()));
  }, []);
  const subject = subjects.includes(selectedSubject) ? selectedSubject : mode === "subject" ? subjects[0] ?? "" : "";
  const filters: ProvisionFilters = { subject, year, term };
  const availableMappings = data.mappings.filter((entry) => subjects.includes(entry.subject));
  const report = useMemo(() => buildProvisionReport(availableMappings, subjects, data.frameworkLibrary, data.crossCuttingThemes, filters), [data, subject, year, term, subjects.join("|")]);
  const yearOptions = unique([...data.yearGroups, ...availableMappings.map((entry) => normaliseYear(entry.year))]).sort(compareYear);
  const termOptions = unique([...data.terms, ...availableMappings.map((entry) => entry.term)]).sort(compareTerms);
  const coverage = report.coverage.filter((item) => (!framework || item.framework === framework) && (!coverageStatus || (coverageStatus === "missing" ? !item.entries.length : coverageStatus === "single" ? item.subjects.length === 1 : item.terms.length > 1)));
  const evidence = report.entries.filter((entry) => (!selection || selection.ids.includes(entry.mapping.id)) && (!query.trim() || searchableMappingText(entry).includes(query.trim().toLowerCase())))
    .sort((a, b) => compareYear(a.mapping.year, b.mapping.year) || compareTerms(a.mapping.term, b.mapping.term) || a.mapping.subject.localeCompare(b.mapping.subject));
  const scope = `${subject || "All subjects"} | ${year || "All year groups"} | ${term || "All terms"}`;
  function showEvidence(label: string, entries: MappingEvidence[]) { setSelection({ label, ids: entries.map((entry) => entry.mapping.id) }); setQuery(""); setView("Activities"); }
  function scopeChanged() { setSelection(null); setQuery(""); }
  function download(kind: "activities" | "coverage" | "summary") {
    const metadata = [currentSchool.name, scope, generated];
    const headers = ["School", "Report scope", "Generated"];
    const rows = kind === "coverage" ? [[...headers, "Framework", "Code", "Strand", "Element", "Activities", "Subjects", "Year groups", "Terms"], ...coverage.map((item) => [...metadata, item.framework, item.code, item.strand, item.element, item.entries.length, item.subjects.join("; "), item.years.join("; "), item.terms.join("; ")])]
      : kind === "summary" ? [[...headers, "Subject", "Activities", "Distinct skill elements", ...report.terms, "Last updated"], ...report.subjectRows.map((row) => [...metadata, row.subject, row.entries.length, row.elements, ...row.terms.map((item) => item.entries.length), row.lastUpdated])]
      : [[...headers, "Subject", "Year group", "Term", "Scheme", "Activity", "Planned work", "Skills", "Themes", "Notes", "Last updated"], ...evidence.map(({ mapping, frameworkRefs, themeItems }) => [...metadata, mapping.subject, mapping.year, mapping.term, mapping.schemeReference, formatMappingTitle(mapping), formatMappingDescription(mapping), frameworkRefs.map(frameworkDetailText).join("; "), themeItems.map((item) => item.label).join("; "), unique([mapping.note ?? "", mapping.crossCuttingThemeNotes ?? "", ...frameworkRefs.map((ref) => ref.notes ?? "")]).join("; "), mapping.lastMappedDate])];
    const url = URL.createObjectURL(new Blob([reportCsv(rows)], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a"); link.href = url; link.download = `provision-${kind}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const missingFrameworks = ["Literacy", "Numeracy", "DCF"].filter((name) => !report.coverage.some((item) => item.framework === name));
  return <section className="provision-report space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-sm text-gray-600">{currentSchool.name}</p><h1 className="mt-1 text-2xl font-bold">{mode === "school" ? "Leadership Review" : "Department Review"}</h1><p className="mt-2 text-sm text-gray-600">{scope} · Generated {generated}</p></div>
      <div className="flex flex-wrap gap-2 print:hidden"><button className="btn btn-secondary focus-ring" onClick={() => window.print()}>Print / PDF</button><button className="btn btn-secondary focus-ring" onClick={() => download("summary")}>Download summary</button><Link className="btn btn-muted" href="/reports/cynefin">Cynefin Plan</Link></div>
    </header>
    <p className="border-l-4 border-gray-300 pl-3 text-sm text-gray-600">Recorded plans show intended provision, not delivery or pupil attainment. Unmapped elements are review questions; each department is not expected to cover every element. Records currently have no academic-year field.</p>
    {missingFrameworks.length > 0 && <p role="status" className="border-l-4 border-amber-500 pl-3 text-sm">Framework definitions unavailable: {missingFrameworks.join(", ")}. Their coverage cannot be calculated.</p>}
    <div className="grid gap-3 border-y border-gray-200 py-4 sm:grid-cols-3 print:hidden">
      <Filter label="Subject" value={subject} options={subjects} all={mode === "school"} onChange={(value) => { setSubject(value); scopeChanged(); }} />
      <Filter label="Year group" value={year} options={yearOptions} onChange={(value) => { setYear(value); scopeChanged(); }} />
      <Filter label="Term" value={term} options={termOptions} onChange={(value) => { setTerm(value); scopeChanged(); }} />
    </div>
    <div className="grid grid-cols-2 gap-4 border-b border-gray-200 pb-5 lg:grid-cols-4" aria-live="polite">
      <Metric label="Planned activities" value={report.entries.length} />
      <Metric label="Subjects represented" value={`${report.subjectRows.filter((row) => row.entries.length).length} / ${report.subjectRows.length}`} />
      <Metric label="Skill elements represented" value={report.coverage.length ? `${report.coverage.length - report.unmapped.length} / ${report.coverage.length}` : "Unavailable"} />
      <Metric label="Latest plan update" value={report.lastUpdated} />
    </div>
    <nav className="flex flex-wrap gap-1 border-b border-gray-200 print:hidden" aria-label="Review views">{["Overview", "Skills coverage", "Themes", "Activities"].map((name) => <button key={name} type="button" aria-pressed={view === name} className={`focus-ring border-b-2 px-4 py-3 text-sm font-bold ${view === name ? "border-[#741b47] text-[#741b47]" : "border-transparent text-gray-600"}`} onClick={() => setView(name)}>{name}</button>)}</nav>
    {view === "Overview" && <>
      <section><h2 className="text-lg font-bold">Review priorities</h2><table className="review-table mt-3"><thead><tr><th>Evidence in this scope</th><th>Discussion / next action</th></tr></thead><tbody>
        <tr><td>{report.noEvidence.length} subjects without recorded plans{report.noEvidence.length > 0 && <p className="mt-1 text-sm text-gray-600">{report.noEvidence.map((row) => row.subject).join(", ")}</p>}</td><td>Confirm which subjects teach this cohort and term, then check whether their plans have been entered.</td></tr>
        <tr><td><button className="review-link" onClick={() => { setCoverageStatus("missing"); setFramework(""); setView("Skills coverage"); }}>{report.unmapped.length} skill elements without recorded opportunities</button></td><td>Agree which departments provide relevant opportunities and inspect their schemes before identifying a provision gap.</td></tr>
        <tr><td>{report.oneSubject.length} elements recorded in only one subject</td><td>Consider transfer across subjects and continuity if that provision changes.</td></tr>
        <tr><td><button className="review-link" onClick={() => showEvidence("Activities with no description", report.missingDescription)}>{report.missingDescription.length} activities without a work description</button></td><td>Add enough detail to evaluate what pupils will actually do.</td></tr>
        <tr><td><button className="review-link" onClick={() => showEvidence("Activities with no skills or themes", report.missingReferences)}>{report.missingReferences.length} activities without skills or themes</button></td><td>Check for relevant links; only attach those supported by the planned work.</td></tr>
        {report.missingTiming.length > 0 && <tr><td><button className="review-link" onClick={() => showEvidence("Activities needing timing details", report.missingTiming)}>{report.missingTiming.length} activities with incomplete timing</button></td><td>Confirm the year group and term.</td></tr>}
      </tbody></table></section>
      <section><h2 className="text-lg font-bold">Subject provision by term</h2><div className="overflow-x-auto"><table className="review-table mt-3"><caption className="text-left text-sm text-gray-600">Distinct planned activities. Zero means none recorded in this scope.</caption><thead><tr><th>Subject</th>{report.terms.map((t) => <th key={t}>{t}</th>)}<th>Skill elements</th><th>Latest update</th></tr></thead><tbody>{report.subjectRows.map((row) => <tr key={row.subject}><th scope="row">{mode === "school" ? <Link className="review-link" href={`/reports/subject-health?subject=${encodeURIComponent(row.subject)}`}>{row.subject}</Link> : row.subject}</th>{row.terms.map((t) => <td key={t.term}><button className="review-link" aria-label={`${row.subject}, ${t.term}: ${t.entries.length} activities`} onClick={() => showEvidence(`${row.subject} / ${t.term}`, t.entries)}>{t.entries.length}</button></td>)}<td>{row.elements}</td><td>{row.lastUpdated}</td></tr>)}</tbody></table></div></section>
      <section><h2 className="text-lg font-bold">Year-group provision</h2><div className="overflow-x-auto"><table className="review-table mt-3"><thead><tr><th>Year group</th>{report.terms.map((t) => <th key={t}>{t}</th>)}</tr></thead><tbody>{report.years.map((y) => <tr key={y}><th scope="row">{y}</th>{report.terms.map((t) => { const items = report.entries.filter(({ mapping }) => mapping.year === y && mapping.term === t); return <td key={t}><button className="review-link" onClick={() => showEvidence(`${y} / ${t}`, items)}>{items.length}</button></td>; })}</tr>)}</tbody></table></div></section>
      <section><h2 className="text-lg font-bold">Planned progression</h2><p className="mt-1 text-sm text-gray-600">Activities may appear at more than one step. Bridging references are shown separately.</p><div className="mt-3 flex flex-wrap gap-6">{["Step 1", "Step 2", "Step 3", "Step 4", "Step 5", "Bridging", "Unspecified"].map((step) => { const items = report.entries.filter((entry) => entry.frameworkRefs.some((ref) => progressionLabel(ref) === step)); return <button key={step} className="focus-ring text-left" onClick={() => showEvidence(step, items)}><Metric label={step} value={items.length} /></button>; })}</div></section>
    </>}
    {view === "Skills coverage" && <section className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 print:hidden"><Filter label="Framework" value={framework} options={unique(report.coverage.map((item) => item.framework))} onChange={setFramework} /><label className="text-sm font-bold">Coverage<select className="mt-1 block rounded-md border border-gray-300 p-2" value={coverageStatus} onChange={(event) => setCoverageStatus(event.target.value)}><option value="">All elements</option><option value="missing">No recorded opportunities</option><option value="single">One subject only</option><option value="revisited">Across multiple terms</option></select></label><button className="btn btn-secondary" onClick={() => download("coverage")}>Download coverage</button></div>
      <h2 className="text-lg font-bold">{framework || "All frameworks"}: {coverageStatus === "missing" ? "no recorded opportunities" : coverageStatus === "single" ? "one subject only" : coverageStatus === "revisited" ? "across multiple terms" : "element coverage"}</h2>
      <div className="grid gap-4 sm:grid-cols-3">{unique(report.coverage.map((item) => item.framework)).map((name) => { const items = report.coverage.filter((item) => item.framework === name); return <Metric key={name} label={name} value={`${items.filter((item) => item.entries.length).length} / ${items.length} elements`} />; })}</div>
      <div className="overflow-x-auto"><table className="review-table"><thead><tr><th>Framework / code</th><th>Strand / element</th><th>Activities</th><th>Subjects</th><th>Year groups / terms</th></tr></thead><tbody>{coverage.map((item) => <tr key={item.key}><td>{item.framework} {item.code}</td><th scope="row"><span className="block text-xs font-normal text-gray-500">{item.strand}</span>{item.element}</th><td><button className="review-link" onClick={() => showEvidence(`${item.framework} ${item.code}: ${item.element}`, item.entries)}>{item.entries.length}</button></td><td>{item.subjects.join(", ") || "None recorded"}</td><td>{item.years.join(", ")}<br />{item.terms.join(", ")}</td></tr>)}</tbody></table></div>{!coverage.length && <p>No elements match this selection.</p>}
    </section>}
    {view === "Themes" && <section><h2 className="text-lg font-bold">Cross-cutting theme provision</h2><div className="overflow-x-auto"><table className="review-table mt-3"><thead><tr><th>Theme</th><th>Activities</th><th>Subjects</th><th>Element evidence</th></tr></thead><tbody>{report.themeCoverage.map((item) => <tr key={item.theme.id}><th scope="row">{item.theme.name}</th><td><button className="review-link" onClick={() => showEvidence(item.theme.name, item.entries)}>{item.entries.length}</button></td><td>{item.subjects.join(", ") || "None recorded"}</td><td>{item.elements.length ? item.elements.map((element) => <p key={element.name} className="mb-2"><button className="review-link text-left" onClick={() => showEvidence(`${item.theme.name}: ${element.name}`, element.entries)}>{element.name}: {element.entries.length}</button></p>) : "No element definitions available"}</td></tr>)}</tbody></table></div>{!report.themeCoverage.length && <p className="py-4">No theme definitions available.</p>}</section>}
    {view === "Activities" && <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-bold">{selection?.label ?? "All activities"}</h2><p className="text-sm text-gray-600">{evidence.length} activities{query && ` matching "${query}"`}</p></div><div className="flex flex-wrap gap-2 print:hidden">{selection && <button className="btn btn-muted" onClick={() => setSelection(null)}>All activities</button>}<button className="btn btn-secondary" onClick={() => download("activities")}>Download activities</button></div></div>
      <label className="block text-sm font-bold print:hidden">Search activities<input className="mt-1 block w-full rounded-md border border-gray-300 p-2" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <div className="activity-table-scroll" role="region" aria-label="Planned activities" tabIndex={0}>
        <table className="review-table activity-table">
          <colgroup>
            <col className="activity-subject-column" />
            <col className="activity-work-column" />
            <col />
            <col className="activity-action-column" />
          </colgroup>
          <thead><tr><th scope="col">Subject / timing</th><th scope="col">Planned work</th><th scope="col">Skills and themes</th><th scope="col" className="activity-action print:hidden">Action</th></tr></thead>
          <tbody>{evidence.map((entry) => <tr key={entry.mapping.id}>
            <th scope="row">
              <p className="activity-subject">{entry.mapping.subject}</p>
              <div className="activity-timing"><p>{entry.mapping.year}</p><p>{entry.mapping.term || "Term not recorded"}</p></div>
              {entry.mapping.schemeReference && <p className="activity-scheme">{entry.mapping.schemeReference}</p>}
            </th>
            <td><strong>{formatMappingTitle(entry.mapping)}</strong><p className="mt-2 whitespace-pre-wrap">{formatMappingDescription(entry.mapping) || "No work description recorded"}</p>{entry.mapping.crossCuttingThemeNotes && <p className="mt-2 whitespace-pre-wrap">{entry.mapping.crossCuttingThemeNotes}</p>}</td>
            <td>
              <ul className="activity-evidence">
                {entry.frameworkRefs.map((ref, index) => <li key={index}>{frameworkDetailText(ref)}{ref.notes && <span className="activity-evidence-note">{ref.notes}</span>}</li>)}
                {entry.themeItems.map((item) => <li key={item.label}>{item.label}{!item.element && " (theme only)"}</li>)}
              </ul>
            </td>
            <td className="activity-action print:hidden">{canEditSubject(entry.mapping.subject) && <Link className="review-link" aria-label={`Edit plan: ${formatMappingTitle(entry.mapping)}`} href={`/edit-curriculum/${encodeURIComponent(entry.mapping.id)}`}>Edit plan</Link>}</td>
          </tr>)}</tbody>
        </table>
      </div>{!evidence.length && <p className="py-4">No recorded activities match this selection.</p>}
    </section>}
    <footer className="border-t border-gray-200 pt-4 text-sm text-gray-500">Review basis: saved curriculum plans and current framework definitions. Counts represent distinct activities or distinct elements as labelled. Dates are plan updates, not verified reviews. Full quality evaluation also requires pupil work, delivery evidence and professional discussion.</footer>
  </section>;
}

function Metric({ label, value }: { label: string; value: string | number }) { return <div><p className="text-sm text-gray-600">{label}</p><p className="mt-1 text-xl font-bold break-words">{value}</p></div>; }
function Filter({ label, value, options, onChange, all = true }: { label: string; value: string; options: string[]; onChange: (value: string) => void; all?: boolean }) { return <label className="min-w-0 text-sm font-bold">{label}<select className="mt-1 block w-full rounded-md border border-gray-300 bg-white p-2" value={value} onChange={(event) => onChange(event.target.value)}>{all && <option value="">All</option>}{options.map((option) => <option key={option}>{option}</option>)}</select></label>; }
