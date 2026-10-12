import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as metadata from "../lib/cflMetadata.ts";

const { resolveCflSubject, explicitCflTerm } = metadata;
for (const [sequence, term] of [["8.1 & 8.2", "Autumn"], ["GERMAN Y8.3 & Y8.4", "Spring"], ["8.5 & 8.6", "Summer"], ["Year 7.2", "Autumn"], ["9.4", "Spring"]]) {
  assert.equal(metadata.sequenceCflTerm(sequence), term);
}
assert.equal(metadata.sequenceCflTerm("", "German 8.5 & 8.6.docx"), "Summer");
for (const sequence of ["8.2 & 8.3", "8.1 - 8.6", "8.7", "8.12", "Year 8", "Step 4", "2026.1"]) {
  assert.equal(metadata.sequenceCflTerm(sequence), "", `Do not guess ambiguous or invalid sequence ${sequence}`);
}
assert.equal(resolveCflSubject("International Languages", "Context for Learning German 8.5 & 8.6.docx"), "German");
assert.equal(resolveCflSubject("International Languages", "Context for Learning French 7.1.docx"), "French");
assert.equal(resolveCflSubject("International Languages - German", "Unit.docx"), "German");
assert.equal(resolveCflSubject("International Languages", "Unit.docx", "French conversation"), "French");
assert.equal(resolveCflSubject("International Languages", "French and German.docx"), "International Languages");
assert.equal(resolveCflSubject("International Languages", "Unit.docx"), "International Languages");
assert.equal(resolveCflSubject("International Languages - French", "German.docx"), "International Languages - French");
assert.equal(resolveCflSubject("History", "German history.docx"), "History");
assert.equal(resolveCflSubject("French", "German.docx"), "French", "An explicit subject is not overwritten by a filename");
assert.equal(explicitCflTerm("German 8.5 & 8.6.docx"), "", "Module numbers must not invent a term");
assert.equal(explicitCflTerm("Summer term 2"), "Summer");
assert.equal(explicitCflTerm("Autumn and Spring"), "");

const exports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync("app/api/admin/curriculum-import/route.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText + "\nexports.preview = buildPreview; exports.match = matchFrameworkLink; exports.matchText = matchFrameworkTextLinks;", {
  exports, require(name) {
    if (name === "next/server") return {};
    if (name.endsWith("_helpers")) return {};
    if (name.endsWith("cflMetadata")) return metadata;
    throw new Error(`Unexpected import: ${name}`);
  }
});
const refs = { subjects: [{ id: "fr", name: "French" }, { id: "de", name: "German" }, { id: "dt", name: "DT" }, { id: "ma", name: "Maths" }], frameworks: [], strands: [], elements: [], descriptors: [], themes: [], themeElements: [], existingMappings: [] };
const row = (subject, source, term = "Autumn") => [subject, "Year 8", term, "8.5", "Conversations", "Practise speaking", source];
const csv = rows => [["subject", "year_group", "term", "module_code", "module_title", "curriculum_intent", "source_file"], ...rows].map(r => r.map(c => `"${c.replaceAll('"', '""')}"`).join(",")).join("\n");
const batch = exports.preview(csv([row("International Languages", "German.docx"), row("International Languages", "French.docx")]), refs);
assert.equal(batch.groups.length, 2);
assert.equal(batch.groups[0].subject, "German");
assert.equal(batch.groups[1].subject, "French");
assert.equal(batch.summary.errors, 0);
const ambiguousCsv = csv([row("International Languages", "Languages.docx", "")]);
assert.ok(exports.preview(ambiguousCsv, refs).groups[0].errors.some(e => e.includes("select French or German")));
const corrected = exports.preview(ambiguousCsv, refs, { "Languages.docx": { subject: "German", term: "Summer" } });
assert.equal(corrected.summary.errors, 0);
assert.equal(corrected.groups[0].term, "Summer");
assert.equal(corrected.groups[0].subjectId, "de");
assert.ok(exports.preview(ambiguousCsv, refs, { "Other.docx": { subject: "German", term: "Summer" } }).summary.errors > 0);
assert.ok(exports.preview(ambiguousCsv, refs, { "Languages.docx": { subject: "Unknown", term: "Invalid" } }).summary.errors > 0);
assert.equal(exports.preview(csv([row("International Languages", "German Summer.docx", "")]), refs).summary.errors, 0);
for (const [modules, term] of [["8.1 & 8.2", "Autumn"], ["8.3 & 8.4", "Spring"], ["8.5 & 8.6", "Summer"]]) {
  const source = `Context for Learning German ${modules}.docx`;
  const input = row("International Languages", source, "");
  input[3] = `GERMAN Y${modules}`;
  const result = exports.preview(csv([input]), refs);
  assert.equal(result.summary.errors, 0);
  assert.equal(result.groups[0].subject, "German");
  assert.equal(result.groups[0].term, term);
  assert.equal(exports.preview(csv([input]), refs, { [source]: { term: "Spring" } }).groups[0].term, "Spring");
}
assert.equal(exports.preview(csv([row("German", "German 8.5.docx", "Autumn")]), refs).groups[0].term, "Autumn", "Explicit terms take priority over module numbers");
for (const name of ["ST", "D & T", "Design Technology"]) assert.equal(exports.preview(csv([row(name, "Technology.docx")]), refs).groups[0].subjectId, "dt");
assert.equal(exports.preview(csv([row("Mathematics", "Maths.docx")]), refs).groups[0].subjectId, "ma");
console.log("Passed: French/German resolution, mixed batches, ambiguous-language safety, per-file corrections, explicit terms and existing subject aliases.");

const literacyRefs = {
  ...refs,
  frameworks: [{ id: "lit", name: "Literacy Framework", short_name: "Literacy" }, { id: "num", name: "Numeracy Framework", short_name: "Numeracy" }],
  strands: [{ id: "trans", framework_id: "lit", name: "Translanguaging", display_order: 1 }, { id: "writing", framework_id: "lit", name: "Writing", display_order: 5 }, { id: "number", framework_id: "num", name: "Number", display_order: 1 }],
  elements: [{ id: "trans-element", strand_id: "trans", name: "1.1 Translanguaging", display_order: 1 }, { id: "vocab", strand_id: "writing", name: "Vocabulary", display_order: 1 }, { id: "number-element", strand_id: "number", name: "Number", display_order: 1 }],
  descriptors: [{ id: "trans-step4", element_id: "trans-element", progression_step: 4, descriptor_text: "Translanguaging evidence" }]
};
const literacyRow = { framework_type: "Literacy", strand_name: "Literacy - Writing", element_name: "Translanguaging", year_group: "Year 8" };
for (const code of ["1.1", "5.1", "5.9", "99.1", "", "invalid"]) {
  const result = exports.match({ ...literacyRow, skill_code: code }, literacyRefs, 22, "Original teaching evidence");
  assert.equal(result.link?.elementId, "trans-element", `Translanguaging must override code ${code}`);
  assert.equal(result.link.strandId, "trans");
  assert.equal(result.link.progressionDescriptorId, "trans-step4");
  assert.equal(result.link.notes, "Original teaching evidence");
  assert.equal(result.unresolved.length, 0);
}
assert.equal(exports.match({ ...literacyRow, element_name: " 5.1 TRANSLANGUAGING ", skill_code: "5.1" }, literacyRefs, 22, "").link.elementId, "trans-element");
assert.equal(exports.match({ ...literacyRow, element_name: "", strand_name: "Literacy - Translanguaging", skill_code: "5.1" }, literacyRefs, 22, "").link.elementId, "trans-element");
assert.equal(exports.match({ ...literacyRow, element_name: "Local wording", skill_code: "5.1" }, literacyRefs, 22, "").link.elementId, "vocab", "Other skills keep code-first matching");
assert.equal(exports.match({ ...literacyRow, framework_type: "Numeracy", strand_name: "Number", skill_code: "1.1" }, literacyRefs, 22, "").link.elementId, "number-element", "Do not cross framework boundaries");
for (const elements of [literacyRefs.elements.slice(1), [...literacyRefs.elements, { ...literacyRefs.elements[0], id: "duplicate" }]]) {
  const result = exports.match({ ...literacyRow, skill_code: "5.1" }, { ...literacyRefs, elements }, 22, "");
  assert.equal(result.link, null, "Missing or ambiguous Translanguaging must not silently map to Writing");
  assert.equal(result.unresolved.length, 1);
}
console.log("Passed: Translanguaging name overrides incorrect codes, preserves evidence/progression, and leaves other skill matching unchanged.");

const docxExports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync("lib/cflDocx.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText + "\nexports.parseSkills = parseSkillLines; exports.toCsv = toCsv;", {
  exports: docxExports, require() { return metadata; }
});
const listedSkills = docxExports.parseSkills("We cover the whole of the literacy framework with two exceptions (2.4,5.4).\nReading: 3.2, 3.3\nWriting: 5.1, 5.2, 5.3, 5.5").filter(skill => skill.code);
assert.equal(listedSkills.map(skill => skill.code).join(","), "3.2,3.3,5.1,5.2,5.3,5.5");
assert.equal(listedSkills[0].evidence, "Reading: 3.2, 3.3");
assert.equal(docxExports.parseSkills("Reading:\n3.2, 3.3\nWriting:\n5.1, 5.2, 5.3, 5.5").filter(skill => skill.code).map(skill => skill.code).join(","), "3.2,3.3,5.1,5.2,5.3,5.5");
assert.equal(docxExports.parseSkills("3.1 - Magnification calculations")[0].evidence, "Magnification calculations");
assert.equal(docxExports.parseSkills("5.1 Translanguaging")[0].name, "Translanguaging");
assert.equal(docxExports.parseSkills("Reading: except 3.2, 3.3").filter(skill => skill.code).length, 0);
console.log("Passed: explicit strand/code lists are extracted without mapping excluded skills or inventing coverage from prose.");

assert.equal(docxExports.parseSkills("2.1, 2.2, 2.3, 3.1, 3.2, ").filter(skill => skill.code).map(skill => skill.code).join(","), "2.1,2.2,2.3,3.1,3.2");
const dcfNames = ["Collaboration", "Sourcing, searching and planning digital content", "Creating digital content"];
const seed = fs.readFileSync("supabase/reset_and_seed_curriculum_frameworks.sql", "utf8");
const descriptors = [...seed.matchAll(/\('([^']+)', (\d), \$dcf\$([\s\S]*?)\$dcf\$\)/g)]
  .filter(([,name,step]) => dcfNames.includes(name) && step === "4")
  .map(([,name,step,text]) => ({id:`${name}-step4`,element_id:name,progression_step:Number(step),descriptor_text:text}));
assert.equal(descriptors.length, 3);
const dcfRefs = { ...refs,
  frameworks: [{id:"dcf",name:"Digital Competence Framework",short_name:"DCF"}],
  strands: [{id:"collaborating",framework_id:"dcf",name:"Interacting and collaborating",display_order:2},{id:"producing",framework_id:"dcf",name:"Producing",display_order:3}],
  elements: dcfNames.map((name,i) => ({id:name,name,strand_id:i===0?"collaborating":"producing",display_order:i===0?2:i})),
  descriptors
};
const quoted = descriptors.map(d => d.descriptor_text.split(" I can explore and develop")[0]).join("\n\n");
const textRow = {framework_type:"DCF",framework_text:quoted,progression_step:"4"};
const match = exports.matchText(textRow,dcfRefs,2,quoted);
assert.equal(match.links.length,3);
assert.equal(match.unresolved.length,0);
assert.ok(match.links.every(link=>link.progressionStep===4 && link.notes===quoted));
assert.ok(match.links.some(link=>link.label.includes("2.2 Collaboration")));
assert.equal(exports.matchText({...textRow,framework_text:quoted.replaceAll(".",". \n").replaceAll(" ","  ")},dcfRefs,2,"").links.length,3);
assert.equal(exports.matchText({...textRow,framework_text:"In Summer Term - Group DCF project"},dcfRefs,2,"").links.length,0);
assert.equal(exports.matchText({...textRow,framework_text:"In Summer Term - Group DCF project"},dcfRefs,2,"").unresolved.length,1);
assert.equal(exports.matchText({...textRow,framework_text:quoted+"\nI can do something not described in the framework."},dcfRefs,2,"").unresolved.length,1);
const ambiguousRefs={...dcfRefs,descriptors:[...descriptors,{...descriptors[0],id:"ambiguous",element_id:dcfNames[1]}]};
assert.ok(exports.matchText({...textRow,framework_text:descriptors[0].descriptor_text},ambiguousRefs,2,"").unresolved.length>0);
assert.equal(exports.matchText({...textRow,framework_text:descriptors[0].descriptor_text},ambiguousRefs,2,"").links.length,0);
const otherStepRefs={...dcfRefs,descriptors:[...descriptors,{...descriptors[0],id:"step5",progression_step:5}]};
assert.equal(exports.matchText({...textRow,framework_text:descriptors[0].descriptor_text},otherStepRefs,2,"").links[0].progressionStep,4);
assert.equal(exports.matchText({...textRow,framework_text:descriptors[0].descriptor_text,progression_step:""},otherStepRefs,2,"").links.length,0);
const fullCsv=docxExports.toCsv([{subject:"German",year_group:"Year 8",term:"Spring",module_code:"8.3 & 8.4",module_title:"School life",curriculum_intent:"Research project",...textRow}]);
const preview=exports.preview(fullCsv,dcfRefs);
assert.equal(preview.summary.errors,0);
assert.equal(preview.summary.frameworkLinksToCreate,3,"Word conversion must pass wording through to server preview");
const flexibleExports={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync("lib/cflFlexibleFiles.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText+"\nexports.headers=HEADERS;",{exports:flexibleExports});
assert.equal(fullCsv.split("\n")[0],flexibleExports.headers.join(","),"Mixed-format batches must retain identical column order");
console.log("Passed: stored DCF descriptor wording, multi-element matching, punctuation tolerance, progression disambiguation, partial/unmatched warnings and mixed-format CSV transport.");

const collage="Creating digital content - Pupils can use a variety of tools to add multi media components to enhance their collage of Wales, such as text, images, themes and colours.";
for (const source of [collage,collage.replace(" - ",": "),collage.replace(" - "," \u2013 "),"CREATING DIGITAL CONTENT",`3.2 ${collage}`]) {
  const result=exports.matchText({...textRow,framework_text:source},dcfRefs,22,source);
  assert.equal(result.links.length,1);
  assert.equal(result.links[0].elementId,"Creating digital content");
  assert.ok(result.links[0].label.includes("3.2 Creating digital content"));
  assert.equal(result.links[0].notes,source);
  assert.equal(result.unresolved.length,0);
}
assert.equal(exports.matchText({...textRow,framework_text:"Creating digital content - I can create a collage of Wales."},dcfRefs,22,"").unresolved.length,0);
assert.equal(exports.matchText({...textRow,framework_text:`Creating digital content\n${descriptors[2].descriptor_text}`},dcfRefs,22,"").links.length,1,"Descriptor and heading must not create duplicate links");
assert.equal(exports.matchText({...textRow,framework_text:"We are not creating digital content this term."},dcfRefs,22,"").links.length,0,"Incidental mentions are not element headings");
const duplicateNameRefs={...dcfRefs,elements:[...dcfRefs.elements,{...dcfRefs.elements[2],id:"another-creating"}]};
assert.equal(exports.matchText({...textRow,framework_text:collage},duplicateNameRefs,22,"").links.length,0,"Ambiguous element headings must not guess");
const noStep=exports.matchText({...textRow,framework_text:collage,progression_step:""},dcfRefs,22,"");
assert.equal(noStep.links[0].progressionStep,undefined);
assert.equal(noStep.unresolved.length,1);
assert.equal(exports.matchText({...textRow,framework_text:collage,progression_step:"",year_group:"Year 8"},dcfRefs,22,"").links[0].progressionStep,4);
assert.equal(exports.matchText({...textRow,framework_text:`${collage}\nCollaboration - A shared class presentation.`},dcfRefs,22,"").links.length,2);
console.log("Passed: exact element headings with custom teaching evidence, code labels, ambiguity protection, progression and descriptor deduplication.");
