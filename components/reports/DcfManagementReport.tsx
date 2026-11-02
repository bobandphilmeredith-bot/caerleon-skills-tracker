"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AccessDenied } from "@/components/AccessDenied";
import { useAuth } from "@/lib/auth";
import { useCurrentSchool } from "@/lib/currentSchool";
import {
  buildDcfReport,
  dcfEvidenceCsv,
  type DcfActivity,
} from "@/lib/dcfReport";
import { dcfReportStyles } from "@/lib/dcfReportStyles";
import {
  compareTerms,
  compareYear,
  normalisePlanningTerm,
  normaliseYear,
  unique,
} from "@/lib/reporting";
import {
  DcfReportDocument,
  emptyDcfNotes,
  EvidenceCard,
  type DcfMeetingNotes,
} from "./DcfReportDocument";

function download(content: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
export function DcfManagementReport() {
  const school = useCurrentSchool();
  const auth = useAuth();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready || auth.authLoading || school.dataLoading)
    return (
      <p role="status" className="p-10">
        Loading the DCF management report…
      </p>
    );
  if (!auth.canManageSchool)
    return (
      <AccessDenied
        title="Leadership report restricted"
        message="Your role does not have access to the whole-school DCF management report."
      />
    );
  if (school.dataError)
    return (
      <div role="alert" className="rounded-lg border border-red-200 p-8">
        <h1 className="text-xl font-bold">DCF report unavailable</h1>
        <p className="my-4">
          The school’s curriculum data could not be loaded completely. Report
          figures and exports are withheld until loading succeeds.
        </p>
        <button
          className="btn btn-secondary"
          onClick={() => void school.refreshData()}
        >
          Retry loading data
        </button>
      </div>
    );
  return <Report key={`${school.currentSchool.id}:${auth.currentUser?.id}`} />;
}
function Report() {
  const { currentSchool, data } = useCurrentSchool();
  const { isDemoMode, canEditSubject } = useAuth();
  const [subject, setSubject] = useState("");
  const [year, setYear] = useState("");
  const [term, setTerm] = useState("");
  const [includeEvidence, setIncludeEvidence] = useState(false);
  const [notes, setNotes] = useState<DcfMeetingNotes>(emptyDcfNotes);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [selection, setSelection] = useState<{
    label: string;
    entries: DcfActivity[];
  } | null>(null);
  const inspector = useRef<HTMLDialogElement>(null);
  const documentRoot = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const subjects = unique([
    ...data.subjectConfigs
      .filter((item) => item.active)
      .map((item) => item.name),
    ...data.mappings.map((item) => item.subject),
  ]).sort();
  const years = unique(
    [...data.yearGroups, ...data.mappings.map((item) => item.year)].map(
      normaliseYear,
    ),
  ).sort(compareYear);
  const terms = unique(
    [
      "Autumn",
      "Spring",
      "Summer",
      ...data.terms,
      ...data.mappings.map((item) => item.term),
    ].map(normalisePlanningTerm),
  ).sort(compareTerms);
  const report = useMemo(
    () =>
      buildDcfReport({
        schoolId: currentSchool.id,
        schoolName: currentSchool.name,
        mappings: data.mappings,
        frameworks: data.frameworkLibrary,
        subjects: unique([
          ...data.subjectConfigs
            .filter((item) => item.active)
            .map((item) => item.name),
          ...data.mappings.map((item) => item.subject),
        ]),
        yearGroups: data.yearGroups,
        terms: data.terms,
        filters: { subject, year, term },
        generatedAt: new Date().toISOString(),
        demo: isDemoMode,
      }),
    [
      currentSchool.id,
      currentSchool.name,
      data,
      subject,
      year,
      term,
      isDemoMode,
    ],
  );
  useEffect(() => {
    if (selection && !inspector.current?.open) inspector.current?.showModal();
  }, [selection]);
  function closeInspector() {
    inspector.current?.close();
    setSelection(null);
    lastFocus.current?.focus();
  }
  function inspect(label: string, entries: DcfActivity[]) {
    lastFocus.current = document.activeElement as HTMLElement;
    setSelection({ label, entries });
  }
  async function exportPack() {
    setExporting(true);
    setExportError("");
    try {
      const document = documentRoot.current
        ?.querySelector("article")
        ?.cloneNode(true) as HTMLElement | undefined;
      if (!document) throw new Error("Report is not rendered");
      document.querySelectorAll("button.dcf-count").forEach((button) => {
        const count = window.document.createElement("span");
        count.className = "dcf-number";
        count.textContent = button.textContent;
        button.replaceWith(count);
      });
      document
        .querySelectorAll("[data-dcf-interactive-hint]")
        .forEach((hint) => hint.remove());
      const body = document.outerHTML;
      const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(currentSchool.name)} — DCF management report</title><style>body{margin:0;padding:30px;background:#eef1ed}@media print{body{padding:0}}${dcfReportStyles}</style></head><body>${body}</body></html>`;
      download(
        html,
        `dcf-management-report-${new Date().toISOString().slice(0, 10)}.html`,
        "text/html;charset=utf-8",
      );
    } catch {
      setExportError(
        "The meeting pack could not be created. Please try again, or use Print / save PDF.",
      );
    } finally {
      setExporting(false);
    }
  }
  return (
    <div className="dcf-report space-y-6">
      <style>{dcfReportStyles}</style>
      <div className="dcf-controls space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600"
            href="/dcf"
          >
            <span aria-hidden="true">←</span>DCF dashboard
          </Link>
          <span className="text-xs font-semibold uppercase tracking-widest text-emerald-800">
            Management information
          </span>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Filter
              label="Subject"
              value={subject}
              onChange={setSubject}
              options={subjects}
              all="All subjects"
            />
            <Filter
              label="Year group"
              value={year}
              onChange={setYear}
              options={years}
              all="All year groups"
            />
            <Filter
              label="Term"
              value={term}
              onChange={setTerm}
              options={terms}
              all="All terms"
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs text-gray-600">
              All report sections and exports use this selection. Academic year
              is not recorded.
            </p>
            {subject || year || term ? (
              <button
                className="text-sm font-semibold text-emerald-800 underline"
                onClick={() => {
                  setSubject("");
                  setYear("");
                  setTerm("");
                }}
              >
                Reset filters
              </button>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn btn-primary" onClick={() => window.print()}>
            <span aria-hidden="true">▤</span>Print / save PDF
          </button>
          <button
            className="btn btn-secondary"
            disabled={exporting}
            onClick={() => void exportPack()}
          >
            <span aria-hidden="true">↓</span>
            {exporting ? "Preparing pack…" : "Download meeting pack"}
          </button>
          <button
            className="btn btn-muted"
            onClick={() =>
              download(
                dcfEvidenceCsv(report),
                `dcf-evidence-${new Date().toISOString().slice(0, 10)}.csv`,
                "text/csv;charset=utf-8",
              )
            }
          >
            <span aria-hidden="true">↓</span>Evidence CSV
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <label className="flex items-center gap-2 font-semibold">
            <input
              type="checkbox"
              checked={includeEvidence}
              onChange={(event) => setIncludeEvidence(event.target.checked)}
            />
            Include full activity appendix ({report.entries.length} records)
          </label>
          <span className="text-xs text-gray-500">
            Meeting pack: a self-contained HTML file for offline reading and
            printing.
          </span>
        </div>
        {exportError ? (
          <p role="alert" className="text-sm text-red-700">
            {exportError}
          </p>
        ) : null}
        <details className="rounded-lg border border-gray-200 p-4">
          <summary className="cursor-pointer text-sm font-bold text-emerald-900">
            Add school evaluation & agreed actions
          </summary>
          <p className="mt-3 text-xs text-gray-500">
            Optional notes appear in the report and exports. They remain only in
            this open page; download the meeting pack to keep them. No
            pupil-identifiable information is needed.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {(
              [
                ["evaluation", "Evaluation / evidence from review"],
                ["decisions", "Agreed actions / evidence of success"],
              ] as const
            ).map(([key, label]) => (
              <label className="text-sm font-semibold" key={key}>
                {label}
                <textarea
                  aria-label={label}
                  rows={4}
                  value={notes[key]}
                  onChange={(e) =>
                    setNotes((current) => ({
                      ...current,
                      [key]: e.target.value,
                    }))
                  }
                  className="mt-2 block w-full rounded-md border border-gray-300 p-3 font-normal"
                />
              </label>
            ))}
            <label className="text-sm font-semibold">
              Owner(s)
              <input
                aria-label="Owner(s)"
                value={notes.owner}
                onChange={(e) =>
                  setNotes((current) => ({ ...current, owner: e.target.value }))
                }
                className="mt-2 block w-full rounded-md border border-gray-300 p-3 font-normal"
              />
            </label>
            <label className="text-sm font-semibold">
              Review date
              <input
                aria-label="Review date"
                type="date"
                value={notes.reviewDate}
                onChange={(e) =>
                  setNotes((current) => ({
                    ...current,
                    reviewDate: e.target.value,
                  }))
                }
                className="mt-2 block w-full rounded-md border border-gray-300 p-3 font-normal"
              />
            </label>
          </div>
        </details>
        <nav
          aria-label="Report sections"
          className="flex flex-wrap gap-x-5 gap-y-2 border-b border-gray-200 pb-4 text-xs font-semibold text-emerald-900"
        >
          {[
            ["summary", "Summary"],
            ["coverage", "Coverage"],
            ["reach", "Subjects & sequence"],
            ["progression", "Progression"],
            ["priorities", "Priorities"],
            ["discussion", "Estyn discussion"],
            ["sources", "Sources"],
          ].map(([id, label]) => (
            <a className="hover:underline" key={id} href={`#dcf-${id}`}>
              {label}
            </a>
          ))}
        </nav>
        <p className="sr-only" role="status">
          Showing {report.entries.length} DCF activities for{" "}
          {subject || "all subjects"}, {year || "all year groups"},{" "}
          {term || "all terms"}.
        </p>
      </div>
      <div ref={documentRoot}>
        <DcfReportDocument
          report={report}
          notes={notes}
          includeEvidence={includeEvidence}
          onInspect={inspect}
        />
      </div>
      <dialog
        ref={inspector}
        aria-labelledby="dcf-inspector-title"
        onCancel={(event) => {
          event.preventDefault();
          closeInspector();
        }}
        className="dcf-inspector m-auto max-h-[88vh] w-[min(960px,94vw)] overflow-y-auto rounded-xl border border-gray-200 p-0 shadow-xl backdrop:bg-black/45"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-5 border-b border-gray-200 bg-white p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
              Underlying planned activities
            </p>
            <h2 id="dcf-inspector-title" className="mt-1 text-xl font-bold">
              {selection?.label}
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              {selection?.entries.length} distinct records in the current
              selection
            </p>
          </div>
          <button
            onClick={closeInspector}
            aria-label="Close evidence"
            className="rounded-md border border-gray-300 p-2"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        <div className="dcf-document p-5">
          {selection?.entries.map((entry) => (
            <div key={entry.mapping.id}>
              <EvidenceCard entry={entry} />
              {canEditSubject(entry.mapping.subject) ? (
                <Link
                  className="text-xs underline"
                  href={`/edit-curriculum/${encodeURIComponent(entry.mapping.id)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open mapping record in a new tab
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      </dialog>
    </div>
  );
}
function Filter({
  label,
  value,
  onChange,
  options,
  all,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  all: string;
}) {
  return (
    <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
      {label}
      <select
        aria-label={label}
        className="mt-2 block w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-gray-900"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{all}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
