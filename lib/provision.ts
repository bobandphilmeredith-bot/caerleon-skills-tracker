import { buildReportData, compareTerms, compareYear, formatMappingDescription, normaliseYear, normalisePlanningTerm, unique, type MappingEvidence } from "@/lib/reporting";
import { frameworkMatches } from "@/lib/mappingFrameworks";
import type { CrossCuttingTheme, FrameworkDefinition, MappingEntry } from "@/lib/types";

export type ProvisionFilters = { subject: string; year: string; term: string };
export type CoverageItem = {
  key: string; framework: string; strand: string; code: string; element: string;
  entries: MappingEvidence[]; subjects: string[]; terms: string[]; years: string[];
};
const label = (value: string) => value.trim().toLowerCase();
export function buildProvisionReport(mappings: MappingEntry[], subjects: string[], frameworks: FrameworkDefinition[], themes: CrossCuttingTheme[], filters: ProvisionFilters) {
  const normalised = Array.from(new Map(mappings.map((mapping) => [mapping.id, { ...mapping, year: normaliseYear(mapping.year), term: normalisePlanningTerm(mapping.term) }])).values());
  const all = buildReportData(normalised, themes).entries;
  const entries = all.filter(({ mapping }) => (!filters.subject || mapping.subject === filters.subject) && (!filters.year || mapping.year === filters.year) && (!filters.term || mapping.term === filters.term));
  const scopedSubjects = filters.subject ? [filters.subject] : unique([...subjects, ...all.map(({ mapping }) => mapping.subject)]).sort();
  const years = filters.year ? [filters.year] : unique(["Year 7", "Year 8", "Year 9", "Year 10", "Year 11", ...all.map(({ mapping }) => mapping.year)]).sort(compareYear);
  const terms = filters.term ? [filters.term] : unique(["Autumn", "Spring", "Summer", ...all.map(({ mapping }) => mapping.term).filter(Boolean)]).sort(compareTerms);
  const coverage: CoverageItem[] = frameworks.flatMap((framework) => framework.strands.flatMap((strand, si) => strand.elements.map((element, ei) => {
    const evidence = entries.filter((entry) => entry.frameworkRefs.some((ref) =>
      frameworkMatches(ref.frameworkShortName ?? ref.framework, framework.shortName || framework.name) &&
      (strand.id && ref.strandId ? strand.id === ref.strandId : label(strand.name) === label(ref.strand)) &&
      (element.id && ref.elementId ? element.id === ref.elementId : label(element.name) === label(ref.element))));
    return { key: `${framework.name}::${strand.name}::${element.name}`, framework: framework.shortName || framework.name, strand: strand.shortName || strand.name, code: `${si + 1}.${ei + 1}`, element: element.name,
      entries: evidence, subjects: unique(evidence.map(({ mapping }) => mapping.subject)), terms: unique(evidence.map(({ mapping }) => mapping.term)).sort(compareTerms), years: unique(evidence.map(({ mapping }) => mapping.year)).sort(compareYear) };
  })));
  const themeCoverage = themes.filter((theme) => theme.active).map((theme) => {
    const evidence = entries.filter((entry) => entry.themeItems.some((item) => item.themeId === theme.id || item.theme === theme.name));
    const elements = (theme.elements ?? []).filter((element) => element.active).map((element) => ({
      name: element.name,
      entries: evidence.filter((entry) => entry.themeItems.some((item) => (item.themeId === theme.id || item.theme === theme.name) && (item.elementId === element.id || item.element === element.name)))
    }));
    return { theme, entries: evidence, elements, subjects: unique(evidence.map(({ mapping }) => mapping.subject)) };
  });
  const subjectRows = scopedSubjects.map((subject) => {
    const evidence = entries.filter(({ mapping }) => mapping.subject === subject);
    return { subject, entries: evidence, terms: terms.map((term) => ({ term, entries: evidence.filter(({ mapping }) => mapping.term === term) })),
      elements: coverage.filter((item) => item.entries.some(({ mapping }) => mapping.subject === subject)).length,
      lastUpdated: evidence.map(({ mapping }) => mapping.lastMappedDate).filter(Boolean).sort().at(-1) ?? "Not recorded" };
  });
  const missingDescription = entries.filter(({ mapping }) => !formatMappingDescription(mapping).trim());
  const missingReferences = entries.filter((entry) => !entry.frameworkRefs.length && !entry.themeItems.length);
  const missingTiming = entries.filter(({ mapping }) => !mapping.term.trim() || !/^Year \d+$/.test(mapping.year));
  return { entries, coverage, themeCoverage, subjectRows, years, terms, missingDescription, missingReferences, missingTiming,
    noEvidence: subjectRows.filter((row) => !row.entries.length),
    unmapped: coverage.filter((item) => !item.entries.length),
    oneSubject: coverage.filter((item) => item.subjects.length === 1),
    lastUpdated: entries.map(({ mapping }) => mapping.lastMappedDate).filter(Boolean).sort().at(-1) ?? "Not recorded" };
}

export function progressionLabel(reference: MappingEvidence["frameworkRefs"][number]) {
  const value = reference.progressionReference ?? "";
  if (/Step [1-5]\s*[-\u2013]\s*[1-5]/.test(value)) return "Bridging";
  const step = reference.progressionStep ?? Number(value.match(/^Step ([1-5])$/)?.[1]);
  return step >= 1 && step <= 5 ? `Step ${step}` : "Unspecified";
}

export function reportCsv(rows: (string | number)[][]) {
  return "\uFEFF" + rows.map((row) => row.map((cell) => {
    const value = String(cell);
    return `"${(/^[\s]*[=+@-]/.test(value) ? "'" + value : value).replace(/"/g, '""')}"`;
  }).join(",")).join("\r\n");
}
