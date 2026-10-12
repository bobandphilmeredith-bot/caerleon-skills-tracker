import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as metadata from "../lib/cflMetadata.ts";

const { resolveCflSubject, explicitCflTerm } = metadata;
assert.equal(resolveCflSubject("International Languages", "Context for Learning German 8.5 & 8.6.docx"), "German");
assert.equal(resolveCflSubject("International Languages", "Context for Learning French 7.1.docx"), "French");
assert.equal(resolveCflSubject("International Languages - German", "Unit.docx"), "German");
assert.equal(resolveCflSubject("International Languages", "Unit.docx", "French conversation"), "French");
assert.equal(resolveCflSubject("International Languages", "French and German.docx"), "International Languages");
assert.equal(resolveCflSubject("International Languages", "Unit.docx"), "International Languages");
assert.equal(resolveCflSubject("International Languages - French", "German.docx"), "International Languages - French");
assert.equal(resolveCflSubject("History", "German history.docx"), "History");
assert.equal(resolveCflSubject("French", "German.docx"), "French", "An explicit subject is not overwritten by a filename");
assert.equal(explicitCflTerm("German 8.5 & 8.6.docx"), "", "Module numbers must not invent a term");
assert.equal(explicitCflTerm("Summer term 2"), "Summer");
assert.equal(explicitCflTerm("Autumn and Spring"), "");

const exports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync("app/api/admin/curriculum-import/route.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText + "\nexports.preview = buildPreview;", {
  exports, require(name) {
    if (name === "next/server") return {};
    if (name.endsWith("_helpers")) return {};
    if (name.endsWith("cflMetadata")) return metadata;
    throw new Error(`Unexpected import: ${name}`);
  }
});
const refs = { subjects: [{ id: "fr", name: "French" }, { id: "de", name: "German" }, { id: "dt", name: "DT" }, { id: "ma", name: "Maths" }], frameworks: [], strands: [], elements: [], descriptors: [], themes: [], themeElements: [], existingMappings: [] };
const row = (subject, source, term = "Autumn") => [subject, "Year 8", term, "8.5", "Conversations", "Practise speaking", source];
const csv = rows => [["subject", "year_group", "term", "module_code", "module_title", "curriculum_intent", "source_file"], ...rows].map(r => r.map(c => `"${c.replaceAll('"', '""')}"`).join(",")).join("\n");
const batch = exports.preview(csv([row("International Languages", "German.docx"), row("International Languages", "French.docx")]), refs);
assert.equal(batch.groups.length, 2);
assert.equal(batch.groups[0].subject, "German");
assert.equal(batch.groups[1].subject, "French");
assert.equal(batch.summary.errors, 0);
const ambiguousCsv = csv([row("International Languages", "Languages.docx", "")]);
assert.ok(exports.preview(ambiguousCsv, refs).groups[0].errors.some(e => e.includes("select French or German")));
const corrected = exports.preview(ambiguousCsv, refs, { "Languages.docx": { subject: "German", term: "Summer" } });
assert.equal(corrected.summary.errors, 0);
assert.equal(corrected.groups[0].term, "Summer");
assert.equal(corrected.groups[0].subjectId, "de");
assert.ok(exports.preview(ambiguousCsv, refs, { "Other.docx": { subject: "German", term: "Summer" } }).summary.errors > 0);
assert.ok(exports.preview(ambiguousCsv, refs, { "Languages.docx": { subject: "Unknown", term: "Invalid" } }).summary.errors > 0);
assert.equal(exports.preview(csv([row("International Languages", "German Summer.docx", "")]), refs).summary.errors, 0);
for (const name of ["ST", "D & T", "Design Technology"]) assert.equal(exports.preview(csv([row(name, "Technology.docx")]), refs).groups[0].subjectId, "dt");
assert.equal(exports.preview(csv([row("Mathematics", "Maths.docx")]), refs).groups[0].subjectId, "ma");
console.log("Passed: French/German resolution, mixed batches, ambiguous-language safety, per-file corrections, explicit terms and existing subject aliases.");
