"use client";

type CsvRow = Record<string, string>;

export type CflDocxSummary = {
  subject: string;
  yearGroup: string;
  term: string;
  moduleCode: string;
  moduleTitle: string;
  skillsFound: number;
  themesFound: number;
  warnings: string[];
};

export async function convertCflDocxToCsv(file: File): Promise<{ csv: string; summary: CflDocxSummary }> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let documentXml: Uint8Array;
  try {
    documentXml = await readZipEntry(bytes, "word/document.xml");
  } catch {
    throw new Error("This file could not be opened as a Word .docx document.");
  }

  const parser = new DOMParser();
  const xml = parser.parseFromString(new TextDecoder().decode(documentXml), "application/xml");
  if (xml.getElementsByTagName("parsererror").length) throw new Error("The Word document XML could not be read.");

  const rows = extractTableRows(xml);
  const paragraphs = extractParagraphs(xml);
  const heading = paragraphs.find((text) => /department\s+context\s+for\s+learning/i.test(text)) ?? "";

  const subject =
    heading.match(/School\s+(.+?)\s+Department\s+Context\s+for\s+Learning/i)?.[1]?.trim() ??
    heading.match(/\b([A-Za-z][A-Za-z &/-]+?)\s+Department\s+Context\s+for\s+Learning/i)?.[1]?.trim() ??
    genericSubject(paragraphs, rows) ??
    "";

  const moduleCode = heading.match(/Context\s+for\s+Learning\s*:\s*(.+)$/i)?.[1]?.trim() ?? "";
  const moduleTitle =
    valueAfterLabel(rows, ["Module/ Enquiry Question", "Module / Enquiry Question", "Module/Enquiry Question", "Module", "Topic"]) ||
    paragraphLabelValue(paragraphs, ["Module", "Topic"]) ||
    genericTopicFromParagraphs(paragraphs);
  const sequence =
    valueAfterLabel(rows, ["Position in sequence/Point of Progress", "Position in sequence / Point of Progress", "Position", "Term"]) ||
    paragraphLabelValue(paragraphs, ["Position", "Term"]);
  const yearGroup = inferYearGroup(moduleCode || moduleTitle || paragraphs.join(" ") || file.name) || inferYearGroup(file.name);
  const term = inferTerm(sequence || paragraphs.join(" "));
  const curriculumIntent =
    valueAfterLabel(rows, ["Curriculum Intent"]) ||
    paragraphLabelValue(paragraphs, ["Curriculum Intent"]) ||
    paragraphAfterExactHeading(paragraphs, "Curriculum Intent");
  const sourceFile = file.name;
  const explicitProgressionStep =
    inferExactProgressionStep(paragraphs) ??
    inferExplicitProgressionStep([
      moduleTitle,
      sequence,
      curriculumIntent,
      valueAfterLabel(rows, ["Subject Content/ Knowledge", "Subject Content/Knowledge"]),
      valueAfterLabel(rows, ["Subject Concepts/ Skills", "Subject Concepts/Skills"])
    ]);
  const progressionStep = explicitProgressionStep ?? defaultProgressionStep(yearGroup);

  const warnings: string[] = [];
  if (!subject) warnings.push("Subject could not be read from the document heading.");
  if (!yearGroup) warnings.push("Year group could not be inferred from the module code or title.");
  if (!term) warnings.push("Term could not be inferred from the position-in-sequence field.");
  if (!moduleTitle) warnings.push("Module / enquiry question could not be read.");
  if (!curriculumIntent) warnings.push("Curriculum intent could not be read.");
  if (explicitProgressionStep) {
    warnings.push(`Progression Step ${explicitProgressionStep} was explicitly stated in the CfL and will override the year-group default.`);
  }

  const common: CsvRow = {
    subject,
    year_group: yearGroup,
    term,
    module_code: moduleCode || moduleTitle,
    module_title: moduleTitle || moduleCode,
    curriculum_intent: curriculumIntent,
    key_stage: inferKeyStage(yearGroup),
    source_file: sourceFile,
    links_within_aole: valueAfterLabel(rows, ["Links Within AoLE"]),
    links_across_aoles: valueAfterLabel(rows, ["Links Across AoLEs"]),
    subject_content_knowledge: valueAfterLabel(rows, ["Subject Content/ Knowledge", "Subject Content/Knowledge"]),
    subject_concepts_skills: valueAfterLabel(rows, ["Subject Concepts/ Skills", "Subject Concepts/Skills"]),
    learning_outcomes: valueAfterLabel(rows, ["Learning Outcomes Linked to Progression Steps"])
  };

  const importRows: CsvRow[] = [];
  const skillSections = [
    { labels: ["Literacy"], frameworkType: "Literacy" },
    { labels: ["Numeracy"], frameworkType: "Numeracy" },
    { labels: ["Digital Competence"], frameworkType: "DCF" }
  ];

  let skillsFound = 0;
  const structuredSkills: Array<{ frameworkType: string; code: string; name: string; evidence: string }> = [];
  for (const section of skillSections) {
    const sectionText = valueAfterLabel(rows, section.labels);
    for (const skill of parseSkillLines(sectionText)) {
      structuredSkills.push({ frameworkType: section.frameworkType, ...skill });
    }
  }

  const skills = structuredSkills.length ? structuredSkills : genericSkills(paragraphs, rows);
  for (const skill of skills) {
    skillsFound += 1;
    importRows.push({
      ...common,
      framework_type: skill.frameworkType,
      strand_name: "",
      element_name: skill.name,
      skill_code: skill.code,
      progression_step: progressionStep ? String(progressionStep) : "",
      mapping_description: skill.evidence,
      notes: "",
      cross_cutting_theme_focus: ""
    });
  }

  const themeLabels: { labels: string[]; canonical: string }[] = [
    { labels: ["Diversity, Representation and Inclusion", "Diversity"], canonical: "Diversity" },
    { labels: ["Careers and Work Related Experiences", "Careers and work-related experiences"], canonical: "Careers and work-related experiences" },
    { labels: ["Relationships and Sexuality Education (RSE)", "Relationships and sexuality education"], canonical: "Relationships and sexuality education" },
    { labels: ["Human Rights and UNCRC/D", "Human rights education"], canonical: "Human rights education" },
    {
      labels: ["Local, National and International Contexts, Including Wales", "Local, national and international contexts"],
      canonical: "Local, national and international contexts"
    }
  ];

  let themesFound = 0;
  const themeRows = themeLabels
    .map((theme) => ({ ...theme, evidence: valueAfterLabel(rows, theme.labels) }))
    .filter((theme) => theme.evidence.trim());
  const themes = themeRows.length ? themeRows : genericThemes(paragraphs);

  for (const theme of themes) {
    themesFound += 1;
    importRows.push({
      ...common,
      framework_type: "CCT",
      strand_name: theme.canonical,
      element_name: "",
      skill_code: "",
      progression_step: "",
      mapping_description: theme.evidence,
      notes: theme.evidence,
      cross_cutting_theme_focus: theme.canonical
    });
  }

  if (!importRows.length) {
    warnings.push("No Literacy, Numeracy, DCF or populated cross-cutting theme mappings were found.");
    importRows.push({
      ...common,
      framework_type: "",
      strand_name: "",
      element_name: "",
      skill_code: "",
      progression_step: "",
      mapping_description: "",
      notes: "",
      cross_cutting_theme_focus: ""
    });
  }

  return {
    csv: toCsv(importRows),
    summary: { subject, yearGroup, term, moduleCode: moduleCode || moduleTitle, moduleTitle: moduleTitle || moduleCode, skillsFound, themesFound, warnings }
  };
}

function extractTableRows(xml: Document) {
  return Array.from(xml.getElementsByTagNameNS("*", "tr")).map((row) =>
    directChildren(row, "tc").map((cell) => {
      const paragraphs = directChildren(cell, "p")
        .map(paragraphText)
        .map(cleanText)
        .filter(Boolean);
      return paragraphs.join("\n");
    })
  );
}

function directChildren(element: Element, localName: string) {
  return Array.from(element.children).filter((child) => child.localName === localName);
}

function extractParagraphs(xml: Document) {
  return Array.from(xml.getElementsByTagNameNS("*", "p")).map(paragraphText).map(cleanText).filter(Boolean);
}

function paragraphText(paragraph: Element) {
  return Array.from(paragraph.getElementsByTagNameNS("*", "t")).map((node) => node.textContent ?? "").join("");
}

function valueAfterLabel(rows: string[][], labels: string[]) {
  const targets = labels.map(normalise);
  for (const row of rows) {
    for (let index = 0; index < row.length; index += 1) {
      if (!targets.includes(normalise(row[index] ?? ""))) continue;
      for (let next = index + 1; next < row.length; next += 1) {
        const candidate = cleanCell(row[next] ?? "");
        if (candidate) return candidate;
      }
      return "";
    }
  }
  return "";
}

function parseSkillLines(text: string) {
  return text
    .split(/\n+/)
    .map(cleanText)
    .filter(Boolean)
    .map((line) => {
      // CfLs often use "3.1 - Magnification calculations": the code identifies
      // the official tracker element and the text after the dash describes the task.
      const codeThenTask = line.match(/^(\d+(?:\.\d+)*)\s*[–—-]\s*(.+)$/);
      if (codeThenTask) {
        return { code: codeThenTask[1], name: "", evidence: cleanText(codeThenTask[2]) };
      }

      // Other CfLs use "4.1 Collecting data - planning a fair test...":
      // preserve the element wording and the activity-specific evidence separately.
      const elementThenTask = line.match(/^(\d+(?:\.\d+)*)\s+(.+?)\s+[–—-]\s+(.+)$/);
      if (elementThenTask) {
        return {
          code: elementThenTask[1],
          name: cleanText(elementThenTask[2]),
          evidence: cleanText(elementThenTask[3])
        };
      }

      const codeAndElement = line.match(/^(\d+(?:\.\d+)*)\s+(.+)$/);
      if (codeAndElement) {
        return { code: codeAndElement[1], name: cleanText(codeAndElement[2]), evidence: "" };
      }

      return { code: "", name: line, evidence: "" };
    });
}


function genericSubject(paragraphs: string[], rows: string[][]) {
  const labelled = paragraphLabelValue(paragraphs, ["Subject"]) || valueAfterLabel(rows, ["Subject"]);
  if (labelled) return labelled;

  for (const line of paragraphs.slice(0, 5)) {
    const context = line.match(/Context for Learning\s*[-–—:]\s*(.+)$/i);
    if (context?.[1]) return cleanText(context[1]);

    const curriculum = line.match(/^(.+?)\s+CURRICULUM\s+MAP$/i);
    if (curriculum?.[1]) return titleCase(cleanText(curriculum[1]));

    const yearHeading = line.match(/^(.+?)\s*[-–—]\s*Year\s*(?:7|8|9|10|11)\b/i);
    if (yearHeading?.[1]) return cleanText(yearHeading[1]);
  }
  return "";
}

function genericTopicFromParagraphs(paragraphs: string[]) {
  for (const line of paragraphs.slice(0, 8)) {
    const yearLine = line.match(/^Year\s*(?:7|8|9|10|11)\s*[|·]\s*(?:Autumn|Spring|Summer)(?:\s+Term)?\s*[|·]\s*(.+)$/i);
    if (yearLine?.[1]) return cleanText(yearLine[1]);
  }
  return "";
}

function paragraphLabelValue(paragraphs: string[], labels: string[]) {
  for (const line of paragraphs) {
    for (const label of labels) {
      const match = line.match(new RegExp("^" + escapeRegex(label) + "\\s*[:\\-]\\s*(.+)$", "i"));
      if (match?.[1]) return cleanText(match[1]);
    }
  }
  return "";
}

function paragraphAfterExactHeading(paragraphs: string[], heading: string) {
  const index = paragraphs.findIndex((line) => normalise(line) === normalise(heading));
  return index >= 0 ? cleanText(paragraphs[index + 1] ?? "") : "";
}

function inferExactProgressionStep(paragraphs: string[]) {
  for (const line of paragraphs) {
    const match = line.match(/^Progression\s*Step\s*[:\-]?\s*([1-5])\s*$/i);
    if (match) return Number(match[1]);
  }
  return null;
}

function genericSkills(paragraphs: string[], rows: string[][]) {
  const found: Array<{ frameworkType: string; code: string; name: string; evidence: string }> = [];
  const add = (frameworkType: string, code: string, evidence: string, name = "") => {
    if (!code || !frameworkType) return;
    if (found.some((item) => item.frameworkType === frameworkType && item.code === code && item.evidence === evidence)) return;
    found.push({ frameworkType, code, name, evidence });
  };

  // Table layouts: Framework | Code | task
  for (const row of rows) {
    if (row.length < 2) continue;
    const framework = canonicalFramework(row[0] ?? "");
    const code = (row[1] ?? "").match(/^\s*(\d+(?:\.\d+)*)\s*$/)?.[1];
    if (framework && code) add(framework, code, cleanText(row.slice(2).filter(Boolean).join(" ")));
  }

  // Table layouts: Reference | Activity/evidence, e.g. "Literacy 2.4".
  for (const row of rows) {
    const ref = (row[0] ?? "").match(/^\s*(Literacy|Numeracy|Digital Competence|DCF)\s+(\d+(?:\.\d+)*)\s*$/i);
    if (ref) add(canonicalFramework(ref[1]), ref[2], cleanText(row.slice(1).filter(Boolean).join(" ")));
  }

  let currentFramework = "";
  for (const line of paragraphs) {
    const exactFramework = canonicalFramework(line);
    if (exactFramework) {
      currentFramework = exactFramework;
      continue;
    }
    if (/cross-cutting themes|curriculum intent|links within|links across/i.test(line)) currentFramework = "";

    const inline = line.match(/^\s*(Literacy|Numeracy|Digital Competence|DCF)\s+(\d+(?:\.\d+)*)\s*[–—-]\s*(.+)$/i);
    if (inline) {
      add(canonicalFramework(inline[1]), inline[2], cleanText(inline[3]));
      continue;
    }

    const coded = line.match(/^\s*(\d+(?:\.\d+)*)\s*[–—-]\s*(.+)$/);
    if (currentFramework && coded) add(currentFramework, coded[1], cleanText(coded[2]));
  }
  return found;
}

function genericThemes(paragraphs: string[]) {
  const found: Array<{ canonical: string; evidence: string }> = [];
  const aliases = [
    { names: ["Diversity, Representation and Inclusion", "Diversity"], canonical: "Diversity" },
    { names: ["Careers and Work Related Experiences", "Careers and work-related experiences"], canonical: "Careers and work-related experiences" },
    { names: ["Relationships and Sexuality Education (RSE)", "Relationships and sexuality education", "RSE"], canonical: "Relationships and sexuality education" },
    { names: ["Human Rights and UNCRC/D", "Human rights education"], canonical: "Human rights education" },
    { names: ["Local, National and International Contexts, Including Wales", "Local, national and international contexts"], canonical: "Local, national and international contexts" }
  ];

  for (const line of paragraphs) {
    for (const alias of aliases) {
      for (const name of alias.names) {
        const match = line.match(new RegExp("^" + escapeRegex(name) + "\\s*[:–—-]\s*(.+)$", "i"));
        if (match?.[1]) {
          found.push({ canonical: alias.canonical, evidence: cleanText(match[1]) });
          break;
        }
      }
    }
  }
  return found;
}

function canonicalFramework(value: string) {
  const text = normalise(value);
  if (text === "literacy") return "Literacy";
  if (text === "numeracy") return "Numeracy";
  if (text === "digital competence" || text === "dcf") return "DCF";
  return "";
}

function titleCase(value: string) {
  return value.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
}

function inferYearGroup(value: string) {
  const match = value.match(/(?:Year\s*)?Y?\s*(7|8|9|10|11)\b/i);
  return match ? `Year ${match[1]}` : "";
}

function inferExplicitProgressionStep(fields: string[]) {
  const text = fields.filter(Boolean).join(" ");
  const explicit =
    text.match(/\bprogression\s*step\s*[:\-]?\s*([1-5])\b/i) ??
    text.match(/\bPS\s*([1-5])\b/i);
  return explicit ? Number(explicit[1]) : null;
}

function defaultProgressionStep(yearGroup: string) {
  const year = Number(yearGroup.match(/\d+/)?.[0]);
  if (year >= 7 && year <= 9) return 4;
  if (year >= 10) return 5;
  return null;
}

function inferKeyStage(yearGroup: string) {
  const year = Number(yearGroup.match(/\d+/)?.[0]);
  if (year >= 7 && year <= 9) return "Key Stage 3";
  if (year >= 10 && year <= 11) return "Key Stage 4";
  return "";
}

function inferTerm(value: string) {
  const text = value.toLowerCase();
  if (text.includes("autumn")) return "Autumn";
  if (text.includes("spring")) return "Spring";
  if (text.includes("summer")) return "Summer";
  return "";
}

function cleanText(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/[\t\r\f ]+/g, " ").trim();
}

function cleanCell(value: string) {
  return value
    .split(/\n+/)
    .map(cleanText)
    .filter(Boolean)
    .join("\n");
}

function normalise(value: string) {
  return cleanText(value).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
}

function toCsv(rows: CsvRow[]) {
  const headers = [
    "subject",
    "year_group",
    "term",
    "module_code",
    "module_title",
    "curriculum_intent",
    "framework_type",
    "strand_name",
    "element_name",
    "skill_code",
    "progression_step",
    "mapping_description",
    "notes",
    "cross_cutting_theme_focus",
    "key_stage",
    "links_within_aole",
    "links_across_aoles",
    "subject_content_knowledge",
    "subject_concepts_skills",
    "learning_outcomes",
    "source_file"
  ];
  return [headers, ...rows.map((row) => headers.map((header) => row[header] ?? ""))]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");
}

function csvCell(value: string) {
  const escaped = String(value ?? "").replace(/"/g, '""');
  return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
}


async function readZipEntry(bytes: Uint8Array, wantedName: string) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocd = findSignature(view, 0x06054b50, Math.max(0, bytes.byteLength - 65557), bytes.byteLength - 22);
  if (eocd < 0) throw new Error("ZIP end record not found.");
  const centralOffset = view.getUint32(eocd + 16, true);
  const entryCount = view.getUint16(eocd + 10, true);
  let cursor = centralOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(cursor, true) !== 0x02014b50) throw new Error("Invalid ZIP central directory.");
    const compression = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const fileNameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(cursor + 46, cursor + 46 + fileNameLength));

    if (name === wantedName) {
      if (view.getUint32(localOffset, true) !== 0x04034b50) throw new Error("Invalid ZIP local header.");
      const localNameLength = view.getUint16(localOffset + 26, true);
      const localExtraLength = view.getUint16(localOffset + 28, true);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = bytes.slice(dataStart, dataStart + compressedSize);
      if (compression === 0) return compressed;
      if (compression !== 8) throw new Error("Unsupported DOCX compression method.");
      if (typeof DecompressionStream === "undefined") throw new Error("This browser cannot decompress DOCX files.");
      const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    }

    cursor += 46 + fileNameLength + extraLength + commentLength;
  }

  throw new Error(`ZIP entry not found: ${wantedName}`);
}

function findSignature(view: DataView, signature: number, start: number, end: number) {
  for (let offset = end; offset >= start; offset -= 1) {
    if (view.getUint32(offset, true) === signature) return offset;
  }
  return -1;
}
