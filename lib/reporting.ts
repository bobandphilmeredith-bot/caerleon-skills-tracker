import { frameworkMatches, frameworkReferenceText, frameworkShortLabel, matchingFrameworkReferences } from "@/lib/mappingFrameworks";
import type { CrossCuttingTheme, MappingEntry, MappingFrameworkReference } from "@/lib/types";

export const reportYearGroups = ["Year 7", "Year 8", "Year 9", "Year 10", "Year 11"];
export const reportSteps = [3, 4, 5];
export const reportFrameworks = ["Literacy", "Numeracy", "DCF"] as const;
export type ReportFramework = (typeof reportFrameworks)[number];

export type ThemeEvidenceItem = {
  themeId?: string;
  elementId?: string;
  theme: string;
  element: string | null;
  label: string;
  legacy: boolean;
};

export type MappingEvidence = {
  mapping: MappingEntry;
  frameworkRefs: MappingFrameworkReference[];
  themeItems: ThemeEvidenceItem[];
};

export type ReportData = {
  entries: MappingEvidence[];
  subjectEntries: Record<string, MappingEvidence[]>;
  themeDefinitions: CrossCuttingTheme[];
};

export function buildReportData(mappings: MappingEntry[], themes: CrossCuttingTheme[]): ReportData {
  const entries = mappings.map((mapping) => ({
    mapping,
    frameworkRefs: matchingFrameworkReferences(mapping),
    themeItems: themeItemsForEntry(mapping, themes)
  }));
  return {
    entries,
    subjectEntries: groupBy(entries, (entry) => entry.mapping.subject || "Unknown subject"),
    themeDefinitions: themes
  };
}

export function frameworkCount(entry: MappingEvidence, framework: ReportFramework) {
  return entry.frameworkRefs.filter((reference) => frameworkMatches(reference.frameworkShortName ?? reference.framework, framework)).length;
}

export function frameworkCounts(entry: MappingEvidence) {
  return Object.fromEntries(reportFrameworks.map((framework) => [framework, frameworkCount(entry, framework)])) as Record<ReportFramework, number>;
}

export function themeElementCount(entry: MappingEvidence) {
  return entry.themeItems.filter((item) => item.elementId || item.element).length;
}

export function summariseFrameworkCounts(entry: MappingEvidence) {
  const counts = frameworkCounts(entry);
  return reportFrameworks.map((framework) => ({ framework, count: counts[framework] })).filter((item) => item.count > 0);
}

export function summariseThemeCounts(entry: MappingEvidence) {
  return Object.entries(countBy(entry.themeItems, (item) => item.theme))
    .map(([theme, count]) => ({ theme, count }))
    .filter((item) => item.count > 0);
}

export function groupEntriesByYear(entries: MappingEvidence[]) {
  return reportYearGroups
    .map((year) => ({
      year,
      entries: entries.filter((entry) => normaliseYear(entry.mapping.year) === year).sort(compareMappingEvidence)
    }))
    .filter((group) => group.entries.length > 0);
}

export function compareMappingEvidence(a: MappingEvidence, b: MappingEvidence) {
  return compareYear(a.mapping.year, b.mapping.year) || compareSchemeReference(a.mapping.schemeReference, b.mapping.schemeReference) || compareTerms(a.mapping.term, b.mapping.term) || a.mapping.unit.localeCompare(b.mapping.unit);
}

export function compareYear(a: string, b: string) {
  return yearNumber(a) - yearNumber(b);
}

export function compareTerms(a: string, b: string) {
  const order = ["Autumn", "Spring", "Summer"];
  return (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 99 : order.indexOf(b)) || a.localeCompare(b);
}

export function compareSchemeReference(a: string, b: string) {
  const left = schemeParts(a);
  const right = schemeParts(b);
  if (!left.length && !right.length) return a.localeCompare(b);
  if (!left.length) return 1;
  if (!right.length) return -1;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return a.localeCompare(b);
}

export function progressionStep(reference: MappingFrameworkReference) {
  const direct = reference.progressionStep;
  if (direct && reportSteps.includes(direct)) return direct;
  const match = reference.progressionReference?.match(/Step ([3-5])/);
  return match ? Number(match[1]) : null;
}

export function progressionCounts(references: MappingFrameworkReference[]) {
  return Object.fromEntries(reportSteps.map((step) => [step, references.filter((reference) => progressionStep(reference) === step).length])) as Record<number, number>;
}

export function subjectHasFramework(entries: MappingEvidence[], framework: ReportFramework) {
  return entries.some((entry) => frameworkCount(entry, framework) > 0);
}

export function formatMappingTitle(mapping: MappingEntry) {
  return mapping.unit || mapping.context || "Untitled curriculum mapping";
}

export function formatMappingDescription(mapping: MappingEntry) {
  return mapping.activityDescription || mapping.taskDescription || "";
}

export function frameworkDetailText(reference: MappingFrameworkReference) {
  return frameworkReferenceText(reference);
}

export function compactFrameworkName(reference: MappingFrameworkReference) {
  return frameworkShortLabel(reference.frameworkShortName ?? reference.framework);
}

export function unique<T>(items: T[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

export function countBy<T>(items: T[], key: (item: T) => string) {
  return items.reduce<Record<string, number>>((accumulator, item) => {
    const resolvedKey = key(item);
    accumulator[resolvedKey] = (accumulator[resolvedKey] ?? 0) + 1;
    return accumulator;
  }, {});
}

export function groupBy<T>(items: T[], key: (item: T) => string) {
  return items.reduce<Record<string, T[]>>((accumulator, item) => {
    const resolvedKey = key(item);
    accumulator[resolvedKey] = [...(accumulator[resolvedKey] ?? []), item];
    return accumulator;
  }, {});
}

export function normaliseYear(value: string) {
  const number = yearNumber(value);
  return Number.isFinite(number) && number >= 7 && number <= 11 ? `Year ${number}` : value;
}

export function yearNumber(value: string) {
  const match = value.match(/(?:Year\s*)?Y?(\d{1,2})/i);
  return match ? Number(match[1]) : 99;
}

export function searchableMappingText(entry: MappingEvidence) {
  return [
    entry.mapping.subject,
    entry.mapping.year,
    entry.mapping.term,
    entry.mapping.schemeReference,
    formatMappingTitle(entry.mapping),
    formatMappingDescription(entry.mapping),
    ...entry.frameworkRefs.flatMap((reference) => [reference.framework, reference.strand, reference.strandShortName ?? "", reference.element, reference.notes ?? ""]),
    ...entry.themeItems.flatMap((item) => [item.theme, item.element ?? "", item.label])
  ]
    .join(" ")
    .toLowerCase();
}

function themeItemsForEntry(entry: MappingEntry, themes: CrossCuttingTheme[]): ThemeEvidenceItem[] {
  const themeById = new Map(themes.map((theme) => [theme.id, theme]));
  const elementById = new Map(themes.flatMap((theme) => (theme.elements ?? []).map((element) => [element.id, { theme, element }] as const)));
  const byElementLink =
    entry.crossCuttingThemeElementLinks?.map((link) => {
      const resolved = elementById.get(link.elementId);
      const theme = themeById.get(link.themeId) ?? resolved?.theme;
      const element = resolved?.element;
      return {
        themeId: link.themeId,
        elementId: link.elementId,
        theme: theme?.name ?? "Unknown theme",
        element: element?.name ?? null,
        label: element?.name ? `${theme?.name ?? "Unknown theme"} → ${element.name}` : theme?.name ?? "Unknown theme",
        legacy: !element
      };
    }) ?? [];
  if (byElementLink.length) return byElementLink;

  return (entry.crossCuttingThemes ?? []).map((label, index) => {
    const [themePart, elementPart] = label.split(":").map((part) => part.trim());
    const themeId = entry.crossCuttingThemeIds?.[index];
    const elementId = entry.crossCuttingThemeElementIds?.[index];
    return {
      themeId,
      elementId,
      theme: themePart || label,
      element: elementPart || null,
      label: elementPart ? `${themePart} → ${elementPart}` : label,
      legacy: !elementPart
    };
  });
}

function schemeParts(value: string) {
  const match = value.match(/\d+(?:\.\d+)*/);
  if (!match) return [];
  return match[0].split(".").map((part) => Number(part)).filter((part) => Number.isFinite(part));
}
