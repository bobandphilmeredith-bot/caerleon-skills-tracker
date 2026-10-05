"use client";

import { useEffect, useState } from "react";
import { AccessDenied } from "@/components/AccessDenied";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";
import { areaThemes } from "@/lib/theme";
import { CflDocxSummary, convertCflDocxToCsv } from "@/lib/cflDocx";

type PreviewGroup = {
  key: string;
  rows: number[];
  subject: string;
  subjectId?: string;
  yearGroup: string;
  term: string;
  moduleCode: string;
  moduleTitle: string;
  curriculumIntent: string;
  sourceDetails: string[];
  frameworkLinks: { label: string; notes: string }[];
  themeLinks: { label: string; notes: string }[];
  unresolved: string[];
  errors: string[];
  existingMappingId?: string;
};

type Preview = {
  summary: {
    rowsRead: number;
    groupedMappings: number;
    frameworkLinksToCreate: number;
    cctElementLinksToCreate: number;
    duplicateLinksSkipped: number;
    unresolvedRows: number;
    errors: number;
    warnings: number;
    existingMappingsSkipped: number;
    missingColumns: string[];
  };
  groups: PreviewGroup[];
};

type ImportBatch = {
  id: string;
  file_name: string | null;
  row_count: number | null;
  grouped_mapping_count: number | null;
  framework_link_count: number | null;
  theme_link_count: number | null;
  status: string;
  created_at: string;
  undone_at: string | null;
};

export default function ImportCurriculumClient() {
  const { canManageSchool } = useAuth();
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [docxSummaries, setDocxSummaries] = useState<Array<CflDocxSummary & { fileName: string }>>([]);
  const [fileErrors, setFileErrors] = useState<Array<{ fileName: string; message: string }>>([]);

  useEffect(() => {
    if (canManageSchool) void loadHistory();
  }, [canManageSchool]);

  if (!canManageSchool) {
    return <AccessDenied title="Import restricted" message="Only school admins and platform admins can import curriculum mappings." />;
  }

  async function readFiles(fileList?: FileList | null) {
    const files = Array.from(fileList ?? []);
    if (!files.length) return;

    setPreview(null);
    setMessage("");
    setDocxSummaries([]);
    setFileErrors([]);
    setLoading(true);

    try {
      const csvFiles = files.filter((file) => file.name.toLowerCase().endsWith(".csv"));
      const docxFiles = files.filter((file) => file.name.toLowerCase().endsWith(".docx"));

      if (files.length > 1 && csvFiles.length) {
        throw new Error("Batch upload currently supports Word .docx CfLs only. Upload CSV files one at a time.");
      }
      if (!csvFiles.length && !docxFiles.length) {
        throw new Error("Choose a .docx Context for Learning file or a .csv curriculum file.");
      }

      if (csvFiles.length === 1) {
        const file = csvFiles[0];
        setFileName(file.name);
        setCsv(await file.text());
        return;
      }

      const converted: Array<{ file: File; csv: string; summary: CflDocxSummary }> = [];
      const failed: Array<{ fileName: string; message: string }> = [];

      for (const file of docxFiles) {
        try {
          const result = await convertCflDocxToCsv(file);
          converted.push({ file, ...result });
        } catch (error) {
          failed.push({
            fileName: file.name,
            message: error instanceof Error ? error.message : "Could not read this Word document."
          });
        }
      }

      if (!converted.length) {
        setFileErrors(failed);
        throw new Error("None of the selected Word documents could be read. See the file errors below.");
      }

      const combinedCsv = converted
        .map((item, index) => index === 0 ? item.csv : withoutCsvHeader(item.csv))
        .filter(Boolean)
        .join("\n");

      setCsv(combinedCsv);
      setFileName(docxFiles.length === 1 ? docxFiles[0].name : `${docxFiles.length} selected · ${converted.length} ready`);
      setDocxSummaries(converted.map((item) => ({ ...item.summary, fileName: item.file.name })));
      setFileErrors(failed);

      const skills = converted.reduce((sum, item) => sum + item.summary.skillsFound, 0);
      const themes = converted.reduce((sum, item) => sum + item.summary.themesFound, 0);
      const warningCount = converted.reduce((sum, item) => sum + item.summary.warnings.length, 0);
      setMessage(
        `${converted.length} of ${docxFiles.length} CfL file${docxFiles.length === 1 ? "" : "s"} ready · ${skills} skills · ${themes} populated cross-cutting themes${warningCount ? ` · ${warningCount} file warning${warningCount === 1 ? "" : "s"}` : ""}${failed.length ? ` · ${failed.length} file${failed.length === 1 ? "" : "s"} could not be read` : ""}.`
      );
    } catch (error) {
      setCsv("");
      setFileName("");
      setDocxSummaries([]);
      setMessage(error instanceof Error ? error.message : "Could not read the selected files.");
    } finally {
      setLoading(false);
    }
  }

  async function callImportApi(action: "preview" | "import" | "history" | "undo", extra: Record<string, unknown> = {}) {
    const token = await getAccessToken();
    if (!token) throw new Error("You must be signed in before importing.");
    const response = await fetch("/api/admin/curriculum-import", {
      method: "POST",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, csv, fileName, ...extra })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Import request failed.");
    return result;
  }

  async function previewImport() {
    setLoading(true);
    setMessage("");
    try {
      const result = await callImportApi("preview");
      setPreview(result.preview);
      setMessage("Preview ready. Source rows have been grouped into curriculum activities before import. Warnings stay visible for review and missing progression steps are never invented.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not preview this file.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmImport() {
    setLoading(true);
    setMessage("");
    try {
      const result = await callImportApi("import");
      setPreview(result.preview);
      setMessage(result.result?.ok ? `Import complete. ${result.result.mappingsInserted} new curriculum mapping${result.result.mappingsInserted === 1 ? "" : "s"} created; ${result.result.existingMappingsUpdated ?? 0} existing mapping${(result.result.existingMappingsUpdated ?? 0) === 1 ? "" : "s"} updated with ${result.result.frameworkLinksInserted ?? 0} framework link${(result.result.frameworkLinksInserted ?? 0) === 1 ? "" : "s"} and ${result.result.themeLinksInserted ?? 0} cross-cutting link${(result.result.themeLinksInserted ?? 0) === 1 ? "" : "s"}.` : result.result?.message ?? "Import failed.");
      await loadHistory();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not import this batch.");
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory() {
    try {
      const result = await callImportApi("history", { csv: "history" });
      setBatches(result.batches ?? []);
    } catch {
      setBatches([]);
    }
  }

  async function undoImport(batchId: string) {
    setLoading(true);
    setMessage("");
    try {
      await callImportApi("undo", { csv: "undo", batchId });
      setMessage("Import undone.");
      await loadHistory();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not undo import.");
    } finally {
      setLoading(false);
    }
  }

  const canImport = Boolean(preview && !preview.summary.errors && csv.trim());

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Admin Import"
        title="Import Curriculum Mappings"
        description="Upload one or many Caerleon Context for Learning Word documents, or a single curriculum CSV, preview the proposed mappings and import them safely."
        accent={areaThemes.overview.accent}
      />

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-gray-950">Upload curriculum files</h2>
        <p className="mt-1 text-sm leading-6 text-gray-600">Select one or many Caerleon Context for Learning .docx files, or a single existing curriculum CSV. Word documents are read locally in your browser and combined into one controlled batch preview before anything is written to Supabase.</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto]">
          <input className="focus-ring rounded-md border border-gray-300 bg-white px-3 py-2" type="file" multiple accept=".csv,text/csv,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => readFiles(event.target.files)} />
          <button className="focus-ring btn btn-primary" type="button" onClick={previewImport} disabled={loading || !csv.trim()}>
            {loading ? "Working..." : "Preview import"}
          </button>
        </div>
        {fileName ? <p className="mt-3 text-sm font-semibold text-gray-700">Selected: {fileName}</p> : null}
        {docxSummaries.length ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {docxSummaries.map((summary) => (
              <div key={summary.fileName} className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                <p className="font-bold text-gray-900">{summary.fileName}</p>
                <p className="mt-1 text-gray-600">{summary.subject || "Subject?"} · {summary.yearGroup || "Year?"} · {summary.term || "Term?"}</p>
                <p className="mt-1 text-gray-600">{summary.skillsFound} skills · {summary.themesFound} cross-cutting themes</p>
                {summary.warnings.length ? <p className="mt-1 font-semibold text-amber-800">{summary.warnings.length} warning{summary.warnings.length === 1 ? "" : "s"}</p> : <p className="mt-1 font-semibold text-green-700">Ready</p>}
              </div>
            ))}
          </div>
        ) : null}
        {docxSummaries.some((summary) => summary.warnings.length) ? (
          <ul className="mt-3 list-disc space-y-1 rounded-md border border-amber-200 bg-amber-50 px-6 py-3 text-sm font-semibold text-amber-900">
            {docxSummaries.flatMap((summary) => summary.warnings.map((warning) => <li key={`${summary.fileName}-${warning}`}><strong>{summary.fileName}:</strong> {warning}</li>))}
          </ul>
        ) : null}
        {fileErrors.length ? (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <p className="font-bold">Files not read</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {fileErrors.map((item) => <li key={item.fileName}><strong>{item.fileName}:</strong> {item.message}</li>)}
            </ul>
            <p className="mt-2">The readable files can still be previewed; the failed file is excluded from the batch.</p>
          </div>
        ) : null}
        {message ? <p className="mt-4 rounded-md border px-4 py-3 text-sm font-bold" style={{ borderColor: areaThemes.overview.border, backgroundColor: areaThemes.overview.soft, color: areaThemes.overview.text }}>{message}</p> : null}
      </section>

      {preview ? (
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-950">Preview</h2>
              <p className="mt-1 text-sm font-semibold text-gray-600">Source rows have been grouped into curriculum activities before import. Warnings remain visible for review but do not silently invent missing progression steps.</p>
            </div>
            <button className="focus-ring btn btn-primary" type="button" onClick={confirmImport} disabled={loading || !canImport}>
              Confirm import
            </button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Summary label="Source rows read" value={preview.summary.rowsRead} />
            <Summary label="Grouped mappings" value={preview.summary.groupedMappings} />
            <Summary label="Framework links" value={preview.summary.frameworkLinksToCreate} />
            <Summary label="Cross-cutting links" value={preview.summary.cctElementLinksToCreate} />
            <Summary label="Duplicates skipped" value={preview.summary.duplicateLinksSkipped} />
            <Summary label="Existing skipped" value={preview.summary.existingMappingsSkipped} />
            <Summary label="Warnings" value={preview.summary.warnings} />
            <Summary label="Errors" value={preview.summary.errors} />
          </div>
          {preview.summary.missingColumns.length ? <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">Missing required columns: {preview.summary.missingColumns.join(", ")}</p> : null}
          <div className="mt-5 space-y-3">
            {preview.groups.map((group) => (
              <article key={group.key} className="rounded-lg border border-gray-200 p-4">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">Rows {group.rows.join(", ")}</p>
                    <h3 className="mt-1 font-bold text-gray-950">{group.moduleCode} · {group.moduleTitle}</h3>
                    <p className="mt-1 text-sm text-gray-600">{group.subject} · {group.yearGroup} · {group.term}</p>
                  </div>
                  {group.existingMappingId ? <span className="h-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">Existing mapping — add missing links</span> : null}
                </div>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-gray-600">{group.curriculumIntent}</p>
                <PreviewList title="Framework links" items={group.frameworkLinks.map((link) => link.label)} empty="No framework links matched." />
                <PreviewList title="CCT element links" items={group.themeLinks.map((link) => link.label)} empty="No CCT element links matched." />
                <PreviewList title="Source details" items={group.sourceDetails} empty="" />
                <PreviewList title="Unresolved" items={group.unresolved} empty="" warning />
                <PreviewList title="Errors" items={group.errors} empty="" error />
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-950">Import history</h2>
            <p className="mt-1 text-sm text-gray-600">Undo removes only rows recorded for that import batch.</p>
          </div>
          <button className="focus-ring btn btn-muted" type="button" onClick={loadHistory}>
            Refresh
          </button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="py-3 pr-3 font-bold">File</th>
                <th className="py-3 pr-3 font-bold">Created</th>
                <th className="py-3 pr-3 font-bold">Mappings</th>
                <th className="py-3 pr-3 font-bold">Links</th>
                <th className="py-3 pr-3 font-bold">Status</th>
                <th className="py-3 pr-3 font-bold">Action</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch) => (
                <tr key={batch.id} className="border-b border-gray-100">
                  <td className="py-3 pr-3 font-semibold">{batch.file_name ?? "CSV import"}</td>
                  <td className="py-3 pr-3">{new Date(batch.created_at).toLocaleString()}</td>
                  <td className="py-3 pr-3">{batch.grouped_mapping_count ?? 0}</td>
                  <td className="py-3 pr-3">{(batch.framework_link_count ?? 0) + (batch.theme_link_count ?? 0)}</td>
                  <td className="py-3 pr-3">{batch.undone_at ? "Undone" : batch.status}</td>
                  <td className="py-3 pr-3">
                    <button className="focus-ring btn btn-secondary text-xs" type="button" onClick={() => undoImport(batch.id)} disabled={Boolean(batch.undone_at) || loading}>
                      Undo import
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!batches.length ? <p className="rounded-md bg-gray-50 p-4 text-sm text-gray-600">No import batches found.</p> : null}
        </div>
      </section>
    </section>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
      <span className="block text-xs font-bold uppercase tracking-[0.12em] text-gray-500">{label}</span>
      <span className="mt-1 block text-xl font-bold text-gray-950">{value}</span>
    </div>
  );
}

function PreviewList({ title, items, empty, warning = false, error = false }: { title: string; items: string[]; empty: string; warning?: boolean; error?: boolean }) {
  if (!items.length && !empty) return null;
  return (
    <div className="mt-3">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">{title}</p>
      {items.length ? (
        <ul className={`mt-1 list-disc space-y-1 pl-5 text-sm ${error ? "text-red-700" : warning ? "text-amber-800" : "text-gray-700"}`}>
          {items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
        </ul>
      ) : (
        <p className="mt-1 text-sm text-gray-500">{empty}</p>
      )}
    </div>
  );
}

async function getAccessToken() {
  if (!supabase) return "";
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}


function withoutCsvHeader(csv: string) {
  const newline = csv.indexOf("\n");
  return newline >= 0 ? csv.slice(newline + 1) : "";
}
