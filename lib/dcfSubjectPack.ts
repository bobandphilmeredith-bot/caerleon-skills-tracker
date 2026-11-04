import { buildDcfReport, type DcfInput } from "@/lib/dcfReport";
import { formatMappingTitle, unique } from "@/lib/reporting";

export const subjectDcfPrompts = [
  { title: "Purpose", question: "Which digital skill does this task develop, and why does it help pupils learn in this subject?", evidence: "Use the task and its mapped DCF element to explain the learning intention." },
  { title: "Progression", question: "What can pupils already do, and what becomes more demanding or independent in the next task?", evidence: "Compare earlier and later work. Explain the change in challenge, support and independence." },
  { title: "Impact", question: "What work would you show to explain what pupils have learned and can now do independently?", evidence: "Locate examples of work and feedback; invite pupils to explain their choices and improvements." },
  { title: "Access", question: "How do you help pupils with different starting points or barriers take part and make progress?", evidence: "Explain adaptations, access to digital tools and the support that can gradually be removed." },
  { title: "Transfer and safe use", question: "Where else do pupils apply this skill, and how do they use digital tools safely and responsibly?", evidence: "Identify another context and discuss relevant choices about sources, ownership, privacy or collaboration." },
  { title: "Review", question: "What have you changed after reviewing this work, and what will you check next?", evidence: "Identify a curriculum improvement, who will follow it up and the evidence needed to judge its effect." },
];

export function buildSubjectDcfPack(input: DcfInput) {
  if (!input.filters.subject.trim()) throw new Error("Choose a subject before preparing a DCF pack.");
  const report = buildDcfReport(input);
  const entries = report.entries.map((entry) => ({
    ...entry,
    // Identical links should appear once; different descriptors or notes are retained.
    references: Array.from(new Map(entry.references.map((ref) => [JSON.stringify([
      ref.frameworkId, ref.strandId, ref.elementId, ref.framework, ref.strand,
      ref.element, ref.progressionStep, ref.progressionReference, ref.descriptor, ref.notes,
    ]), ref])).values()),
  }));
  return {
    ...report,
    entries,
    subject: input.filters.subject,
    mappedYears: unique(entries.map(({ mapping }) => mapping.year)),
    referenceCount: entries.reduce((sum, entry) => sum + entry.references.length, 0),
  };
}

export type SubjectDcfPack = ReturnType<typeof buildSubjectDcfPack>;

export function subjectDcfFileName(pack: SubjectDcfPack) {
  const slug = [pack.subject, pack.filters.year, pack.filters.term].filter(Boolean).join("-")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "").toLowerCase() || "subject";
  return `${slug}-dcf-estyn-preparation-${pack.generatedAt.slice(0, 10)}.pdf`;
}

export function subjectDcfTaskTitle(entry: SubjectDcfPack["entries"][number]) {
  return `${entry.evidenceId} | ${formatMappingTitle(entry.mapping)}`;
}
