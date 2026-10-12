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
