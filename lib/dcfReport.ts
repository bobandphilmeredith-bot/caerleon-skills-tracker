import {
  frameworkMatches,
  matchingFrameworkReferences,
} from "@/lib/mappingFrameworks";
import {
  progressionLabel,
  reportCsv,
  type ProvisionFilters,
} from "@/lib/provision";
import {
  compareTerms,
  compareYear,
  formatMappingDescription,
  formatMappingTitle,
  normalisePlanningTerm,
  normaliseYear,
  unique,
} from "@/lib/reporting";
import type {
  FrameworkDefinition,
  MappingEntry,
  MappingFrameworkReference,
} from "@/lib/types";

export const dcfSteps = [
  "Step 1",
  "Step 2",
  "Step 3",
  "Step 4",
  "Step 5",
  "Bridging 3–4",
  "Bridging 4–5",
  "Other bridging",
  "Unspecified",
];
export const dcfGuidance = {
  curriculum:
    "https://estyn.gov.wales/app/uploads/2025/07/Supplementary-guidance-on-inspecting-curriculum-in-maintained-schools-and-PRUs.pdf",
  dcf: "https://estyn.gov.wales/improvement-resources/preparing-for-the-digital-competence-framework-dcf/",
};
export type DcfInput = {
  schoolId: string;
  schoolName: string;
  mappings: MappingEntry[];
  frameworks: FrameworkDefinition[];
  subjects: string[];
  yearGroups: string[];
  terms: string[];
  filters: ProvisionFilters;
  generatedAt: string;
  demo?: boolean;
};
export type DcfActivity = {
  mapping: MappingEntry;
  references: MappingFrameworkReference[];
  evidenceId: string;
};
export type DcfAction = {
  id: string;
  priority: "First" | "Next" | "Discuss";
  finding: string;
  action: string;
  check: string;
};
const normalise = (value: string) => value.trim().toLowerCase();
const standardTerms = ["Autumn", "Spring", "Summer"];
export function dcfProgression(ref: MappingFrameworkReference) {
  const label = progressionLabel(ref);
  if (label !== "Bridging") return label;
  const bridge = (ref.progressionReference ?? "")
    .replace(/\s/g, "")
    .replace(/-/g, "–");
  return bridge === "Step3–4"
    ? "Bridging 3–4"
    : bridge === "Step4–5"
      ? "Bridging 4–5"
      : "Other bridging";
}
export function buildDcfReport(input: DcfInput) {
  const schoolMappings = input.mappings.filter(
    (item) => !item.schoolId || item.schoolId === input.schoolId,
  );
  const allMappings = Array.from(
    new Map(
      schoolMappings.map((mapping) => [
        mapping.id,
        {
          ...mapping,
          year: normaliseYear(mapping.year),
          term: normalisePlanningTerm(mapping.term),
        },
      ]),
    ).values(),
  );
  const frameworks = input.frameworks.filter(
    (item) =>
      (!item.schoolId || item.schoolId === input.schoolId) &&
      frameworkMatches(item.shortName || item.name, "DCF"),
  );
  const catalog = frameworks.flatMap((framework, fi) =>
    framework.strands.flatMap((strand, si) =>
      strand.elements.map((element, ei) => ({
        key: `${fi}:${si}:${ei}`,
        strandKey: `${fi}:${si}`,
        code: `${si + 1}.${ei + 1}`,
        framework,
        strand,
        element,
      })),
    ),
  );
  const resolve = (ref: MappingFrameworkReference) =>
    catalog.find(
      (item) =>
        (ref.frameworkId && item.framework.id
          ? ref.frameworkId === item.framework.id
          : frameworkMatches(
              ref.frameworkShortName || ref.framework,
              item.framework.shortName || item.framework.name,
            )) &&
        (ref.strandId && item.strand.id
          ? ref.strandId === item.strand.id
          : normalise(ref.strand) === normalise(item.strand.name)) &&
        (ref.elementId && item.element.id
          ? ref.elementId === item.element.id
          : normalise(ref.element) === normalise(item.element.name)),
    );
  const allDcf = allMappings
    .map((mapping) => ({
      mapping,
      references: matchingFrameworkReferences(mapping).filter((ref) =>
        frameworkMatches(ref.frameworkShortName || ref.framework, "DCF"),
      ),
    }))
    .filter((item) => item.references.length)
    .sort(
      (a, b) =>
        a.mapping.subject.localeCompare(b.mapping.subject) ||
        compareYear(a.mapping.year, b.mapping.year) ||
        compareTerms(a.mapping.term, b.mapping.term) ||
        formatMappingTitle(a.mapping).localeCompare(
          formatMappingTitle(b.mapping),
        ) ||
        a.mapping.id.localeCompare(b.mapping.id),
    )
    .map((item, index) => ({
      ...item,
      evidenceId: `D${String(index + 1).padStart(3, "0")}`,
    }));
  const { subject, year, term } = input.filters;
  const entries = allDcf.filter(
    ({ mapping }) =>
      (!subject || mapping.subject === subject) &&
      (!year || mapping.year === year) &&
      (!term || mapping.term === term),
  );
  const subjects = subject
    ? [subject]
    : unique([
        ...input.subjects,
        ...allMappings.map((item) => item.subject),
      ]).sort();
  const years = year
    ? [year]
    : unique([
        ...input.yearGroups.map(normaliseYear),
        ...allMappings.map((item) => item.year),
      ]).sort(compareYear);
  const terms = term
    ? [term]
    : unique([
        ...standardTerms,
        ...input.terms.map(normalisePlanningTerm),
        ...allMappings.map((item) => item.term),
      ]).sort(compareTerms);
  const coverage = catalog.map((item) => {
    const activities = entries.filter((entry) =>
      entry.references.some((ref) => resolve(ref)?.key === item.key),
    );
    const revisitYears = years.filter(
      (year) =>
        unique(
          activities
            .filter((entry) => entry.mapping.year === year)
            .map((entry) => entry.mapping.term)
            .filter((term) => standardTerms.includes(term)),
        ).length >= 2,
    );
    return {
      ...item,
      entries: activities,
      subjects: unique(activities.map((entry) => entry.mapping.subject)),
      years: years.map((year) => ({
        year,
        entries: activities.filter((entry) => entry.mapping.year === year),
      })),
      terms: unique(activities.map((entry) => entry.mapping.term)).sort(
        compareTerms,
      ),
      revisitYears,
      steps: unique(
        activities.flatMap((entry) =>
          entry.references
            .filter((ref) => resolve(ref)?.key === item.key)
            .map(dcfProgression),
        ),
      ),
    };
  });
  const strands = frameworks.flatMap((framework, fi) =>
    framework.strands.map((strand, si) => {
      const key = `${fi}:${si}`;
      const elements = coverage.filter((item) => item.strandKey === key);
      const activities = entries.filter((entry) =>
        elements.some((element) => element.entries.includes(entry)),
      );
      return {
        key,
        name: strand.name,
        elements,
        entries: activities,
        covered: elements.filter((item) => item.entries.length).length,
        subjects: unique(activities.map((entry) => entry.mapping.subject)),
      };
    }),
  );
  const subjectRows = subjects.map((subject) => {
    const activities = entries.filter(
      (entry) => entry.mapping.subject === subject,
    );
    return {
      subject,
      entries: activities,
      elements: coverage.filter((item) => item.subjects.includes(subject))
        .length,
      strands: strands.map((strand) => ({
        name: strand.name,
        entries: strand.entries.filter(
          (entry) => entry.mapping.subject === subject,
        ),
      })),
      years: unique(activities.map((entry) => entry.mapping.year)).sort(
        compareYear,
      ),
    };
  });
  const timing = years.map((year) => ({
    year,
    entries: entries.filter((entry) => entry.mapping.year === year),
    terms: terms.map((term) => ({
      term,
      entries: entries.filter(
        (entry) => entry.mapping.year === year && entry.mapping.term === term,
      ),
    })),
  }));
  const progression = dcfSteps.map((step) => ({
    step,
    entries: entries.filter((entry) =>
      entry.references.some((ref) => dcfProgression(ref) === step),
    ),
    years: years.map((year) => ({
      year,
      entries: entries.filter(
        (entry) =>
          entry.mapping.year === year &&
          entry.references.some((ref) => dcfProgression(ref) === step),
      ),
    })),
  }));
  const quality = [
    {
      label: "Unresolved DCF links",
      entries: entries.filter((entry) =>
        entry.references.some((ref) => !resolve(ref)),
      ),
      remedy:
        "Reconcile these links with the school's current framework catalogue. Unresolved links do not count towards element or strand coverage.",
    },
    {
      label: "No activity description",
      entries: entries.filter(
        (entry) => !formatMappingDescription(entry.mapping).trim(),
      ),
      remedy:
        "Describe the task and what pupils are expected to do with their digital skills.",
    },
    {
      label: "Unspecified progression",
      entries: entries.filter((entry) =>
        entry.references.some((ref) => dcfProgression(ref) === "Unspecified"),
      ),
      remedy:
        "Confirm the intended progression reference and the level of independence expected.",
    },
    {
      label: "Incomplete timing",
      entries: entries.filter(
        (entry) =>
          !/^Year \d+$/.test(entry.mapping.year) || !entry.mapping.term.trim(),
      ),
      remedy:
        "Confirm year group and term so the opportunity can be placed in the curriculum sequence.",
    },
    {
      label: "No scheme reference",
      entries: entries.filter((entry) => !entry.mapping.schemeReference.trim()),
      remedy:
        "Add a scheme reference to make the planned activity easier to locate during review.",
    },
    {
      label: "Missing or invalid update date",
      entries: entries.filter(
        (entry) =>
          !entry.mapping.lastMappedDate ||
          Number.isNaN(Date.parse(entry.mapping.lastMappedDate)),
      ),
      remedy:
        "Confirm when the record was updated. An update date is not evidence of curriculum review.",
    },
  ];
  const missing = coverage.filter((item) => !item.entries.length);
  const singleSubject = coverage.filter((item) => item.subjects.length === 1);
  const revisited = coverage.filter((item) => item.revisitYears.length);
  const contributing = subjectRows.filter((item) => item.entries.length);
  const latest =
    entries
      .map((item) => item.mapping.lastMappedDate)
      .filter((value) => value && !Number.isNaN(Date.parse(value)))
      .sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? "";
  const actions: DcfAction[] = [];
  const add = (
    id: string,
    priority: DcfAction["priority"],
    finding: string,
    action: string,
    check: string,
  ) => actions.push({ id, priority, finding, action, check });
  if (!catalog.length)
    add(
      "catalog",
      "First",
      "DCF element definitions are unavailable.",
      "Ask the school administrator to restore the DCF catalogue before interpreting coverage.",
      "The configured strands and elements can be reconciled with the school's chosen framework version.",
    );
  if (!entries.length)
    add(
      "records",
      "First",
      "No DCF activities are recorded in this selection.",
      "Confirm the selection, check schemes with subject leaders and record applicable opportunities.",
      "An agreed list of taught subjects, year groups and relevant plans is available.",
    );
  quality
    .filter((item) => item.entries.length)
    .forEach((item, index) =>
      add(
        `quality-${index}`,
        "First",
        `${item.entries.length} activities: ${item.label.toLowerCase()}.`,
        item.remedy,
        `Recheck ${item.entries
          .slice(0, 8)
          .map((entry) => entry.evidenceId)
          .join(
            ", ",
          )}${item.entries.length > 8 ? " and the remaining flagged records" : ""}.`,
      ),
    );
  if (missing.length)
    add(
      "gaps",
      "Next",
      `${missing.length} of ${coverage.length} configured elements have no recorded opportunity.`,
      "Review the element register with subject leaders. Distinguish missing records from missing planned opportunities and agree where each relevant skill will be developed.",
      "Each identified gap has a verified plan or an explained curriculum decision.",
    );
  if (singleSubject.length && !subject)
    add(
      "reliance",
      "Discuss",
      `${singleSubject.length} elements are mapped in only one subject.`,
      "Review opportunities to apply the skill in another subject where this is purposeful. For option subjects, check which pupils can access the opportunity.",
      "Leaders can explain how pupils encounter and transfer the skill; more links alone are not a success measure.",
    );
  if (entries.length) {
    add(
      "sequence",
      "Discuss",
      `${revisited.length} elements recur in two or more standard terms within the same year group${term ? " in this term-filtered selection" : ""}.`,
      term
        ? "Select all terms to inspect planned recurrence, then compare task demand and independence."
        : "Choose a sequence from the element register and compare what pupils are expected to do earlier and later. Confirm both plans belong to the same planning cycle.",
      "Teachers can explain increasing challenge, independence and transfer. Recurrence alone does not demonstrate progression.",
    );
    add(
      "impact",
      "Next",
      "The mapping records intended provision; delivery and pupil progress are not recorded here.",
      "Use the evidence register to select pupil work and discuss learning with pupils and teachers, including learners needing additional support.",
      "Record what was delivered, what pupils can do independently and the consequent curriculum decision in the school's review process.",
    );
  }
  const summary = !entries.length
    ? "There are no recorded DCF opportunities in this selection. Confirm the scope and completeness of the records before evaluating provision."
    : !coverage.length
      ? `${entries.length} distinct DCF activities are recorded, but the element catalogue is unavailable. Coverage cannot be calculated until the definitions are restored.`
      : `${coverage.length - missing.length} of ${coverage.length} configured DCF elements are represented in ${entries.length} distinct planned activities across ${contributing.length} subjects. ${missing.length ? `${missing.length} elements have no recorded opportunity and need checking against schemes of learning.` : "Every configured element has at least one recorded opportunity; this does not establish sufficient depth or entitlement for every pupil."}`;
  return {
    ...input,
    entries,
    coverage,
    strands,
    subjectRows,
    years,
    terms,
    timing,
    progression,
    quality,
    missing,
    singleSubject,
    revisited,
    contributing,
    latest,
    actions,
    summary,
  };
}
export type DcfReport = ReturnType<typeof buildDcfReport>;
export function dcfScope(report: DcfReport) {
  return [
    report.filters.subject || "All subjects",
    report.filters.year || "All year groups",
    report.filters.term || "All terms",
  ].join(" · ");
}
export function dcfEvidenceCsv(report: DcfReport) {
  return reportCsv([
    [
      "School",
      "Scope",
      "Snapshot generated (UTC)",
      "Evidence ref",
      "Mapping ID",
      "Subject",
      "Year",
      "Term",
      "Activity",
      "Description",
      "Task detail",
      "Scheme reference",
      "DCF references",
      "Last record update",
      "Interpretation",
    ],
    ...report.entries.map((entry) => [
      report.schoolName,
      dcfScope(report),
      report.generatedAt,
      entry.evidenceId,
      entry.mapping.id,
      entry.mapping.subject,
      entry.mapping.year,
      entry.mapping.term,
      formatMappingTitle(entry.mapping),
      formatMappingDescription(entry.mapping),
      entry.mapping.taskDescription || "",
      entry.mapping.schemeReference,
      unique(
        entry.references.map((ref) =>
          [
            ref.strand,
            ref.element,
            dcfProgression(ref),
            ref.descriptor || "",
            ref.notes || "",
          ]
            .filter(Boolean)
            .join(" → "),
        ),
      ).join("\n"),
      entry.mapping.lastMappedDate,
      "Planned provision only; academic year not recorded",
    ]),
  ]);
}
