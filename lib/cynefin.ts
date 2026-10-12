import type { CrossCuttingTheme, MappingEntry } from "@/lib/types";

const mentionsCynefin = (text: string | undefined) => /\bcynefin\b/i.test(text ?? "");

export function cynefinMatch(entry: MappingEntry, themes: CrossCuttingTheme[]): string | null {
  const tagged = entry.crossCuttingThemes?.some(mentionsCynefin) || themes.some((theme) => {
    const themeSelected = entry.crossCuttingThemeIds?.includes(theme.id) || entry.crossCuttingThemeElementLinks?.some((link) => link.themeId === theme.id);
    const elementSelected = theme.elements?.some((element) =>
      (mentionsCynefin(theme.name) || mentionsCynefin(element.name)) &&
      (entry.crossCuttingThemeElementIds?.includes(element.id) || entry.crossCuttingThemeElementLinks?.some((link) => link.themeId === theme.id && link.elementId === element.id))
    );
    return (mentionsCynefin(theme.name) && themeSelected) || elementSelected;
  });
  if (tagged) return "Cynefin theme selected";
  if ([entry.unit, entry.context, entry.activityDescription, entry.taskDescription, entry.crossCuttingThemeNotes, entry.note].some(mentionsCynefin)) return "Cynefin mentioned in plan";
  return null;
}

export function cynefinCsv(rows: string[][]): string {
  return "\uFEFF" + rows.map((row) => row.map((value) => {
    const safe = /^[\s]*[=+@-]/.test(value) ? "'" + value : value;
    return '"' + safe.replace(/"/g, '""') + '"';
  }).join(",")).join("\r\n");
}
