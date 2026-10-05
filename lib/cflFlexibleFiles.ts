"use client";

import type { CflDocxSummary } from "@/lib/cflDocx";

type CsvRow = Record<string, string>;
type Sheet = { name: string; rows: string[][] };

const HEADERS = [
  "subject","year_group","term","module_code","module_title","curriculum_intent",
  "framework_type","strand_name","element_name","skill_code","progression_step",
  "mapping_description","notes","cross_cutting_theme_focus","key_stage",
  "links_within_aole","links_across_aoles","subject_content_knowledge",
  "subject_concepts_skills","learning_outcomes","source_file"
];

export async function convertCflXlsxToCsv(file: File): Promise<{ csv: string; summary: CflDocxSummary }> {
  const sheets = await readWorkbook(file);
  if (!sheets.length) throw new Error("No readable worksheets were found.");

  const meta = spreadsheetMeta(sheets, file.name);
  const rows = spreadsheetRows(sheets, meta, file.name);
  if (!rows.length) throw new Error("No recognised framework-code rows were found.");

  const warnings: string[] = [];
  if (!meta.subject) warnings.push("Subject could not be identified.");
  if (!meta.yearGroup) warnings.push("Year group could not be identified.");
  if (!meta.term) warnings.push("Term could not be identified.");
  if (!meta.moduleTitle) warnings.push("Topic/module title could not be identified.");

  return {
    csv: toCsv(rows),
    summary: {
      subject: meta.subject,
      yearGroup: meta.yearGroup,
      term: meta.term,
      moduleCode: meta.moduleTitle,
      moduleTitle: meta.moduleTitle,
      skillsFound: rows.filter((row) => Boolean(row.skill_code)).length,
      themesFound: rows.filter((row) => Boolean(row.cross_cutting_theme_focus)).length,
      warnings
    }
  };
}

export async function convertCflPdfToCsv(file: File): Promise<{ csv: string; summary: CflDocxSummary }> {
  const lines = await pdfLines(file);
  if (!lines.length) throw new Error("No selectable text could be extracted from this PDF.");

  const joined = lines.join(" ");
  const heading = lines.find((line) => /curriculum mapping test/i.test(line)) || "";
  const subject = clean((heading.match(/curriculum mapping test\s*[-–—:]\s*(.+)$/i) || [])[1] || "");
  const yearGroup = normaliseYear((joined.match(/\bYear\s*(7|8|9|10|11)\b/i) || [])[0] || "");
  const term = normaliseTerm(joined);
  const moduleTitle = clean(((joined.match(/\bTopic\s*:\s*([^|]+?)(?=\s+Curriculum Intent\b|$)/i) || [])[1]) || "");
  const intent = clean(((joined.match(/\bCurriculum Intent\s+(.+?)(?=\s+(?:Framework|Literacy|Numeracy|Digital Competence)\b)/i) || [])[1]) || moduleTitle);
  const step = defaultStep(yearGroup);
  const common = base(subject, yearGroup, term, moduleTitle, intent, file.name);
  const rows: CsvRow[] = [];

  for (const line of lines) {
    const m = line.match(/^(Literacy|Numeracy|Digital Competence|DCF)\s+(\d+(?:\.\d+)*)\s+(.+)$/i);
    if (m) {
      rows.push({
        ...common,
        framework_type: frameworkName(m[1]),
        skill_code: m[2],
        progression_step: step ? String(step) : "",
        mapping_description: clean(m[3])
      });
    }

    const t = line.match(/^Cross-cutting theme\s*:\s*(.+?)\s+[-–—:]\s+(.+)$/i);
    if (t) {
      rows.push({
        ...common,
        framework_type: "CCT",
        cross_cutting_theme_focus: themeName(t[1]),
        mapping_description: clean(t[2]),
        notes: clean(t[2])
      });
    }
  }

  if (!rows.length) throw new Error("PDF text was readable, but no recognised framework codes were found.");

  const warnings: string[] = [];
  if (!subject) warnings.push("Subject could not be identified.");
  if (!yearGroup) warnings.push("Year group could not be identified.");
  if (!term) warnings.push("Term could not be identified.");
  if (!moduleTitle) warnings.push("Topic/module title could not be identified.");

  return {
    csv: toCsv(rows),
    summary: {
      subject,
      yearGroup,
      term,
      moduleCode: moduleTitle,
      moduleTitle,
      skillsFound: rows.filter((row) => Boolean(row.skill_code)).length,
      themesFound: rows.filter((row) => Boolean(row.cross_cutting_theme_focus)).length,
      warnings
    }
  };
}

async function readWorkbook(file: File): Promise<Sheet[]> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const workbookXml = text(await zipEntry(bytes, "xl/workbook.xml"));
  const relsXml = text(await zipEntry(bytes, "xl/_rels/workbook.xml.rels"));
  const shared = await sharedStrings(bytes);
  const parser = new DOMParser();
  const workbook = parser.parseFromString(workbookXml, "application/xml");
  const rels = parser.parseFromString(relsXml, "application/xml");
  const relMap = new Map<string,string>();

  for (const rel of Array.from(rels.getElementsByTagNameNS("*","Relationship"))) {
    relMap.set(rel.getAttribute("Id") || "", rel.getAttribute("Target") || "");
  }

  const output: Sheet[] = [];
  for (const sheet of Array.from(workbook.getElementsByTagNameNS("*","sheet"))) {
    const name = sheet.getAttribute("name") || "Sheet";
    const rid = sheet.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships","id") || sheet.getAttribute("r:id") || "";
    const target = relMap.get(rid);
    if (!target) continue;
    try {
      const xml = text(await zipEntry(bytes, zipPath("xl",target)));
      output.push({ name, rows: worksheetRows(xml, shared) });
    } catch {}
  }
  return output;
}

async function sharedStrings(bytes: Uint8Array) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text(await zipEntry(bytes,"xl/sharedStrings.xml")),"application/xml");
    return Array.from(doc.getElementsByTagNameNS("*","si")).map((si) =>
      Array.from(si.getElementsByTagNameNS("*","t")).map((n) => n.textContent || "").join("")
    );
  } catch { return [] as string[]; }
}

function worksheetRows(xml: string, shared: string[]) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml,"application/xml");
  const rows: string[][] = [];
  for (const row of Array.from(doc.getElementsByTagNameNS("*","row"))) {
    const cells: string[] = [];
    for (const cell of Array.from(row.getElementsByTagNameNS("*","c"))) {
      const col = column(cell.getAttribute("r") || "A1");
      const type = cell.getAttribute("t") || "";
      let value = "";
      if (type === "inlineStr") value = Array.from(cell.getElementsByTagNameNS("*","t")).map((n) => n.textContent || "").join("");
      else {
        const raw = cell.getElementsByTagNameNS("*","v")[0]?.textContent || "";
        value = type === "s" ? (shared[Number(raw)] || "") : raw;
      }
      while (cells.length <= col) cells.push("");
      cells[col] = clean(value);
    }
    rows.push(cells);
  }
  return rows;
}

function spreadsheetMeta(sheets: Sheet[], fileName: string) {
  let subject = "", yearGroup = "", term = "", moduleTitle = "", curriculumIntent = "";

  for (const sheet of sheets) {
    for (const row of sheet.rows) {
      const joined = norm(row.join(" "));
      const looksLikeRowHeader = joined.includes("subject") && joined.includes("year") && (joined.includes("framework") || joined.includes("topic"));
      if (looksLikeRowHeader) continue;
      subject ||= beside(row,["Subject"]);
      yearGroup ||= normaliseYear(beside(row,["Year","Year Group"]));
      term ||= normaliseTerm(beside(row,["Term"]));
      moduleTitle ||= beside(row,["Topic","Module"]);
      curriculumIntent ||= beside(row,["Curriculum Intent"]);
    }

    const h = sheet.rows.findIndex((row) => norm(row.join(" ")).includes("subject") && norm(row.join(" ")).includes("year"));
    if (h >= 0) {
      const headers = sheet.rows[h].map(norm);
      const data = sheet.rows.slice(h+1).find((row) => row.some((v) => clean(v)));
      if (data) {
        subject ||= fromHeader(headers,data,["subject"]);
        yearGroup ||= normaliseYear(fromHeader(headers,data,["year group","year"]));
        term ||= normaliseTerm(fromHeader(headers,data,["term"]));
        moduleTitle ||= fromHeader(headers,data,["topic","module","title"]);
      }
    }
  }

  yearGroup ||= normaliseYear(fileName);
  curriculumIntent ||= moduleTitle;
  return { subject, yearGroup, term, moduleTitle, curriculumIntent };
}

function spreadsheetRows(sheets: Sheet[], meta: any, sourceFile: string) {
  const out: CsvRow[] = [];
  for (const sheet of sheets) {
    const headerIndex = sheet.rows.findIndex((row) => {
      const n = row.map(norm);
      return n.includes("framework") && n.includes("code");
    });
    if (headerIndex < 0) continue;

    const headers = sheet.rows[headerIndex].map(norm);
    for (const row of sheet.rows.slice(headerIndex+1)) {
      if (!row.some((v) => clean(v))) continue;
      const subject = fromHeader(headers,row,["subject"]) || meta.subject;
      const yearGroup = normaliseYear(fromHeader(headers,row,["year group","year"]) || meta.yearGroup);
      const term = normaliseTerm(fromHeader(headers,row,["term"]) || meta.term);
      const topic = fromHeader(headers,row,["topic","module","title"]) || meta.moduleTitle;
      const framework = fromHeader(headers,row,["framework"]);
      const code = fromHeader(headers,row,["code"]);
      const evidence = fromHeader(headers,row,["task / evidence","task evidence","what pupils do"]);
      const theme = fromHeader(headers,row,["cross-cutting theme","theme"]);
      const common = base(subject,yearGroup,term,topic,meta.curriculumIntent || topic,sourceFile);

      if (framework && code) out.push({
        ...common,
        framework_type: frameworkName(framework),
        skill_code: code,
        progression_step: String(defaultStep(yearGroup) || ""),
        mapping_description: evidence
      });
      else if (theme) out.push({
        ...common,
        framework_type: "CCT",
        cross_cutting_theme_focus: themeName(theme),
        mapping_description: evidence,
        notes: evidence
      });
    }
  }
  return out;
}

function base(subject:string,yearGroup:string,term:string,moduleTitle:string,intent:string,sourceFile:string): CsvRow {
  return {
    subject, year_group:yearGroup, term, module_code:moduleTitle, module_title:moduleTitle,
    curriculum_intent:intent, framework_type:"", strand_name:"", element_name:"",
    skill_code:"", progression_step:"", mapping_description:"", notes:"",
    cross_cutting_theme_focus:"", key_stage:keyStage(yearGroup), links_within_aole:"",
    links_across_aoles:"", subject_content_knowledge:"", subject_concepts_skills:"",
    learning_outcomes:"", source_file:sourceFile
  };
}

function toCsv(rows: CsvRow[]) {
  return [HEADERS,...rows.map((row) => HEADERS.map((h) => row[h] || ""))]
    .map((row) => row.map(csvCell).join(",")).join("\n");
}
function csvCell(value:string) {
  const v=String(value||"").replace(/"/g,'""');
  return /[",\n\r]/.test(v) ? '"' + v + '"' : v;
}
function frameworkName(v:string) {
  const n=norm(v);
  if (n.includes("digital") || n==="dcf") return "DCF";
  if (n.includes("literacy")) return "Literacy";
  if (n.includes("numeracy")) return "Numeracy";
  return clean(v);
}
function themeName(v:string) {
  const n=norm(v);
  if (n.includes("career")) return "Careers and work-related experiences";
  if (n.includes("diversity") || n.includes("representation") || n.includes("inclusion")) return "Diversity";
  if (n.includes("relationship") || n==="rse") return "Relationships and sexuality education";
  if (n.includes("human rights") || n.includes("uncrc")) return "Human rights education";
  if (n.includes("local") || n.includes("national") || n.includes("international") || n.includes("wales")) return "Local, national and international contexts";
  return clean(v);
}
function normaliseYear(v:string) {
  const m=v.match(/(?:Year\s*)?Y?\s*(7|8|9|10|11)\b/i);
  return m ? "Year " + m[1] : "";
}
function normaliseTerm(v:string) {
  const n=v.toLowerCase();
  if (n.includes("autumn")) return "Autumn";
  if (n.includes("spring")) return "Spring";
  if (n.includes("summer")) return "Summer";
  return "";
}
function defaultStep(y:string) {
  const n=Number((y.match(/\d+/)||[])[0]);
  if (n>=7 && n<=9) return 4;
  if (n>=10) return 5;
  return null;
}
function keyStage(y:string) {
  const n=Number((y.match(/\d+/)||[])[0]);
  if (n>=7 && n<=9) return "Key Stage 3";
  if (n>=10) return "Key Stage 4";
  return "";
}
function beside(row:string[],labels:string[]) {
  for (let i=0;i<row.length;i++) {
    if (!labels.map(norm).includes(norm(row[i]||""))) continue;
    for (let j=i+1;j<row.length;j++) if (clean(row[j])) return clean(row[j]);
  }
  return "";
}
function fromHeader(headers:string[],row:string[],names:string[]) {
  for (const name of names) {
    const i=headers.indexOf(norm(name));
    if (i>=0) return clean(row[i]||"");
  }
  return "";
}
function clean(v:string) { return String(v||"").replace(/\u00a0/g," ").replace(/\s+/g," ").trim(); }
function norm(v:string) { return clean(v).toLowerCase().replace(/&/g," and ").replace(/[^a-z0-9/]+/g," ").trim(); }

async function pdfLines(file:File) {
  const dynamicImport = new Function("u","return import(u)") as (u:string)=>Promise<any>;
  const pdfjs = await dynamicImport("https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc="https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";
  const pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
  const result:string[]=[];
  for (let p=1;p<=pdf.numPages;p++) {
    const page=await pdf.getPage(p);
    const content=await page.getTextContent();
    const groups=new Map<number,Array<{x:number,str:string}>>();
    for (const item of content.items as any[]) {
      if (!item.str) continue;
      const y=Math.round(Number(item.transform?.[5]||0)/3)*3;
      const list=groups.get(y)||[];
      list.push({x:Number(item.transform?.[4]||0),str:String(item.str)});
      groups.set(y,list);
    }
    result.push(...[...groups.entries()].sort((a,b)=>b[0]-a[0]).map(([,list])=>clean(list.sort((a,b)=>a.x-b.x).map((v)=>v.str).join(" "))).filter(Boolean));
  }
  return result;
}

async function zipEntry(bytes:Uint8Array,nameWanted:string) {
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const eocd=findSig(view,0x06054b50,Math.max(0,bytes.byteLength-65557),bytes.byteLength-22);
  if (eocd<0) throw new Error("ZIP end record not found.");
  const offset=view.getUint32(eocd+16,true), count=view.getUint16(eocd+10,true);
  let cursor=offset;
  for (let i=0;i<count;i++) {
    if (view.getUint32(cursor,true)!==0x02014b50) throw new Error("Invalid ZIP directory.");
    const compression=view.getUint16(cursor+10,true), size=view.getUint32(cursor+20,true);
    const nameLen=view.getUint16(cursor+28,true), extra=view.getUint16(cursor+30,true), comment=view.getUint16(cursor+32,true);
    const local=view.getUint32(cursor+42,true);
    const name=new TextDecoder().decode(bytes.subarray(cursor+46,cursor+46+nameLen));
    if (name===nameWanted) {
      const localName=view.getUint16(local+26,true), localExtra=view.getUint16(local+28,true);
      const start=local+30+localName+localExtra, compressed=bytes.slice(start,start+size);
      if (compression===0) return compressed;
      if (compression!==8) throw new Error("Unsupported ZIP compression.");
      const stream=new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    }
    cursor+=46+nameLen+extra+comment;
  }
  throw new Error("ZIP entry not found: "+nameWanted);
}
function findSig(view:DataView,sig:number,start:number,end:number) {
  for (let i=end;i>=start;i--) if (view.getUint32(i,true)===sig) return i;
  return -1;
}
function text(bytes:Uint8Array) { return new TextDecoder().decode(bytes); }
function zipPath(base:string,target:string) {
  const stack:string[]=[];
  const raw = target.startsWith("/") ? target : (base + "/" + target);
  for (const part of raw.split("/")) {
    if (!part || part===".") continue;
    if (part==="..") stack.pop(); else stack.push(part);
  }
  return stack.join("/");
}
function column(ref:string) {
  const letters=(ref.match(/^[A-Z]+/i)||["A"])[0].toUpperCase();
  let n=0; for (const ch of letters) n=n*26+ch.charCodeAt(0)-64;
  return Math.max(0,n-1);
}
