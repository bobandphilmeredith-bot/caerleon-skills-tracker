import type { ElementDefinition, MappingEntry, ProgressionReference, ProgressionStep } from "@/lib/types";

export const progressionSteps: ProgressionStep[] = ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"];

export const secondaryProgressionReferences: ProgressionReference[] = ["Step 3", "Step 4", "Step 5", "Step 3–4", "Step 4–5", "Not specified"];

export const visibleProgressionSteps: ProgressionStep[] = ["Step 3", "Step 4", "Step 5"];

export const bridgingProgressionReferences: ProgressionReference[] = ["Step 3–4", "Step 4–5"];

export function suggestedProgressionForYear(year: string): ProgressionReference {
  const suggestions: Record<string, ProgressionReference> = {
    "Year 7": "Step 3–4",
    "Year 8": "Step 4",
    "Year 9": "Step 4",
    "Year 10": "Step 4–5",
    "Year 11": "Step 5"
  };
  return suggestions[year] ?? "Not specified";
}

export function progressionReferenceForEntry(entry: Pick<MappingEntry, "year" | "progressionReference">): ProgressionReference {
  return entry.progressionReference ?? suggestedProgressionForYear(entry.year);
}

export function descriptorForReference(element: ElementDefinition | undefined, reference: ProgressionReference) {
  const step = referenceToStep(reference);
  if (!element || !step) return "No progression descriptor selected for this mapping entry.";
  return element.progressionDescriptors?.[step] ?? "Progression descriptor can be edited in Admin Setup.";
}

export function referenceToStep(reference: ProgressionReference): ProgressionStep | null {
  if (progressionSteps.includes(reference as ProgressionStep)) return reference as ProgressionStep;
  if (reference === "Step 3–4") return "Step 3";
  if (reference === "Step 4–5") return "Step 4";
  return null;
}

export function progressionSummary(entries: MappingEntry[]) {
  return {
    "Step 3": entries.filter((entry) => progressionReferenceForEntry(entry) === "Step 3").length,
    "Step 4": entries.filter((entry) => progressionReferenceForEntry(entry) === "Step 4").length,
    "Step 5": entries.filter((entry) => progressionReferenceForEntry(entry) === "Step 5").length,
    Bridging: entries.filter((entry) => bridgingProgressionReferences.includes(progressionReferenceForEntry(entry))).length,
    "Not specified": entries.filter((entry) => progressionReferenceForEntry(entry) === "Not specified").length
  };
}
