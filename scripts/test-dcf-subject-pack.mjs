import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";

registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier.startsWith("@/") ? pathToFileURL(path.resolve(specifier.slice(2) + ".ts")).href : specifier, context);
} });
const { buildSubjectDcfPack, subjectDcfFileName } = await import("../lib/dcfSubjectPack.ts");
const { createSubjectDcfPdf } = await import("../lib/dcfSubjectPdf.ts");
const ref = { frameworkId: "dcf", framework: "Digital Competence Framework", strandId: "producing", strand: "Producing", elementId: "creating", element: "Creating digital content", progressionReference: "Step 3–4", descriptor: "I can combine text, images and sound to communicate ideas to a chosen audience.", notes: "Compare the first draft with the revised presentation." };
const activity = { id: "map-1", schoolId: "a", subject: "Welsh", year: "Y7", term: "autumn", unit: "Ein cynefin: a digital guide", activityDescription: "Create a bilingual digital guide to the local area. Pupils choose reliable sources, organise their findings and combine text and images for a younger audience. They refine the guide after peer feedback.", taskDescription: "Record a short spoken introduction and explain the choices made when improving the guide.", schemeReference: "CYM7.1", context: "Communicating local history and culture", lastMappedDate: "2026-10-20", note: "Cymraeg: dŵr, tŷ, ŵ, ŷ. Check image permissions before publishing.", frameworkReferences: [ref, ref] };
const input = { schoolId: "a", schoolName: "Caerleon Comprehensive School", subjects: ["Welsh", "History"], yearGroups: ["Y7", "Y8"], terms: ["Autumn", "Spring"], mappings: [activity, activity, { ...activity, id: "map-2", year: "Y8", term: "Spring", unit: "Podlediad: our community", frameworkReferences: [{ ...ref, progressionReference: "Step 4" }] }, { ...activity, id: "other-subject", subject: "History", unit: "OTHER SUBJECT MUST NOT APPEAR" }, { ...activity, schoolId: "b", unit: "OTHER SCHOOL MUST NOT APPEAR" }, { ...activity, id: "literacy", frameworkReferences: [{ ...ref, framework: "Literacy Framework" }] }], frameworks: [{ id: "dcf", schoolId: "a", shortName: "DCF", name: "Digital Competence Framework", strands: [{ id: "producing", name: "Producing", elements: [{ id: "creating", name: "Creating digital content" }, { id: "evaluating", name: "Evaluating and improving digital content" }] }, { id: "citizenship", name: "Citizenship", elements: [{ id: "rights", name: "Digital rights, licensing and ownership" }] }] }], filters: { subject: "Welsh", year: "", term: "" }, generatedAt: "2026-11-04T12:00:00Z", demo: true };
const pack = buildSubjectDcfPack(input);
assert.equal(pack.entries.length, 2, "Deduplicate mappings and isolate subject, school and DCF");
assert.equal(pack.referenceCount, 2, "Deduplicate identical references");
assert.deepEqual(pack.mappedYears, ["Year 7", "Year 8"]);
assert.equal(pack.entries[0].references[0].descriptor, ref.descriptor);
assert.ok(pack.entries.every((entry) => entry.mapping.subject === "Welsh" && entry.mapping.schoolId === "a"));
assert.throws(() => buildSubjectDcfPack({ ...input, filters: { subject: "", year: "", term: "" } }), /Choose a subject/);
const filtered = buildSubjectDcfPack({ ...input, filters: { subject: "Welsh", year: "Year 8", term: "Spring" } });
assert.equal(filtered.entries.length, 1);
assert.equal(filtered.entries[0].evidenceId, pack.entries[1].evidenceId, "References remain stable under filtering");
assert.match(subjectDcfFileName(filtered), /^welsh-year-8-spring-dcf-estyn-preparation-2026-11-04\.pdf$/);
assert.equal(buildSubjectDcfPack({ ...input, frameworks: [] }).entries.length, 2, "Keep recorded tasks when the catalogue is missing");
const fonts = { regular: new Uint8Array(await readFile("public/fonts/NotoSans-Regular.ttf")), bold: new Uint8Array(await readFile("public/fonts/NotoSans-Bold.ttf")) };
await assert.rejects(() => createSubjectDcfPdf(buildSubjectDcfPack({ ...input, mappings: [] }), fonts), /no mapped DCF tasks/);
const bytes = await createSubjectDcfPdf(pack, fonts);
const pdf = await PDFDocument.load(bytes);
assert.match(pdf.getTitle(), /Welsh/);
assert.ok(pdf.getPageCount() >= 6);
// An imported task must flow over pages, including long identifiers and the final sentinel.
const longPack = buildSubjectDcfPack({ ...input, mappings: [{ ...activity, activityDescription: `${"A long imported task describing independent digital learning. ".repeat(450)}\n${"identifier".repeat(90)}\nEND OF LONG TASK`, frameworkReferences: [ref, { ...ref, descriptor: "A distinct descriptor must be preserved." }] }] });
assert.equal(longPack.referenceCount, 2, "Distinct descriptors must survive deduplication");
const longBytes = await createSubjectDcfPdf(longPack, fonts);
const longPdf = await PDFDocument.load(longBytes);
assert.ok(longPdf.getPageCount() > pdf.getPageCount(), "Long tasks must continue on additional pages");
if (process.argv.includes("--output")) {
  await mkdir("tmp/pdfs", { recursive: true });
  await writeFile("tmp/pdfs/dcf-subject-sample.pdf", bytes);
  await writeFile("tmp/pdfs/dcf-subject-long.pdf", longBytes);
}
console.log(`Passed subject DCF pack: school/subject isolation, filters, deduplication, descriptors, empty-state protection and PDF pagination (${pdf.getPageCount()} sample pages; ${longPdf.getPageCount()} long-task pages).`);
