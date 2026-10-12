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
}).outputText + "\nexports.preview = buildPreview; exports.match = matchFrameworkLink;", {
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

const literacyRefs = {
  ...refs,
  frameworks: [{ id: "lit", name: "Literacy Framework", short_name: "Literacy" }, { id: "num", name: "Numeracy Framework", short_name: "Numeracy" }],
  strands: [{ id: "trans", framework_id: "lit", name: "Translanguaging", display_order: 1 }, { id: "writing", framework_id: "lit", name: "Writing", display_order: 5 }, { id: "number", framework_id: "num", name: "Number", display_order: 1 }],
  elements: [{ id: "trans-element", strand_id: "trans", name: "1.1 Translanguaging", display_order: 1 }, { id: "vocab", strand_id: "writing", name: "Vocabulary", display_order: 1 }, { id: "number-element", strand_id: "number", name: "Number", display_order: 1 }],
  descriptors: [{ id: "trans-step4", element_id: "trans-element", progression_step: 4, descriptor_text: "Translanguaging evidence" }]
};
const literacyRow = { framework_type: "Literacy", strand_name: "Literacy - Writing", element_name: "Translanguaging", year_group: "Year 8" };
for (const code of ["1.1", "5.1", "5.9", "99.1", "", "invalid"]) {
  const result = exports.match({ ...literacyRow, skill_code: code }, literacyRefs, 22, "Original teaching evidence");
  assert.equal(result.link?.elementId, "trans-element", `Translanguaging must override code ${code}`);
  assert.equal(result.link.strandId, "trans");
  assert.equal(result.link.progressionDescriptorId, "trans-step4");
  assert.equal(result.link.notes, "Original teaching evidence");
  assert.equal(result.unresolved.length, 0);
}
assert.equal(exports.match({ ...literacyRow, element_name: " 5.1 TRANSLANGUAGING ", skill_code: "5.1" }, literacyRefs, 22, "").link.elementId, "trans-element");
assert.equal(exports.match({ ...literacyRow, element_name: "", strand_name: "Literacy - Translanguaging", skill_code: "5.1" }, literacyRefs, 22, "").link.elementId, "trans-element");
assert.equal(exports.match({ ...literacyRow, element_name: "Local wording", skill_code: "5.1" }, literacyRefs, 22, "").link.elementId, "vocab", "Other skills keep code-first matching");
assert.equal(exports.match({ ...literacyRow, framework_type: "Numeracy", strand_name: "Number", skill_code: "1.1" }, literacyRefs, 22, "").link.elementId, "number-element", "Do not cross framework boundaries");
for (const elements of [literacyRefs.elements.slice(1), [...literacyRefs.elements, { ...literacyRefs.elements[0], id: "duplicate" }]]) {
  const result = exports.match({ ...literacyRow, skill_code: "5.1" }, { ...literacyRefs, elements }, 22, "");
  assert.equal(result.link, null, "Missing or ambiguous Translanguaging must not silently map to Writing");
  assert.equal(result.unresolved.length, 1);
}
console.log("Passed: Translanguaging name overrides incorrect codes, preserves evidence/progression, and leaves other skill matching unchanged.");
