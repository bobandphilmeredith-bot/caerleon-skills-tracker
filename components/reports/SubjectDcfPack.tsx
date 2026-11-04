"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { AccessDenied } from "@/components/AccessDenied";
import { useAuth } from "@/lib/auth";
import { useCurrentSchool } from "@/lib/currentSchool";
import { dcfProgression } from "@/lib/dcfReport";
import { buildSubjectDcfPack, subjectDcfFileName, subjectDcfPrompts, subjectDcfTaskTitle } from "@/lib/dcfSubjectPack";
import { compareTerms, compareYear, normalisePlanningTerm, normaliseYear, unique } from "@/lib/reporting";

export function SubjectDcfPack({ initialSubject = "" }: { initialSubject?: string }) {
  const school = useCurrentSchool();
  const auth = useAuth();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready || school.dataLoading || auth.authLoading) return <p role="status" className="p-10">Loading subject DCF tasks…</p>;
  if (!auth.currentUser) return <AccessDenied title="Sign in to prepare a subject pack" message="Sign in to view your school's mapped DCF tasks." />;
  if (school.dataError) return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-6">
      <h1 className="text-xl font-bold">Subject DCF pack unavailable</h1>
      <p className="my-4">The school's curriculum data could not be loaded completely. Reload it before preparing a PDF.</p>
      <button className="btn btn-secondary" onClick={() => void school.refreshData()}>Retry loading data</button>
    </div>
  );
  return <PackBuilder key={`${school.currentSchool.id}:${auth.currentUser.id}:${auth.currentUser.role}:${initialSubject}`} initialSubject={initialSubject} />;
}

function PackBuilder({ initialSubject }: { initialSubject: string }) {
  const { currentSchool, data } = useCurrentSchool();
  const { isDemoMode } = useAuth();
  const subjects = unique([
    ...data.subjectConfigs.filter((item) => item.active && (!item.schoolId || item.schoolId === currentSchool.id)).map((item) => item.name),
    ...data.mappings.filter((item) => !item.schoolId || item.schoolId === currentSchool.id).map((item) => item.subject),
  ]).sort((a, b) => a.localeCompare(b));
  const [subject, setSubject] = useState(subjects.includes(initialSubject) ? initialSubject : "");
  const [year, setYear] = useState("");
  const [term, setTerm] = useState("");
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const selectedSubject = subjects.includes(subject) ? subject : "";
  const subjectMappings = data.mappings.filter((item) => item.subject === selectedSubject && (!item.schoolId || item.schoolId === currentSchool.id));
  const years = unique(subjectMappings.map((item) => normaliseYear(item.year))).sort(compareYear);
  const terms = unique(subjectMappings.map((item) => normalisePlanningTerm(item.term))).sort(compareTerms);
  const pack = useMemo(() => selectedSubject ? buildSubjectDcfPack({
    schoolId: currentSchool.id, schoolName: currentSchool.name, mappings: data.mappings,
    frameworks: data.frameworkLibrary, subjects: [selectedSubject], yearGroups: data.yearGroups, terms: data.terms,
    filters: { subject: selectedSubject, year, term }, generatedAt: new Date().toISOString(), demo: isDemoMode,
  }) : null, [currentSchool.id, currentSchool.name, data, selectedSubject, year, term, isDemoMode]);

  function clearNotice() { setMessage(""); setError(""); }
  async function downloadPdf() {
    if (!pack?.entries.length || exporting) return;
    setExporting(true);
    clearNotice();
    try {
      const [{ createSubjectDcfPdf }, regular, bold] = await Promise.all([
        import("@/lib/dcfSubjectPdf"),
        loadFont("/fonts/NotoSans-Regular.ttf"),
        loadFont("/fonts/NotoSans-Bold.ttf"),
      ]);
      const snapshot = { ...pack, generatedAt: new Date().toISOString() };
      const bytes = await createSubjectDcfPdf(snapshot, { regular, bold });
      // Discard an in-flight export if the user changes school/account or leaves this page.
      if (!mounted.current) return;
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = subjectDcfFileName(snapshot);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setMessage(`${snapshot.subject} PDF prepared. Check your downloads.`);
    } catch {
      if (mounted.current) setError("The PDF could not be created. Check your connection and try downloading again.");
    } finally {
      if (mounted.current) setExporting(false);
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader eyebrow="Subject preparation" title="Subject DCF pack" description="Choose a subject, review its mapped digital competence tasks, then download a PDF for discussion with Estyn." accent="#ca8a04" />
      <Link href="/dcf" className="focus-ring inline-flex text-sm font-semibold text-gray-600 underline">Back to DCF dashboard</Link>
      <div className="grid gap-3 sm:grid-cols-3">
        {["1. Choose a subject", "2. Review mapped tasks", "3. Download and prepare"].map((step) => <p key={step} className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-950">{step}</p>)}
      </div>
      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm" aria-label="Choose your pack">
        <div className="grid gap-4 sm:grid-cols-3">
          <Filter label="Subject" value={selectedSubject} options={subjects} placeholder="Choose a subject" disabled={exporting} onChange={(value) => { setSubject(value); setYear(""); setTerm(""); clearNotice(); }} />
          <Filter label="Year group" value={year} options={years} placeholder="All year groups" disabled={!selectedSubject || exporting} onChange={(value) => { setYear(value); clearNotice(); }} />
          <Filter label="Term" value={term} options={terms} placeholder="All terms" disabled={!selectedSubject || exporting} onChange={(value) => { setTerm(value); clearNotice(); }} />
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-xl text-sm leading-6 text-gray-600">The PDF includes every DCF task in this selection, its recorded references and notes, a coverage overview, practice questions and space for evidence notes.</p>
          <button className="focus-ring btn btn-primary disabled:cursor-not-allowed disabled:opacity-50" disabled={!pack?.entries.length || exporting} onClick={() => void downloadPdf()}>{exporting ? "Preparing PDF…" : "Download subject DCF PDF"}</button>
        </div>
        <p className="mt-3 text-xs text-gray-500">All recorded mappings are included by default. Academic year is not recorded; check the planning cycle before using the pack.</p>
        {message ? <p role="status" className="mt-3 font-semibold text-emerald-800">{message}</p> : null}
        {error ? <p role="alert" className="mt-3 font-semibold text-red-700">{error}</p> : null}
      </section>
      {!selectedSubject ? <p className="rounded-lg border border-gray-200 p-6 text-gray-600">{subjects.length ? "Choose a subject above to preview its DCF pack." : "No subjects are available for this school yet. Add a subject and map its DCF tasks first."}</p> : !pack?.entries.length ? (
        <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-6">
          <h2 className="font-bold text-amber-950">No mapped DCF tasks in this selection</h2>
          <p className="mt-2 text-sm text-amber-950">Check the year and term filters, or add the relevant DCF references to {selectedSubject}'s curriculum mappings before downloading.</p>
          {year || term ? <button className="btn btn-secondary mt-4" onClick={() => { setYear(""); setTerm(""); clearNotice(); }}>Show all years and terms</button> : null}
        </div>
      ) : (
        <>
          {isDemoMode ? <p className="rounded-lg bg-amber-50 p-3 text-sm font-bold text-amber-900">Demonstration data - the PDF will be marked DEMO.</p> : null}
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric value={pack.entries.length} label="Mapped DCF tasks" />
            <Metric value={pack.referenceCount} label="DCF references" />
            <Metric value={pack.mappedYears.length} label="Year groups represented" />
          </div>
          <section className="rounded-lg border border-gray-200 p-5">
            <h2 className="text-lg font-bold">{selectedSubject}: mapped tasks in the PDF</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">Ordered by year group and term. These are planned opportunities; bring pupil work to discuss learning and progress.</p>
            <div className="mt-4 space-y-3">
              {pack.entries.map((entry) => <details key={entry.mapping.id} className="rounded-md border border-gray-200 p-4">
                <summary className="focus-ring cursor-pointer font-bold"><span className="mr-2 text-amber-800">{entry.mapping.year || "Year not recorded"} · {entry.mapping.term || "Term not recorded"}</span>{subjectDcfTaskTitle(entry)}</summary>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-700">{entry.mapping.activityDescription || entry.mapping.taskDescription || "No task description recorded."}</p>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-gray-700">{entry.references.map((ref, index) => <li key={index}>{ref.strand} / {ref.element} · {dcfProgression(ref)}{ref.descriptor ? <p className="mt-1 whitespace-pre-wrap text-gray-500">{ref.descriptor}</p> : null}</li>)}</ul>
              </details>)}
            </div>
          </section>
          <details className="rounded-lg border border-gray-200 p-5">
            <summary className="focus-ring cursor-pointer text-lg font-bold">Practice questions included in the pack</summary>
            <p className="mt-3 text-sm text-gray-600">Preparation prompts for staff, not an official Estyn question list.</p>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6">{subjectDcfPrompts.map((prompt) => <li key={prompt.title}><strong>{prompt.title}: </strong>{prompt.question}</li>)}</ol>
          </details>
        </>
      )}
    </section>
  );
}

async function loadFont(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Could not load the PDF font.");
  return new Uint8Array(await response.arrayBuffer());
}
function Filter({ label, value, options, placeholder, disabled, onChange }: { label: string; value: string; options: string[]; placeholder: string; disabled: boolean; onChange: (value: string) => void }) {
  const id = useId();
  return <div><label htmlFor={id} className="block text-sm font-bold text-gray-700">{label}</label><select id={id} className="focus-ring mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 disabled:bg-gray-100" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}><option value="">{placeholder}</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>;
}
function Metric({ value, label }: { value: number; label: string }) {
  return <div className="rounded-lg border border-gray-200 p-5"><p className="text-3xl font-bold text-amber-800">{value}</p><p className="mt-1 text-sm text-gray-600">{label}</p></div>;
}
