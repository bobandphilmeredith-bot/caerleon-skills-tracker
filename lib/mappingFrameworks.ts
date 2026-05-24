import type { MappingEntry, MappingFrameworkReference } from "@/lib/types";

export function frameworkReferencesForEntry(entry: MappingEntry): MappingFrameworkReference[] {
  if (entry.frameworkReferences?.length) return entry.frameworkReferences;
  if (!entry.frameworkId || !entry.strandId || !entry.elementId || entry.framework === "No framework reference") return [];
  return [
    {
      frameworkId: entry.frameworkId,
      strandId: entry.strandId,
      elementId: entry.elementId,
      progressionDescriptorId: entry.progressionDescriptorId,
      framework: entry.framework,
      strand: entry.strand,
      element: entry.element,
      progressionReference: entry.progressionReference
    }
  ];
}

export function matchingFrameworkReferences(entry: MappingEntry, framework?: string) {
  const references = frameworkReferencesForEntry(entry);
  return framework ? references.filter((reference) => frameworkMatches(reference.frameworkShortName ?? reference.framework, framework)) : references;
}

export function primaryReferenceForFramework(entry: MappingEntry, framework?: string) {
  return matchingFrameworkReferences(entry, framework)[0] ?? frameworkReferencesForEntry(entry)[0] ?? null;
}

export function entryHasFramework(entry: MappingEntry, framework: string) {
  return matchingFrameworkReferences(entry, framework).length > 0;
}

export function frameworkShortLabel(framework: string) {
  const normalised = normaliseFrameworkName(framework);
  if (normalised === "digital competence") return "DCF";
  if (normalised === "literacy") return "Literacy";
  if (normalised === "numeracy") return "Numeracy";
  return framework;
}

export function frameworkMatches(left: string, right: string) {
  return normaliseFrameworkName(left) === normaliseFrameworkName(right);
}

export function frameworkReferenceText(reference: MappingFrameworkReference) {
  return [
    frameworkShortLabel(reference.frameworkShortName ?? reference.framework),
    reference.strandShortName ?? reference.strand,
    reference.element,
    reference.progressionReference
  ]
    .filter(Boolean)
    .join(" → ");
}

function normaliseFrameworkName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+framework$/i, "")
    .replace(/^dcf$/, "digital competence")
    .replace(/^digital competence$/, "digital competence")
    .replace(/^cross-cutting themes?$/, "themes")
    .replace(/^cct$/, "themes");
}
