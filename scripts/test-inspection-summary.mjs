import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";

registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier.startsWith("@/") ? pathToFileURL(path.resolve(specifier.slice(2) + ".ts")).href : specifier, context);
} });
const { buildInspectionSummary, inspectionDepartments } = await import("../lib/inspectionSummary.ts");
const subject = { id: "art", schoolId: "school-a", name: "Art & Design", active: true };
const framework = { schoolId: "school-a", name: "Literacy Framework", shortName: "Literacy", strands: [{ id: "writing", name: "Writing", elements: [{ id: "vocabulary", name: "Vocabulary" }, { id: "structure", name: "Structure" }, { id: "punctuation", name: "Punctuation" }] }] };
const reference = { framework: "Literacy Framework", strandId: "writing", strand: "Writing", elementId: "vocabulary", element: "Vocabulary", progressionReference: "Step 3" };
const mapping = { id: "a", schoolId: "school-a", subjectId: "art", subject: "Art & Design", year: "Y7", term: "autumn", unit: "Annotating a portrait", activityDescription: "Explain choices of colour and form.", schemeReference: "ART1", lastMappedDate: "2026-09-01", frameworkReferences: [reference, reference] };
const base = { schoolId: "school-a", department: inspectionDepartments[0], subjects: [subject], frameworks: [framework], themes: [], yearGroups: ["Year 7", "Year 8", "Year 9", "Y12"], mappings: [mapping, mapping,
  { ...mapping, id: "b", year: "Year 8", term: "Spring", lastMappedDate: "2026-10-01", frameworkReferences: [reference, { ...reference, elementId: "structure", element: "Structure" }] },
  { ...mapping, id: "c", year: "12", term: "Summer", lastMappedDate: "invalid", activityDescription: "", taskDescription: "Evaluate an artist’s process.", frameworkReferences: [] },
  { ...mapping, schoolId: "school-b", unit: "Other school must never replace the original" },
  { ...mapping, id: "other", subjectId: "history", subject: "History" }
] };
const report = buildInspectionSummary(base);
assert.equal(report.entries.length, 3, "Count distinct tasks; exclude other departments and schools before deduplicating");
assert.equal(report.entries[0].mapping.unit, "Annotating a portrait");
assert.deepEqual(report.frameworkSummary[0], { name: "Literacy", total: 3, covered: 2, tasks: 2 });
assert.equal(report.most[0].element, "Vocabulary");
assert.equal(report.most[0].entries.length, 2, "Duplicate skill links must not inflate task counts");
assert.equal(report.least[0].element, "Structure", "Least recorded excludes zero-count elements");
assert.equal(report.unmapped[0].element, "Punctuation");
assert.equal(report.coveredCount, 2);
assert.equal(report.singleCount, 1);
assert.equal(report.years.find((row) => row.year === "Year 7").frameworks[0].covered, 1);
assert.ok(report.yearOptions.includes("Year 12"), "Post-16 records and configured years must be normalised and included");
assert.equal(report.noResolvedSkills.length, 1);
assert.equal(report.missingDescriptions.length, 0, "Task descriptions are valid evidence when activity descriptions are absent");
assert.deepEqual(report.noYearRecords, ["Year 9"]);
assert.deepEqual(report.missingFrameworks, ["Numeracy", "DCF"]);
assert.equal(report.lastUpdated, "2026-10-01");
const filtered = buildInspectionSummary({ ...base, year: "Year 7", term: "Autumn" });
assert.equal(filtered.entries.length, 1);
assert.equal(filtered.frameworkSummary[0].covered, 1);
assert.equal(filtered.unmapped.length, 2);
assert.equal(filtered.years.length, 1);
const unavailable = buildInspectionSummary({ ...base, frameworks: [] });
assert.equal(unavailable.coverage.length, 0);
assert.equal(unavailable.unmapped.length, 0, "Unavailable definitions are not reported as zero coverage");
assert.equal(unavailable.missingFrameworks.length, 3);
const foreignDefinitions = buildInspectionSummary({ ...base, frameworks: [{ ...framework, schoolId: "school-b" }], themes: [{ id: "other", schoolId: "school-b", active: true, name: "Other school" }] });
assert.equal(foreignDefinitions.coverage.length, 0);
assert.equal(foreignDefinitions.themeCoverage.length, 0);
const empty = buildInspectionSummary({ ...base, mappings: [] });
assert.equal(empty.entries.length, 0);
assert.ok(empty.nextSteps[0].includes("Confirm which year groups"));
assert.equal(empty.most.length, 0);
for (const department of inspectionDepartments) {
  const result = buildInspectionSummary({ ...base, department, subjects: [], mappings: [{ ...mapping, subjectId: undefined, subject: ` ${department.aliases.at(-1).toUpperCase()} ` }] });
  assert.equal(result.entries.length, 1, `${department.name} resolves supported names without case or spacing sensitivity`);
}
const chemistry = buildInspectionSummary({ ...base, department: inspectionDepartments[2], subjects: [], mappings: [{ ...mapping, subjectId: undefined, subject: "Science" }] });
assert.equal(chemistry.entries.length, 0, "Do not silently count generic Science as Chemistry");
const mismatch = buildInspectionSummary({ ...base, subjects: [subject, { ...subject, id: "history", name: "History" }], mappings: [{ ...mapping, subjectId: "history" }] });
assert.equal(mismatch.entries.length, 0, "A recognised subject ID takes precedence over a stale subject label");
console.log("Passed: all six departments, distinct task/element counts, most/least/gaps, year and term filters, post-16 years, school isolation, subject identity, unavailable definitions, empty records and task-description fallback.");
