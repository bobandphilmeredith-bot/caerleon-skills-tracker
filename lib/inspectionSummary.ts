import { buildProvisionReport, progressionLabel } from "@/lib/provision";
import { frameworkMatches } from "@/lib/mappingFrameworks";
import { compareTerms, compareYear, formatMappingDescription, formatMappingTitle, unique } from "@/lib/reporting";
import type { CrossCuttingTheme, FrameworkDefinition, MappingEntry, SubjectConfig } from "@/lib/types";

export const inspectionDepartments = [
  { slug: "art", name: "Art", aliases: ["Art", "Art and Design", "Art & Design"] },
  { slug: "history", name: "History", aliases: ["History"] },
  { slug: "chemistry", name: "Chemistry", aliases: ["Chemistry"] },
  { slug: "business", name: "Business", aliases: ["Business", "Business Studies"] },
  { slug: "ict", name: "ICT", aliases: ["ICT", "Information and Communication Technology", "Information Communication Technology"] },
  { slug: "english", name: "English", aliases: ["English", "English Language", "English Literature", "English Language and Literature"] }
] as const;
export type InspectionDepartment = (typeof inspectionDepartments)[number];
export const inspectionFrameworks = ["Literacy", "Numeracy", "DCF"] as const;
const normaliseSubject = (value: string) => value.trim().toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
const normaliseYear = (value: string) => {
  const match = value.trim().match(/^(?:year\s*|y\s*)?(\d{1,2})$/i);
  return match ? `Year ${Number(match[1])}` : value.trim();
};

export type InspectionInput = {
  schoolId: string;
  department: InspectionDepartment;
  mappings: MappingEntry[];
  subjects: SubjectConfig[];
  frameworks: FrameworkDefinition[];
  themes: CrossCuttingTheme[];
  yearGroups: string[];
  year?: string;
  term?: string;
};

export function buildInspectionSummary(input: InspectionInput) {
  const inSchool = (item: { schoolId?: string | null }) => !item.schoolId || item.schoolId === input.schoolId;
  const aliases = new Set(input.department.aliases.map(normaliseSubject));
  const subjects = input.subjects.filter(inSchool).filter((subject) => aliases.has(normaliseSubject(subject.name)));
  const subjectIds = new Set(subjects.map((subject) => subject.id));
  const mappings = input.mappings.filter(inSchool).filter((mapping) =>
    mapping.subjectId ? subjectIds.has(mapping.subjectId) || (!input.subjects.some((subject) => inSchool(subject) && subject.id === mapping.subjectId) && aliases.has(normaliseSubject(mapping.subject)))
      : aliases.has(normaliseSubject(mapping.subject))
  ).map((mapping) => ({ ...mapping, year: normaliseYear(mapping.year) }));
  const frameworks = input.frameworks.filter(inSchool).filter((framework) => inspectionFrameworks.some((name) => frameworkMatches(framework.shortName || framework.name, name)));
  const report = buildProvisionReport(mappings, subjects.map((subject) => subject.name), frameworks, input.themes.filter(inSchool), { subject: "", year: input.year ?? "", term: input.term ?? "" });
  const entries = [...report.entries].sort((a, b) => compareYear(a.mapping.year, b.mapping.year) || compareTerms(a.mapping.term, b.mapping.term) || formatMappingTitle(a.mapping).localeCompare(formatMappingTitle(b.mapping)) || a.mapping.id.localeCompare(b.mapping.id));
  const yearOptions = unique([...input.yearGroups.map(normaliseYear), ...mappings.map((mapping) => mapping.year)]).sort(compareYear);
  const frameworkSummary = inspectionFrameworks.map((name) => {
    const elements = report.coverage.filter((item) => frameworkMatches(item.framework, name));
    return { name, total: elements.length, covered: elements.filter((item) => item.entries.length).length,
      tasks: new Set(elements.flatMap((item) => item.entries.map((entry) => entry.mapping.id))).size };
  });
  const years = (input.year ? [input.year] : yearOptions).map((year) => {
    const tasks = entries.filter((entry) => entry.mapping.year === year);
    return { year, entries: tasks, terms: unique(tasks.map((entry) => entry.mapping.term)).sort(compareTerms),
      frameworks: frameworkSummary.map((framework) => ({ ...framework, covered: report.coverage.filter((item) => frameworkMatches(item.framework, framework.name) && item.entries.some((entry) => entry.mapping.year === year)).length })) };
  });
  const covered = report.coverage.filter((item) => item.entries.length);
  const byName = (a: (typeof covered)[number], b: (typeof covered)[number]) => a.framework.localeCompare(b.framework) || a.element.localeCompare(b.element);
  const single = covered.filter((item) => item.entries.length === 1);
  const knownIds = new Set(covered.flatMap((item) => item.entries.map((entry) => entry.mapping.id)));
  const noResolvedSkills = entries.filter((entry) => !knownIds.has(entry.mapping.id));
  const missingDescriptions = entries.filter((entry) => !formatMappingDescription(entry.mapping).trim());
  const noYearRecords = years.filter((year) => !year.entries.length).map((year) => year.year);
  const missingFrameworks = frameworkSummary.filter((framework) => !framework.total).map((framework) => framework.name);
  const dates = entries.map((entry) => entry.mapping.lastMappedDate).filter((date) => date && !Number.isNaN(Date.parse(date))).sort((a, b) => Date.parse(b) - Date.parse(a));
  const nextSteps: string[] = [];
  if (!entries.length) nextSteps.push("Confirm which year groups this department teaches and add its plans before judging coverage.");
  if (missingFrameworks.length) nextSteps.push(`Load the ${missingFrameworks.join(", ")} definitions before evaluating their coverage.`);
  if (noYearRecords.length && entries.length) nextSteps.push(`Confirm whether ${noYearRecords.join(", ")} ${noYearRecords.length === 1 ? "is" : "are"} taught by this department; enter any missing plans.`);
  if (report.unmapped.length && entries.length) nextSteps.push(`Review the ${report.unmapped.length} unrecorded skill elements and agree which are relevant to this department’s contribution.`);
  if (single.length) nextSteps.push(`${single.length} skill ${single.length === 1 ? "element relies" : "elements rely"} on one task. Check where pupils practise these again with greater independence.`);
  if (missingDescriptions.length || report.missingTiming.length) nextSteps.push(`Complete task details: ${missingDescriptions.length} without descriptions; ${report.missingTiming.length} without a clear year group or term.`);
  if (noResolvedSkills.length) nextSteps.push(`Check ${noResolvedSkills.length} tasks without a link to a current Literacy, Numeracy or DCF element; theme-only tasks may be intentional.`);
  if (entries.length) nextSteps.push("Use the tasks below to select pupil work and discuss how planned skills were taught and applied independently.");
  return { ...report, entries, frameworkSummary, years, yearOptions, missingFrameworks, noYearRecords, noResolvedSkills, missingDescriptions, nextSteps,
    coveredCount: covered.length, singleCount: single.length,
    most: [...covered].sort((a, b) => b.entries.length - a.entries.length || byName(a, b)),
    least: [...covered].sort((a, b) => a.entries.length - b.entries.length || byName(a, b)),
    lastUpdated: dates[0] ?? "",
    sourceSubjects: unique([...subjects.map((subject) => subject.name), ...mappings.map((mapping) => mapping.subject)]),
    steps: unique(entries.flatMap((entry) => entry.frameworkRefs.map(progressionLabel))).sort()
  };
}

export type InspectionSummary = ReturnType<typeof buildInspectionSummary>;
