"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AccessDenied } from "@/components/AccessDenied";
import { useAuth } from "@/lib/auth";
import { useCurrentSchool } from "@/lib/currentSchool";
import { buildInspectionSummary, inspectionDepartments, type InspectionDepartment, type InspectionSummary } from "@/lib/inspectionSummary";
import { formatMappingDescription, formatMappingTitle, frameworkDetailText, searchableMappingText, unique, type MappingEvidence } from "@/lib/reporting";
import { reportCsv, type CoverageItem } from "@/lib/provision";

const countLabel = (count: number, singular: string, plural = `${singular}s`) => `${count} ${count === 1 ? singular : plural}`;
const initials = { art: "Ar", history: "Hi", chemistry: "Ch", business: "Bu", ict: "IT", english: "En" };
const dateLabel = (value: string) => value && !Number.isNaN(Date.parse(value)) ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Europe/London" }).format(new Date(value)) : "Not recorded";

export function InspectionReport({ departmentSlug }: { departmentSlug?: string }) {
  const school = useCurrentSchool();
  const { canManageSchool } = useAuth();
  if (!canManageSchool) return <AccessDenied title="Inspection summaries restricted" message="Sign in as a school admin or platform admin to view these department summaries." />;
  if (school.dataLoading) return <p role="status" className="py-12">Loading department summaries…</p>;
  if (school.dataError) return <div role="alert"><h1 className="text-xl font-bold">Summary unavailable</h1><p className="my-3">The curriculum records could not be loaded completely. Retry to see accurate coverage.</p><button className="btn btn-secondary" onClick={() => void school.refreshData()}>Retry</button></div>;
  const department = inspectionDepartments.find((item) => item.slug === departmentSlug);
  return department ? <DepartmentSummary key={`${school.data.schoolId}-${department.slug}`} department={department} /> : <InspectionHome />;
}

function useSummary(department: InspectionDepartment, year = "", term = "") {
  const { data } = useCurrentSchool();
  return useMemo(() => buildInspectionSummary({ schoolId: data.schoolId, department, mappings: data.mappings, subjects: data.subjectConfigs, frameworks: data.frameworkLibrary, themes: data.crossCuttingThemes, yearGroups: data.yearGroups, year, term }), [data, department, year, term]);
}

function InspectionHome() {
  const { currentSchool, refreshData } = useCurrentSchool();
  return <section className="inspection-report space-y-7">
    <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-bold text-[#741b47]"><span aria-hidden="true">←</span> Admin</Link>
    <header className="inspection-hero">
      <p className="inspection-eyebrow">{currentSchool.name} · Inspection preparation</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Estyn department summaries</h1>
      <p className="mt-3 max-w-2xl leading-7 text-slate-600">A clear view of each department’s planned contribution to literacy, numeracy and digital competence. Choose a department to see coverage, tasks and questions for discussion.</p>
      <button onClick={() => void refreshData()} className="btn btn-secondary mt-5 focus-ring"><span aria-hidden="true">↻</span> Refresh records</button>
    </header>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{inspectionDepartments.map((department) => <DepartmentCard key={department.slug} department={department} />)}</div>
    <ReadingNote />
  </section>;
}

function DepartmentCard({ department }: { department: InspectionDepartment }) {
  const report = useSummary(department);
  return <Link href={`/admin/estyn/${department.slug}`} className="inspection-department focus-ring group">
    <span className="flex items-center justify-between"><span className="rounded-xl bg-[#f7edf3] p-3 text-[#741b47]"><span className="text-lg font-bold" aria-hidden="true">{initials[department.slug]}</span></span><span aria-hidden="true" className="text-xl text-slate-400 transition-transform group-hover:translate-x-1">→</span></span>
    <h2 className="mt-5 text-xl font-bold">{department.name}</h2>
    <p className="mt-2 text-sm text-slate-600">{countLabel(report.entries.length, "recorded task")} · {countLabel(report.years.filter((year) => year.entries.length).length, "year group")}</p>
    <p className="mt-4 text-sm font-bold text-[#741b47]">View department summary</p>
  </Link>;
}

function DepartmentSummary({ department }: { department: InspectionDepartment }) {
  const { currentSchool, refreshData } = useCurrentSchool();
  const [year, setYear] = useState("");
  const [term, setTerm] = useState("");
  const [generated, setGenerated] = useState("");
  const [query, setQuery] = useState("");
  const [evidence, setEvidence] = useState<{ label: string; ids: string[] } | null>(null);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [coverageOpen, setCoverageOpen] = useState(false);
  const [coverageFilter, setCoverageFilter] = useState("all");
  const [coverageFramework, setCoverageFramework] = useState("");
  const report = useSummary(department, year, term);
  const wholeDepartment = useSummary(department);
  useEffect(() => { setGenerated(dateLabel(new Date().toISOString())); }, []);
  const tasks = report.entries.filter((entry) => (!evidence || evidence.ids.includes(entry.mapping.id)) && (!query.trim() || searchableMappingText(entry).includes(query.trim().toLowerCase())));
  const coverage = report.coverage.filter((item) => (!coverageFramework || item.framework === coverageFramework) && (coverageFilter === "all" || (coverageFilter === "missing" ? !item.entries.length : item.entries.length > 0)));
  const scope = `${year || "All year groups"} · ${term || "All terms"}`;
  function showTasks(label: string, entries: MappingEvidence[]) {
    setEvidence({ label, ids: entries.map((entry) => entry.mapping.id) }); setQuery(""); setTasksOpen(true);
    requestAnimationFrame(() => document.getElementById("inspection-tasks")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
  function changeScope(value: string, field: "year" | "term") {
    if (field === "year") setYear(value); else setTerm(value);
    setEvidence(null); setQuery("");
  }
  function downloadTasks() {
    const rows = [["School", "Department", "Scope", "Generated", "Subject", "Year group", "Term", "Task", "Planned work", "Additional task detail", "Skills", "Themes", "Scheme", "Latest update"], ...tasks.map((entry) => [currentSchool.name, department.name, scope, generated, entry.mapping.subject, entry.mapping.year, entry.mapping.term, formatMappingTitle(entry.mapping), formatMappingDescription(entry.mapping), entry.mapping.taskDescription ?? "", unique(entry.frameworkRefs.map(frameworkDetailText)).join("; "), entry.themeItems.map((item) => item.label).join("; "), entry.mapping.schemeReference, entry.mapping.lastMappedDate])];
    const url = URL.createObjectURL(new Blob([reportCsv(rows)], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a"); link.href = url; link.download = `${department.slug}-inspection-tasks.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="inspection-report space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
      <Link className="inline-flex items-center gap-2 text-sm font-bold text-[#741b47]" href="/admin/estyn"><span aria-hidden="true">←</span> All department summaries</Link>
      <div className="flex gap-2"><button className="btn btn-muted focus-ring" onClick={() => void refreshData()}><span aria-hidden="true">↻</span> Refresh</button><button className="btn btn-primary focus-ring" onClick={() => window.print()}><span aria-hidden="true">⎙</span> Print / save PDF</button></div>
    </div>
    <nav className="flex flex-wrap gap-2 print:hidden" aria-label="Inspection departments">{inspectionDepartments.map((item) => <Link key={item.slug} href={`/admin/estyn/${item.slug}`} aria-current={department.slug === item.slug ? "page" : undefined} className={`btn focus-ring ${department.slug === item.slug ? "btn-primary" : "btn-muted"}`}>{item.name}</Link>)}</nav>
    <header className="inspection-hero">
      <p className="inspection-eyebrow">{currentSchool.name} · Estyn department summary</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">{department.name} at a glance</h1>
      <p className="mt-2 text-sm text-slate-600">{scope} · Viewed {generated} · Latest recorded update: {dateLabel(report.lastUpdated)}</p>
      <p className="mt-3 max-w-4xl leading-7">{report.entries.length ? <><strong>{countLabel(report.entries.length, "recorded task")}</strong> across <strong>{countLabel(report.years.filter((row) => row.entries.length).length, "year group")}</strong>, linked to <strong>{countLabel(report.coveredCount, "distinct skill element")}</strong> in the available frameworks.</> : "No tasks are recorded for this department in the selected scope. Confirm the teaching offer and whether plans have been entered."}</p>
      {report.sourceSubjects.length > 0 && <p className="mt-2 text-xs text-slate-500">Included subject records: {report.sourceSubjects.join(", ")}.</p>}
    </header>
    <div className="flex flex-wrap items-end gap-4 print:hidden">
      <Select label="Year group" value={year} onChange={(value) => changeScope(value, "year")} options={wholeDepartment.yearOptions} all="All year groups" />
      <Select label="Term" value={term} onChange={(value) => changeScope(value, "term")} options={wholeDepartment.terms} all="All terms" />
      {(year || term) && <button className="btn btn-muted" onClick={() => { setYear(""); setTerm(""); setEvidence(null); setQuery(""); }}>Reset filters</button>}
    </div>
    <ReadingNote />
    {report.missingFrameworks.length > 0 && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">{report.missingFrameworks.join(", ")} definitions are unavailable. Coverage for these frameworks cannot be calculated.</p>}
    <section aria-labelledby="inspection-coverage-title">
      <h2 id="inspection-coverage-title" className="inspection-heading">Breadth of skills coverage</h2>
      <p className="inspection-caption">Distinct skill elements linked to at least one task, out of the full framework. These are recorded opportunities, not attainment scores or departmental targets.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3 inspection-frameworks">{report.frameworkSummary.map((framework) => <article key={framework.name} className="inspection-panel">
        <h3 className="font-bold">{framework.name === "DCF" ? "Digital competence (DCF)" : framework.name}</h3>
        <p className="mt-2 text-2xl font-bold text-[#571435]">{framework.total ? <>{framework.covered}<span className="text-base font-normal text-slate-500"> / {framework.total} elements</span></> : <span className="text-base">Unavailable</span>}</p>
        {framework.total > 0 && <><div className="my-3 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true"><div className="h-full rounded-full bg-[#741b47]" style={{ width: `${framework.covered / framework.total * 100}%` }} /></div><p className="text-xs text-slate-600">{countLabel(framework.tasks, "task")} · {framework.total - framework.covered} elements with no recorded opportunity</p></>}
      </article>)}</div>
    </section>
    <section>
      <h2 className="inspection-heading">Coverage across year groups</h2>
      <p className="inspection-caption">Skill columns count distinct elements. A task can contribute to several frameworks. Select a task count to see the evidence.</p>
      <div className="overflow-x-auto rounded-lg border border-slate-200 mt-3"><table className="review-table inspection-table"><thead><tr><th scope="col">Year group</th><th scope="col">Tasks</th><th scope="col">Literacy</th><th scope="col">Numeracy</th><th scope="col">DCF</th><th scope="col">Terms recorded</th></tr></thead><tbody>{report.years.map((row) => <tr key={row.year}><th scope="row">{row.year}</th><td><button className="review-link" onClick={() => showTasks(row.year, row.entries)} aria-label={`${row.year}: ${row.entries.length} tasks`}>{row.entries.length}</button></td>{row.frameworks.map((framework) => <td key={framework.name}>{framework.total ? `${framework.covered} / ${framework.total}` : "Unavailable"}</td>)}<td>{row.terms.join(", ") || "None recorded"}</td></tr>)}</tbody></table></div>
      {report.noYearRecords.length > 0 && <p className="mt-2 text-xs text-slate-600">No records in {report.noYearRecords.join(", ")}. These may be year groups in which this department is not taught; confirm with the department.</p>}
    </section>
    <div className="grid gap-4 lg:grid-cols-3 inspection-findings">
      <SkillRanking title="Most recorded skills" caption="Highest task counts; up to three examples." items={report.most.slice(0, 3)} showTasks={showTasks} />
      <SkillRanking title="Least recorded skills" caption="Lowest non-zero task counts; up to three examples." items={report.least.slice(0, 3)} showTasks={showTasks} />
      <section className="inspection-panel bg-amber-50/40">
        <h2 className="font-bold">Not yet recorded</h2><p className="mt-1 text-sm text-slate-600">{report.coverage.length ? `${report.unmapped.length} skill elements have no linked task in this scope.` : "Framework definitions are needed to identify gaps."}</p>
        <ul className="mt-4 space-y-3 text-sm">{report.unmapped.slice(0, 3).map((item) => <li key={item.key}><span className="block text-xs text-slate-500">{item.framework} · {item.strand}</span><strong>{item.element}</strong></li>)}</ul>
        {report.unmapped.length > 3 && <p className="mt-3 text-xs text-slate-600">Plus {report.unmapped.length - 3} more in the full skills register.</p>}
        {report.unmapped.length > 0 && <button className="review-link mt-4 text-sm print:hidden" onClick={() => { setCoverageFilter("missing"); setCoverageFramework(""); setCoverageOpen(true); requestAnimationFrame(() => document.getElementById("inspection-skills")?.scrollIntoView({ behavior: "smooth" })); }}>See every unrecorded skill</button>}
        {!report.unmapped.length && report.coverage.length > 0 && <p className="mt-3 text-sm">Every available skill element has at least one recorded opportunity.</p>}
      </section>
    </div>
    <section className="inspection-panel">
      <h2 className="inspection-heading">Tasks to talk through</h2>
      <p className="inspection-caption">One recorded example per year group, selected by term then title. Use the full task register below for all activities and linked skills.</p>
      <div className="mt-3 divide-y divide-slate-200">{report.years.filter((row) => row.entries.length).map((row) => {
        const entry = row.entries[0];
        return <article key={row.year} className="grid gap-2 py-3 sm:grid-cols-[7rem_1fr] inspection-example"><div className="text-sm font-bold">{row.year}<span className="block text-xs font-normal text-slate-500">{entry.mapping.term || "Term not recorded"}</span></div><div><button className="review-link text-left font-bold" onClick={() => showTasks(formatMappingTitle(entry.mapping), [entry])}>{formatMappingTitle(entry.mapping)}</button><p className="mt-1 text-sm leading-6 text-slate-600 inspection-example-description">{formatMappingDescription(entry.mapping) || "No work description recorded."}</p><p className="mt-1 text-xs text-slate-500">{unique(entry.frameworkRefs.map((ref) => ref.element)).join(" · ") || "No skill links recorded"}</p></div></article>;
      })}</div>
      {!report.entries.length && <p className="mt-3 text-sm text-slate-600">Task examples will appear when plans are recorded.</p>}
    </section>
    <div className="grid gap-4 lg:grid-cols-2 inspection-discussion">
      <section className="inspection-panel"><h2 className="inspection-heading">Questions and next steps</h2><ul className="mt-3 list-disc space-y-3 pl-5 text-sm leading-6">{report.nextSteps.map((step) => <li key={step}>{step}</li>)}</ul></section>
      <section className="inspection-panel"><h2 className="inspection-heading">Themes and progression</h2><p className="inspection-caption">Cross-cutting themes linked to recorded tasks.</p><ul className="mt-3 space-y-2 text-sm">{report.themeCoverage.map((item) => <li key={item.theme.id} className="flex items-start justify-between gap-3"><span>{item.theme.name}</span><button className="review-link shrink-0" onClick={() => showTasks(item.theme.name, item.entries)}>{countLabel(item.entries.length, "task")}</button></li>)}</ul>{!report.themeCoverage.length && <p className="mt-3 text-sm">No theme definitions available.</p>}<p className="mt-5 border-t border-slate-200 pt-3 text-sm"><strong>Progression references:</strong> {report.steps.join(", ") || "None recorded"}.</p><p className="mt-2 text-xs leading-5 text-slate-500">Progression references describe planned demand. Use pupil work and discussion to evaluate increasing independence and challenge.</p></section>
    </div>
    <details id="inspection-skills" className="inspection-panel print:hidden scroll-mt-5" open={coverageOpen} onToggle={(event) => setCoverageOpen(event.currentTarget.open)}>
      <summary className="cursor-pointer text-lg font-bold">Full skills register · {report.coverage.length} elements</summary>
      <p className="inspection-caption mt-2">All elements from the available frameworks, including those with no recorded task. Select a count to inspect its tasks.</p>
      <div className="my-4 flex flex-wrap gap-4"><Select label="Framework" value={coverageFramework} options={unique(report.coverage.map((item) => item.framework))} all="All frameworks" onChange={setCoverageFramework} /><label className="text-sm font-bold">Coverage<select className="inspection-select" value={coverageFilter} onChange={(event) => setCoverageFilter(event.target.value)}><option value="all">All elements</option><option value="recorded">Recorded</option><option value="missing">Not yet recorded</option></select></label></div>
      <div className="overflow-x-auto"><table className="review-table"><thead><tr><th scope="col">Framework / strand</th><th scope="col">Skill element</th><th scope="col">Tasks</th><th scope="col">Year groups</th></tr></thead><tbody>{coverage.map((item) => <tr key={item.key}><td>{item.framework}<span className="block text-xs text-slate-500">{item.strand}</span></td><th scope="row">{item.element}</th><td><button className="review-link" aria-label={`${item.element}: ${item.entries.length} tasks`} onClick={() => showTasks(`${item.framework}: ${item.element}`, item.entries)}>{item.entries.length}</button></td><td>{item.years.join(", ") || "None recorded"}</td></tr>)}</tbody></table></div>{!coverage.length && <p className="py-4 text-sm">No elements match this selection.</p>}
    </details>
    <details id="inspection-tasks" className="inspection-panel print:hidden scroll-mt-5" open={tasksOpen} onToggle={(event) => setTasksOpen(event.currentTarget.open)}>
      <summary className="cursor-pointer text-lg font-bold">Full task register · {countLabel(report.entries.length, "task")}</summary>
      <div className="my-4 flex flex-wrap items-end justify-between gap-3"><label className="min-w-0 flex-1 text-sm font-bold">Search tasks<input className="inspection-select w-full" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Task, skill, theme or scheme…" /></label><button className="btn btn-secondary" onClick={downloadTasks}>Download tasks (CSV)</button></div>
      <div className="mb-4 flex flex-wrap items-center gap-3" role="status"><p className="text-sm">{countLabel(tasks.length, "task")} · {evidence?.label || "All tasks in this scope"}</p>{evidence && <button className="review-link text-sm" onClick={() => setEvidence(null)}>Show all tasks</button>}</div>
      <div className="space-y-4">{tasks.map((entry) => <TaskCard key={entry.mapping.id} entry={entry} />)}</div>{!tasks.length && <p className="py-4 text-sm text-slate-600">No tasks match this selection.</p>}
    </details>
    <footer className="border-t border-slate-200 pt-3 text-xs leading-5 text-slate-500">Source: curriculum mappings and active framework definitions in the Skills Tracker. Each task is counted once per element, even if it has multiple links. Most/least lists use task counts; ties are ordered alphabetically. Print includes the overview and task examples; use the registers on screen for full detail.</footer>
  </section>;
}

function ReadingNote() {
  return <p className="inspection-reading-note"><strong>How to read this:</strong> These records show planned opportunities, not proof of delivery or pupil attainment. “Not yet recorded” is a question to check with the department; every department is not expected to cover every skill. All stored plans are included because records have no academic-year field.</p>;
}

function Select({ label, value, options, all, onChange }: { label: string; value: string; options: string[]; all: string; onChange: (value: string) => void }) {
  return <label className="text-sm font-bold">{label}<select className="inspection-select" value={value} onChange={(event) => onChange(event.target.value)}><option value="">{all}</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

function SkillRanking({ title, caption, items, showTasks }: { title: string; caption: string; items: InspectionSummary["most"]; showTasks: (label: string, entries: MappingEvidence[]) => void }) {
  return <section className="inspection-panel"><h2 className="font-bold">{title}</h2><p className="mt-1 text-sm text-slate-600">{caption}</p><ul className="mt-4 space-y-4">{items.map((item: CoverageItem) => <li key={item.key}><div className="flex items-start justify-between gap-3"><div><span className="block text-xs text-slate-500">{item.framework} · {item.strand}</span><strong className="text-sm">{item.element}</strong></div><button className="review-link shrink-0 text-sm" aria-label={`${item.element}: ${item.entries.length} tasks`} onClick={() => showTasks(`${item.framework}: ${item.element}`, item.entries)}>{countLabel(item.entries.length, "task")}</button></div></li>)}</ul>{!items.length && <p className="mt-3 text-sm text-slate-600">No skill opportunities recorded in the available frameworks.</p>}</section>;
}

function TaskCard({ entry }: { entry: MappingEvidence }) {
  const { mapping, frameworkRefs, themeItems } = entry;
  return <article className="rounded-lg border border-slate-200 p-4">
    <p className="text-xs font-bold text-[#741b47]">{mapping.year || "Year not recorded"} · {mapping.term || "Term not recorded"} · {mapping.subject}</p>
    <h3 className="mt-2 font-bold">{formatMappingTitle(mapping)}</h3>
    <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{formatMappingDescription(mapping) || "No work description recorded."}</p>
    {mapping.taskDescription && mapping.taskDescription !== formatMappingDescription(mapping) && <p className="mt-2 whitespace-pre-wrap text-sm leading-6"><strong>Task detail:</strong> {mapping.taskDescription}</p>}
    <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2"><div><h4 className="font-bold">Linked skills</h4><ul className="mt-1 space-y-1 text-slate-600">{unique(frameworkRefs.map(frameworkDetailText)).map((text) => <li key={text}>{text}</li>)}</ul>{!frameworkRefs.length && <p className="mt-1 text-slate-500">No framework links recorded.</p>}</div><div><h4 className="font-bold">Themes</h4><ul className="mt-1 space-y-1 text-slate-600">{themeItems.map((item) => <li key={item.label}>{item.label}</li>)}</ul>{!themeItems.length && <p className="mt-1 text-slate-500">No themes recorded.</p>}{mapping.crossCuttingThemeNotes && <p className="mt-2 whitespace-pre-wrap text-slate-600">{mapping.crossCuttingThemeNotes}</p>}</div></div>
    <p className="mt-3 border-t border-slate-100 pt-2 text-xs text-slate-500">Scheme: {mapping.schemeReference || "Not recorded"} · Updated: {dateLabel(mapping.lastMappedDate)}</p>
  </article>;
}
