import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { dcfGuidance, dcfProgression } from "@/lib/dcfReport";
import { subjectDcfPrompts, subjectDcfTaskTitle, type SubjectDcfPack } from "@/lib/dcfSubjectPack";

const ink = rgb(0.13, 0.18, 0.22);
const muted = rgb(0.34, 0.39, 0.42);
const accent = rgb(0.34, 0.08, 0.21);
const gold = rgb(0.72, 0.51, 0.08);
const rule = rgb(0.85, 0.87, 0.87);
const pale = rgb(0.97, 0.96, 0.93);
const width = 595.28, height = 841.89, margin = 44, contentWidth = width - margin * 2;
const clean = (text: string) => text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replace(/[\u2010-\u2015]/g, "-").replace(/\t/g, "  ");

// Split long words as well as ordinary prose, so imported URLs/identifiers cannot overflow.
function wrap(text: string, font: PDFFont, size: number, available: number) {
  const lines: string[] = [];
  for (const paragraph of clean(text).split(/\r?\n/)) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (font.widthOfTextAtSize(line ? `${line} ${word}` : word, size) <= available) {
        line = line ? `${line} ${word}` : word;
        continue;
      }
      if (line) lines.push(line);
      line = "";
      for (const char of word) {
        if (line && font.widthOfTextAtSize(line + char, size) > available) {
          lines.push(line);
          line = "";
        }
        line += char;
      }
    }
    lines.push(line);
  }
  return lines;
}

export async function createSubjectDcfPdf(pack: SubjectDcfPack, fonts: { regular: Uint8Array; bold: Uint8Array }) {
  if (!pack.entries.length) throw new Error("There are no mapped DCF tasks in this selection.");
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const regular = await pdf.embedFont(fonts.regular, { subset: true });
  const bold = await pdf.embedFont(fonts.bold, { subset: true });
  pdf.setTitle(`${pack.subject} - DCF subject preparation`);
  pdf.setAuthor(pack.schoolName);
  pdf.setSubject("Mapped DCF tasks and Estyn discussion preparation");
  pdf.setCreationDate(new Date(pack.generatedAt));
  let page!: PDFPage;
  let y = 0;
  let section = "Subject overview";
  const taskPages: { title: string; page: number }[] = [];
  const date = new Date(pack.generatedAt).toLocaleDateString("en-GB", { timeZone: "Europe/London", day: "numeric", month: "long", year: "numeric" });

  function newPage(continued = false) {
    page = pdf.addPage([width, height]);
    page.drawRectangle({ x: 0, y: height - 9, width, height: 9, color: accent });
    y = height - margin;
    const header = wrap(pack.schoolName, bold, 9, contentWidth - 75);
    for (const line of header) {
      page.drawText(line, { x: margin, y, font: bold, size: 9, color: muted });
      y -= 13;
    }
    page.drawText("DCF PACK", { x: width - margin - 58, y: height - margin, font: bold, size: 9, color: gold });
    y -= 15;
    if (continued) paragraph(`${section} (continued)`, { font: bold, size: 12, color: accent, after: 16 });
  }
  function ensure(space: number) {
    if (y - space < 58) newPage(true);
  }
  function paragraph(text: string, options: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; after?: number; inset?: number } = {}) {
    const { font = regular, size = 10, color = ink, after = 9, inset = 0 } = options;
    const leading = size * 1.48;
    for (const line of wrap(text, font, size, contentWidth - inset * 2)) {
      ensure(leading);
      page.drawText(line, { x: margin + inset, y, font, size, color });
      y -= leading;
    }
    y -= after;
  }
  function heading(text: string, size = 16) {
    ensure(Math.min(wrap(text, bold, size, contentWidth).length * size * 1.48 + 34, 180));
    paragraph(text, { font: bold, size, color: accent, after: 12 });
  }
  function field(label: string, value?: string) {
    if (!value?.trim()) return;
    ensure(54);
    paragraph(label.toUpperCase(), { font: bold, size: 8, color: muted, after: 4 });
    paragraph(value);
  }
  function notes(label: string, lines = 2) {
    ensure(26 + lines * 21);
    paragraph(label, { font: bold, size: 9, color: muted, after: 4 });
    for (let i = 0; i < lines; i++) {
      y -= 17;
      page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rule });
      y -= 4;
    }
    y -= 15;
  }

  newPage();
  paragraph(pack.demo ? "DEMONSTRATION DATA | ESTYN PREPARATION" : "ESTYN PREPARATION", { font: bold, size: 9, color: gold, after: 16 });
  heading(pack.subject, 30);
  paragraph("Digital competence\nSubject discussion pack", { font: bold, size: 21, after: 16 });
  paragraph(`${pack.filters.year || "All year groups"} | ${pack.filters.term || "All terms"}\nPrepared ${date}`, { color: muted, after: 20 });
  const metrics = [
    [String(pack.entries.length), "mapped tasks"],
    [String(pack.referenceCount), "DCF references"],
    [String(pack.mappedYears.length), "year groups"],
  ];
  ensure(90);
  const boxWidth = (contentWidth - 16) / 3;
  for (let i = 0; i < metrics.length; i++) {
    const x = margin + i * (boxWidth + 8);
    page.drawRectangle({ x, y: y - 72, width: boxWidth, height: 72, color: pale });
    page.drawText(metrics[i][0], { x: x + 13, y: y - 28, font: bold, size: 24, color: accent });
    page.drawText(metrics[i][1], { x: x + 13, y: y - 52, font: regular, size: 9, color: muted });
  }
  y -= 99;
  heading("Prepare for the conversation");
  paragraph("1. Check the mapped tasks and DCF references against what is taught.\n2. Choose examples of pupil work that show learning over time.\n3. Rehearse the practice questions and note the evidence you would use.");
  paragraph("This pack records planned opportunities. It does not verify delivery or pupil progress. Questions are school preparation prompts, not an official Estyn question list.", { color: muted });
  paragraph("Scope: all recorded mappings matching the selection. Academic year is not recorded, so check that examples belong to the intended planning cycle.", { size: 9, color: muted });

  section = "Coverage and task finder";
  newPage();
  heading(section, 23);
  paragraph(`${pack.subject} | ${pack.filters.year || "All year groups"} | ${pack.filters.term || "All terms"}`, { color: muted });
  heading("Where this subject contributes");
  if (!pack.strands.length) paragraph("The DCF catalogue is unavailable. Recorded task references are retained, but coverage cannot be checked.");
  for (const strand of pack.strands) {
    ensure(60);
    paragraph(`${strand.name}: ${strand.entries.length} mapped tasks`, { font: bold, after: 4 });
    paragraph(strand.elements.filter((item) => item.entries.length).map((item) => item.element.name).join("; ") || "No recorded opportunity in this selection.", { size: 9, color: muted });
  }
  paragraph("An element without a mapping here is a discussion point, not a requirement for this subject to cover every DCF element. Check the wider school plan where relevant.", { size: 9, color: muted });
  const issues = pack.quality.filter((item) => item.entries.length);
  if (issues.length) {
    heading("Check these records");
    for (const item of issues) paragraph(`${item.label}: ${item.entries.map((entry) => entry.evidenceId).join(", ")}. ${item.remedy}`, { size: 9 });
  }
  heading("Task finder");
  for (const entry of pack.entries) {
    paragraph(`${entry.evidenceId} | ${entry.mapping.year || "Year not recorded"} | ${entry.mapping.term || "Term not recorded"}\n${entry.mapping.unit || entry.mapping.context || "Untitled curriculum mapping"}`, { size: 9, after: 10 });
  }

  for (const entry of pack.entries) {
    const { mapping } = entry;
    section = `${entry.evidenceId} | ${pack.subject}`;
    newPage();
    taskPages.push({ title: entry.evidenceId, page: pdf.getPageCount() });
    paragraph(`${mapping.year || "Year not recorded"} | ${mapping.term || "Term not recorded"}`, { font: bold, size: 10, color: gold, after: 14 });
    heading(subjectDcfTaskTitle(entry), 21);
    field("Scheme / unit reference", mapping.schemeReference || "Not recorded");
    field("Mapped activity", mapping.activityDescription || mapping.taskDescription || "No task description recorded. Check the scheme of learning before discussion.");
    if (mapping.activityDescription && mapping.taskDescription && mapping.taskDescription !== mapping.activityDescription) field("Task detail", mapping.taskDescription);
    if (mapping.context && mapping.context !== mapping.unit) field("Curriculum context", mapping.context);
    heading("Mapped DCF references");
    for (const ref of entry.references) {
      ensure(70);
      paragraph(`${ref.strand || "Strand not recorded"} / ${ref.element || "Element not recorded"}`, { font: bold, size: 10, after: 4 });
      paragraph(`Progression reference: ${dcfProgression(ref)}`, { size: 9, color: accent, after: 5 });
      if (ref.descriptor) paragraph(ref.descriptor, { size: 9 });
      if (ref.notes) field("Reference notes", ref.notes);
    }
    field("Mapping notes", mapping.note);
    field("Last mapped", mapping.lastMappedDate || "Not recorded");
    ensure(125);
    heading("Be ready to explain", 13);
    paragraph("What digital skill is taught here? What can pupils do independently? How does this build on earlier work and prepare them for what comes next?", { size: 9 });
    notes("Evidence to locate / points to discuss", 2);
    paragraph(`Mapping record: ${mapping.id}`, { size: 8, color: muted });
  }

  section = "Discussion rehearsal";
  newPage();
  heading(section, 23);
  paragraph("Practice prompts for subject staff. Use examples from this pack and actual pupil work; prepare your own evidence-based responses.", { color: muted });
  for (const [index, prompt] of subjectDcfPrompts.entries()) {
    ensure(170);
    heading(`${index + 1}. ${prompt.title}`, 13);
    paragraph(prompt.question, { font: bold, size: 10, after: 5 });
    paragraph(prompt.evidence, { size: 9, color: muted });
    notes("Task reference / evidence / response", 1);
  }
  section = "Follow-up and sources";
  newPage();
  heading(section, 23);
  notes("Priority to follow up", 3);
  notes("Action, owner and review date", 3);
  notes("Evidence to review and what you will look for", 3);
  heading("Task page references", 13);
  paragraph(taskPages.map((item) => `${item.title}: p.${item.page}`).join("   |   "), { size: 9 });
  heading("Guidance for preparation", 13);
  paragraph("Estyn: Supplementary guidance on inspecting curriculum in maintained schools and PRUs (Summer 2025). The practice prompts draw on its focus on purpose, progression, access and evidence of learning.", { size: 9 });
  paragraph(dcfGuidance.curriculum, { size: 8, color: muted });
  paragraph("Source of task content: this school's curriculum mappings in Skills Tracker. Descriptions, descriptors and notes are reproduced as recorded. Re-download after changing mappings.", { size: 9, color: muted });

  const pages = pdf.getPages();
  pages.forEach((sheet, index) => {
    sheet.drawLine({ start: { x: margin, y: 42 }, end: { x: width - margin, y: 42 }, color: rule, thickness: 0.6 });
    const footer = `${pack.demo ? "DEMO | " : ""}DCF | Planned provision | ${date}`;
    sheet.drawText(footer, { x: margin, y: 27, font: regular, size: 8, color: muted });
    const count = `${index + 1} / ${pages.length}`;
    sheet.drawText(count, { x: width - margin - regular.widthOfTextAtSize(count, 8), y: 27, font: regular, size: 8, color: muted });
  });
  return pdf.save();
}
