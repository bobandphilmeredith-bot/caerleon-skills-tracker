import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(
      specifier.startsWith("@/")
        ? pathToFileURL(path.resolve(specifier.slice(2) + ".ts")).href
        : specifier,
      context,
    );
  },
});
const { buildDcfReport, dcfEvidenceCsv, dcfProgression } =
  await import("../lib/dcfReport.ts");
const framework = {
  schoolId: "a",
  id: "dcf",
  name: "Digital Competence Framework",
  shortName: "DCF",
  strands: [
    {
      id: "s",
      name: "Producing",
      elements: [
        { id: "e", name: "Creating" },
        { id: "e2", name: "Evaluating" },
      ],
    },
    {
      id: "s2",
      name: "Citizenship",
      elements: [{ id: "e3", name: "Digital rights" }],
    },
  ],
};
const ref = {
  frameworkId: "dcf",
  framework: framework.name,
  strandId: "s",
  strand: "Producing",
  elementId: "e",
  element: "Creating",
  progressionStep: 3,
  progressionReference: "Step 3",
};
const activity = {
  schoolId: "a",
  id: "1",
  subject: "English",
  year: "Y7",
  term: "autumn",
  unit: "Podcast",
  activityDescription: "Create a podcast",
  schemeReference: "EN1",
  lastMappedDate: "2026-09-01",
  frameworkReferences: [ref, ref],
};
const input = {
  schoolId: "a",
  schoolName: "Test school",
  subjects: ["English", "ICT", "History"],
  yearGroups: ["Year 7", "Year 8"],
  terms: ["Autumn", "Spring", "Summer"],
  frameworks: [framework],
  mappings: [
    activity,
    activity,
    {
      ...activity,
      id: "2",
      term: "Spring",
      frameworkReferences: [
        { ...ref, progressionReference: "Step 3–4" },
        { ...ref, elementId: "e2", element: "Evaluating" },
      ],
    },
    { ...activity, id: "3", subject: "ICT", year: "Year 8", term: "Summer" },
    {
      ...activity,
      id: "4",
      frameworkReferences: [
        { ...ref, frameworkId: "literacy", framework: "Literacy Framework" },
      ],
    },
    {
      ...activity,
      id: "5",
      term: "",
      activityDescription: "",
      lastMappedDate: "invalid",
      frameworkReferences: [
        {
          ...ref,
          elementId: "old",
          progressionStep: null,
          progressionReference: "Not specified",
        },
      ],
    },
    { ...activity, schoolId: "other", unit: "MUST NOT APPEAR", id: "1" },
  ],
  filters: { subject: "", year: "", term: "" },
  generatedAt: "2026-11-02T12:00:00Z",
};
const r = buildDcfReport(input);
assert.equal(
  r.entries.length,
  4,
  "Distinct DCF activities only; exclude other schools before deduplication",
);
assert.equal(
  r.coverage[0].entries.length,
  3,
  "Duplicate references must not inflate activity counts",
);
assert.equal(
  r.strands[0].entries.length,
  3,
  "Overlapping elements count once per strand",
);
assert.equal(r.coverage[0].subjects.length, 2);
assert.equal(r.missing.length, 1);
assert.equal(r.singleSubject.length, 1);
assert.equal(
  r.revisited.length,
  1,
  "Same year and two standard terms are needed for recurrence",
);
assert.deepEqual(r.revisited[0].revisitYears, ["Year 7"]);
assert.equal(r.contributing.length, 2);
assert.equal(
  r.subjectRows.find((item) => item.subject === "History").entries.length,
  0,
);
assert.equal(
  r.quality[0].entries.length,
  1,
  "Unresolved links are retained but do not establish coverage",
);
assert.equal(
  r.latest,
  "2026-09-01",
  "Invalid dates must not become latest update",
);
assert.equal(
  r.progression.find((item) => item.step === "Bridging 3–4").entries.length,
  1,
);
assert.equal(
  dcfProgression({ ...ref, progressionReference: "Step 4–5" }),
  "Bridging 4–5",
);
assert.equal(
  r.progression.find((item) => item.step === "Unspecified").entries.length,
  1,
);
assert.ok(!dcfEvidenceCsv(r).includes("MUST NOT APPEAR"));
const filtered = buildDcfReport({
  ...input,
  filters: { subject: "English", year: "Year 7", term: "Autumn" },
});
assert.equal(filtered.entries.length, 1);
assert.equal(filtered.coverage[0].entries.length, 1);
assert.equal(filtered.subjectRows.length, 1);
assert.equal(filtered.timing[0].terms[0].entries.length, 1);
assert.equal(filtered.revisited.length, 0);
assert.equal(
  filtered.entries[0].evidenceId,
  r.entries.find((item) => item.mapping.id === "1").evidenceId,
  "Evidence IDs stay stable under filtering",
);
assert.ok(
  filtered.actions
    .find((item) => item.id === "sequence")
    .action.includes("Select all terms"),
);
assert.ok(
  !filtered.actions.some((item) => item.id === "reliance"),
  "Single-subject scope must not imply whole-school dependence",
);
const separated = buildDcfReport({
  ...input,
  mappings: [
    activity,
    { ...activity, id: "6", year: "Year 8", term: "Spring" },
  ],
});
assert.equal(
  separated.revisited.length,
  0,
  "Different year groups must not create apparent within-year recurrence",
);
const absent = buildDcfReport({ ...input, frameworks: [] });
assert.equal(absent.coverage.length, 0);
assert.match(absent.summary, /cannot be calculated/);
const empty = buildDcfReport({ ...input, mappings: [] });
assert.equal(empty.entries.length, 0);
assert.equal(empty.subjectRows.length, 3);
assert.equal(empty.missing.length, 3);
assert.match(empty.summary, /no recorded/i);
const crossSchool = buildDcfReport({
  ...input,
  frameworks: [{ ...framework, schoolId: "other" }],
});
assert.equal(crossSchool.coverage.length, 0);
const mismatchedFramework = buildDcfReport({
  ...input,
  mappings: [
    {
      ...activity,
      frameworkReferences: [{ ...ref, frameworkId: "other-dcf" }],
    },
  ],
});
assert.equal(
  mismatchedFramework.coverage[0].entries.length,
  0,
  "Explicit nonmatching IDs must not silently match by name",
);
const fallback = buildDcfReport({
  ...input,
  mappings: [
    {
      ...activity,
      frameworkReferences: [
        { ...ref, frameworkId: "", strandId: "", elementId: "" },
      ],
    },
  ],
});
assert.equal(
  fallback.coverage[0].entries.length,
  1,
  "Legacy references can resolve by names when IDs are absent",
);
const csv = dcfEvidenceCsv(
  buildDcfReport({
    ...input,
    mappings: [
      {
        ...activity,
        unit: '=CMD("x")',
        activityDescription: 'Text, with "quotes"\nand a new line',
      },
    ],
  }),
);
assert.ok(csv.includes("'=CMD"));
assert.ok(csv.includes('""quotes""'));
console.log(
  "Passed DCF report: school isolation, filters, counts, ID resolution, zero records, missing catalogue, true within-year recurrence, bridging progression, evidence stability and CSV safety.",
);
