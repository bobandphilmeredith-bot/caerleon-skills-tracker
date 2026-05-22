import { frameworkLibrary, mappings, subjects, terms, yearGroups } from "@/lib/data";
import type { MappingEntry } from "@/lib/types";

export const themeMapOutputs = [
  themeMap("RSE", "Relationships and sexuality education"),
  themeMap("Human rights", "Human rights"),
  themeMap("Diversity", "Diversity"),
  themeMap("Careers and work-related experiences", "Careers and work-related experiences"),
  {
    theme: "Cynefin",
    subjects: ["History", "Art", "English"],
    yearGroups: ["Year 7", "Year 8", "Year 9"],
    examples: ["Local heritage source enquiry", "Community arts brief", "Representation in fiction"],
    schemeReferences: ["HUM-Y8-A1", "ART-Y7-A1", "ENG-Y8-SU1"]
  },
  {
    theme: "Sustainability",
    subjects: ["Biology", "Geography", "DT"],
    yearGroups: ["Year 8", "Year 9", "Year 10"],
    examples: ["Water quality investigation", "Population change enquiry", "System design portfolio"],
    schemeReferences: ["SCI-Y9-S2", "HUM-Y9-SU3", "TEC-Y10-S1"]
  },
  {
    theme: "Ethical decision-making",
    subjects: ["History", "Biology", "PSE"],
    yearGroups: ["Year 8", "Year 9", "Year 10"],
    examples: ["Local decision-making enquiry", "Bias in science media", "Respectful communication"],
    schemeReferences: ["HUM-Y9-SU1", "SCI-Y10-A3", "HWB-Y8-S1"]
  }
];

export const recentMappingFeed = [
  feed("Biology", "Numeracy Framework", "Learning that statistics represent data and that probability models chance helps us make informed inferences and decisions", "Interpreting data", "Pupils interpret reaction graphs and use data to justify conclusions.", "2026-05-10"),
  feed("History", "Literacy Framework", "Reading", "Understanding, response and analysis", "Pupils compare museum captions and visitor articles to identify how viewpoint changes the account.", "2026-05-09"),
  feed("English", "Literacy Framework", "Reading", "Understanding, response and analysis", "Pupils compare two persuasive articles and identify how writers shape viewpoint.", "2026-05-08"),
  feed("DT", "Digital Competence Framework", "Producing", "Evaluating and improving digital content", "Pupils review a system against audience needs and record improvements for the next iteration.", "2026-05-06"),
  feed("RSE", "Cross-cutting Themes", "Relationships and sexuality education", "Healthy relationships", "Pupils discuss scenario cards and identify respectful communication choices.", "2026-05-04")
];

export const reviewSummaryNotes = [
  "Curriculum visibility is strongest where mapped opportunities include clear task descriptions.",
  "Review suggested for elements with fewer recorded opportunities across Years 10 and 11.",
  "Curriculum connections are visible across Literacy Reading, Numeracy data interpretation and DCF data handling.",
  "Cross-curricular themes are represented in planning through local enquiry, community, rights and sustainability examples."
];

export function getElementDefinition(elementName: string) {
  return frameworkLibrary.flatMap((framework) => framework.strands.flatMap((strand) => strand.elements)).find((element) => element.name === elementName);
}

export function getRelatedSuggestions(entryOrElement: MappingEntry | string) {
  const elementName = typeof entryOrElement === "string" ? entryOrElement : entryOrElement.element;
  const element = getElementDefinition(elementName);
  return element?.relatedConnections ?? ["Curriculum connections", "Related strand mapping", "Shared classroom opportunities"];
}

export function buildRevisitRows(framework?: string) {
  const entries = framework ? mappings.filter((entry) => entry.framework === framework) : mappings;
  const groups = new Map<string, MappingEntry[]>();
  entries.forEach((entry) => {
    groups.set(entry.element, [...(groups.get(entry.element) ?? []), entry]);
  });
  return Array.from(groups.entries())
    .map(([element, rows]) => ({
      element,
      yearGroups: unique(rows.map((row) => row.year)),
      subjects: unique(rows.map((row) => row.subject)),
      terms: unique(rows.map((row) => row.term)),
      count: rows.length
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

export function filterNaturalLanguage(query: string, entries = mappings) {
  const normalised = query.toLowerCase();
  const stopWords = new Set(["what", "where", "who", "is", "are", "the", "a", "an", "in", "on", "of", "for", "to", "do", "does", "happening", "pupils", "learners", "mapped", "mapping"]);
  const requestedYear = yearGroups.find((year) => normalised.includes(year.toLowerCase()));
  const requestedFramework = frameworkLibrary.find((framework) => normalised.includes(framework.name.toLowerCase()) || (framework.name === "Digital Competence Framework" && normalised.includes("dcf")));
  const keywords = normalised
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .filter((word) => !stopWords.has(word) && word !== "year" && !/^\d+$/.test(word));

  return entries.filter((entry) => {
    if (requestedYear && entry.year !== requestedYear) return false;
    if (requestedFramework && entry.framework !== requestedFramework.name) return false;

    const content = `${entry.subject} ${entry.year} ${entry.term} ${entry.framework} ${entry.strand} ${entry.element} ${entry.unit} ${entry.activityDescription}`.toLowerCase();
    const expanded =
      content +
      (entry.framework === "Numeracy" || entry.framework === "Numeracy Framework" ? " numeracy number data interpreting data graphs " : "") +
      (entry.element.includes("Comparing") || entry.activityDescription.toLowerCase().includes("evidence") ? " evaluating information source evaluation viewpoint bias " : "") +
      (entry.activityDescription.toLowerCase().includes("local") || entry.activityDescription.toLowerCase().includes("community") ? " cynefin local community belonging " : "");

    return keywords.length ? keywords.every((word) => expanded.includes(word)) : expanded.includes(normalised);
  });
}

export function getJourneyActivities(filters: { framework?: string; strand?: string; element?: string; subject?: string; year?: string }) {
  return yearGroups.map((year) => ({
    year,
    entries: mappings.filter(
      (entry) =>
        entry.year === year &&
        (!filters.framework || entry.framework === filters.framework) &&
        (!filters.strand || entry.strand === filters.strand) &&
        (!filters.element || entry.element === filters.element) &&
        (!filters.subject || entry.subject === filters.subject) &&
        (!filters.year || entry.year === filters.year)
    )
  }));
}

export { subjects, terms, yearGroups };

function themeMap(label: string, strandName: string) {
  const entries = mappings.filter((entry) => entry.strand === strandName);
  return {
    theme: label,
    subjects: unique(entries.map((entry) => entry.subject)),
    yearGroups: unique(entries.map((entry) => entry.year)),
    examples: entries.map((entry) => entry.unit).slice(0, 3),
    schemeReferences: entries.map((entry) => entry.schemeReference).slice(0, 3)
  };
}

function feed(subject: string, framework: string, strand: string, element: string, task: string, dateAdded: string) {
  return { subject, framework, strand, element, task, dateAdded };
}

function unique(items: string[]) {
  return Array.from(new Set(items)).filter(Boolean);
}
