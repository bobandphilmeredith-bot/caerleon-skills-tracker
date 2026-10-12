export type CflFileOverride = { subject?: string; term?: string };

export function isInternationalLanguages(subject: string) {
  return /^international\s+languages\b/i.test(subject.trim());
}

export function resolveCflSubject(subject: string, fileName = "", moduleTitle = "") {
  if (!isInternationalLanguages(subject)) return subject.trim();
  const languages = (text: string) => ["French", "German"].filter(language => new RegExp(`\\b${language}\\b`, "i").test(text));
  // Use document identity, not incidental language references in lesson descriptions.
  const identity = languages(`${subject} ${fileName.split(/[\\/]/).at(-1) ?? ""}`);
  if (identity.length) return identity.length === 1 ? identity[0] : subject.trim();
  const title = languages(moduleTitle);
  return title.length === 1 ? title[0] : subject.trim();
}

export function explicitCflTerm(text: string) {
  const terms = ["Autumn", "Spring", "Summer"].filter(term => new RegExp(`\\b${term}\\b`, "i").test(text));
  return terms.length === 1 ? terms[0] : "";
}

export function sequenceCflTerm(...sources: string[]) {
  for (const source of sources) {
    const modules = [...source.matchAll(/\b(?:Y(?:ear)?\s*)?(\d{1,2})\s*\.\s*(\d+)\b/gi)];
    if (!modules.length) continue;
    if (modules.some((match) => Number(match[1]) < 1 || Number(match[1]) > 13 || Number(match[2]) < 1 || Number(match[2]) > 6)) return "";
    const terms = new Set(modules.map((match) => ["Autumn", "Spring", "Summer"][Math.floor((Number(match[2]) - 1) / 2)]));
    return terms.size === 1 ? [...terms][0] : "";
  }
  return "";
}
