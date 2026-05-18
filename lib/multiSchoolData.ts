import * as base from "@/lib/fakeData";
import { suggestedProgressionForYear } from "@/lib/progression";
import type { AoleConfig, Card, Dashboard, ElementCoverageRow, FrameworkCoverage, FrameworkDefinition, MappingEntry, School, SubjectConfig, SubjectDetail, SubjectOverview } from "@/lib/types";

export type SchoolDataBundle = {
  schoolId: string;
  faculties: string[];
  departments: string[];
  subjects: string[];
  subjectConfigs: SubjectConfig[];
  aoleOptions: string[];
  aoleConfigs: AoleConfig[];
  subjectAoleMap: Record<string, string | undefined>;
  yearGroups: string[];
  terms: string[];
  frameworkLibrary: FrameworkDefinition[];
  frameworkMap: Record<string, Record<string, string[]>>;
  mappings: MappingEntry[];
  frameworkCoverage: Record<string, FrameworkCoverage>;
  wholeSchoolDashboard: Dashboard;
  literacyDashboard: Dashboard;
  numeracyDashboard: Dashboard;
  dcfDashboard: Dashboard;
  themesDashboard: Dashboard;
  subjectOverviews: SubjectOverview[];
  subjectDetails: Record<string, SubjectDetail>;
  subjectProfiles: Record<string, { cards: Card[]; rows: string[]; columns: string[]; values: number[][]; notes: string[] }>;
};

export const defaultSchoolId = "school_caerleon";

export const sampleSchools: School[] = [
  {
    id: defaultSchoolId,
    slug: "caerleon",
    name: "Caerleon Comprehensive School",
    motto: "Maximising Potential",
    logoUrl: "/schlogo.png",
    primaryColour: "#741B47",
    secondaryColour: "#571435",
    active: true,
    createdAt: "2026-01-01"
  },
  {
    id: "school_newportsample",
    slug: "newportsample",
    name: "Newport Sample School",
    motto: "Learning Together",
    logoUrl: "/schlogo.png",
    primaryColour: "#1D3557",
    secondaryColour: "#0F2238",
    active: true,
    createdAt: "2026-02-01"
  }
];

const newportSubjects: SubjectConfig[] = [
  subject("English", "Languages, Literacy and Communication", 1, "school_newportsample"),
  subject("Maths", "Mathematics and Numeracy", 2, "school_newportsample"),
  subject("Science", "Science and Technology", 3, "school_newportsample"),
  subject("Humanities", "Humanities", 4, "school_newportsample"),
  subject("Languages", "Languages, Literacy and Communication", 5, "school_newportsample"),
  subject("Technology", "Science and Technology", 6, "school_newportsample"),
  subject("Expressive Arts", "Expressive Arts", 7, "school_newportsample"),
  subject("Health and Well-being", "Health and Well-being", 8, "school_newportsample")
];

const newportMappings: MappingEntry[] = [
  entry("school_newportsample", "English", "Literacy", "Reading", "Comparing sources", "Year 7", "Autumn", "Local news and viewpoint", "Pupils compare local news reports and identify how language choices shape viewpoint.", "ENG-Y7-A1", "2026-05-02"),
  entry("school_newportsample", "English", "Literacy", "Oracy", "Presenting information", "Year 9", "Spring", "Spoken language campaign", "Pupils present a short campaign speech using evidence and audience-aware language.", "ENG-Y9-S2", "2026-04-20"),
  entry("school_newportsample", "Maths", "Numeracy", "Using data skills", "Representing data", "Year 8", "Autumn", "Transport data dashboard", "Pupils choose charts to represent transport survey results and explain their choices.", "MAT-Y8-A1", "2026-03-15"),
  entry("school_newportsample", "Maths", "Numeracy", "Using number skills", "Financial contexts", "Year 10", "Summer", "Personal finance choices", "Pupils compare savings options and explain financial decisions using calculations.", "MAT-Y10-S1", "2026-05-05"),
  entry("school_newportsample", "Science", "Numeracy", "Using data skills", "Interpreting trends", "Year 9", "Spring", "Rates practical", "Pupils interpret practical graph trends and connect anomalies to method choices.", "SCI-Y9-S2", "2026-04-16"),
  entry("school_newportsample", "Science", "Digital Competence Framework", "Data and computational thinking", "Data handling", "Year 8", "Summer", "Spreadsheet practical log", "Pupils structure practical readings in a spreadsheet and use formulae to compare results.", "SCI-Y8-SU1", "2026-05-09"),
  entry("school_newportsample", "Humanities", "Literacy", "Reading", "Inference and deduction", "Year 8", "Spring", "Migration stories", "Pupils infer attitudes from oral history extracts and justify interpretations with evidence.", "HUM-Y8-S2", "2026-04-12"),
  entry("school_newportsample", "Humanities", "Cross-cutting Themes", "Human rights", "Voice and participation", "Year 9", "Summer", "Community decision-making", "Pupils review consultation examples and plan how young people can contribute views.", "HUM-Y9-SU1", "2026-05-11"),
  entry("school_newportsample", "Languages", "Literacy", "Writing", "Audience and purpose", "Year 10", "Autumn", "Cultural exchange email", "Pupils write for a partner school audience and adapt language to purpose.", "LAN-Y10-A1", "2026-02-17"),
  entry("school_newportsample", "Technology", "Digital Competence Framework", "Producing", "Planning digital products", "Year 7", "Autumn", "App wireframe", "Pupils create wireframes for a school information app and annotate audience needs.", "TEC-Y7-A1", "2026-03-22"),
  entry("school_newportsample", "Technology", "Digital Competence Framework", "Producing", "Evaluating outputs", "Year 10", "Spring", "Prototype review", "Pupils test digital products against audience needs and record iteration notes.", "TEC-Y10-S2", "2026-05-03"),
  entry("school_newportsample", "Expressive Arts", "Cross-cutting Themes", "Diversity", "Culture and community", "Year 7", "Spring", "Community performance", "Pupils research local cultural influences and use them in a performance response.", "ART-Y7-S1", "2026-04-26"),
  entry("school_newportsample", "Health and Well-being", "Cross-cutting Themes", "Relationships and sexuality education", "Healthy relationships", "Year 8", "Spring", "Respectful communication", "Pupils discuss scenario cards and identify respectful communication choices.", "HWB-Y8-S1", "2026-03-28"),
  entry("school_newportsample", "Health and Well-being", "Numeracy", "Using measuring skills", "Time and scale", "Year 11", "Autumn", "Training plan review", "Pupils compare training schedules and use time data to plan progression.", "HWB-Y11-A1", "2026-02-24")
];

export const schoolDataById: Record<string, SchoolDataBundle> = {
  school_caerleon: buildBundle({
    schoolId: "school_caerleon",
    subjectConfigs: base.subjectConfigs.map((item) => ({ ...item, schoolId: "school_caerleon" })),
    aoleConfigs: base.aoleConfigs.map((item) => ({ ...item, schoolId: "school_caerleon" })),
    frameworkLibrary: withSchoolFrameworks(base.frameworkLibrary, "school_caerleon"),
    mappings: base.mappings.map((item) => ({ ...item, schoolId: "school_caerleon" }))
  }),
  school_newportsample: buildBundle({
    schoolId: "school_newportsample",
    subjectConfigs: newportSubjects,
    aoleConfigs: base.aoleConfigs.map((item) => ({ ...item, schoolId: "school_newportsample" })),
    frameworkLibrary: withSchoolFrameworks(base.frameworkLibrary, "school_newportsample"),
    mappings: newportMappings
  })
};

export function resolveSchoolBySlug(slug: string, schools: School[] = sampleSchools) {
  return schools.find((school) => school.slug === slug);
}

export function createEmptySchoolData(schoolId: string, subjectConfigs: SubjectConfig[] = [], frameworkLibrary: FrameworkDefinition[] = base.frameworkLibrary) {
  return buildBundle({
    schoolId,
    subjectConfigs: subjectConfigs.map((item, index) => ({ ...item, schoolId, displayOrder: item.displayOrder || index + 1 })),
    aoleConfigs: base.aoleConfigs.map((item) => ({ ...item, schoolId })),
    frameworkLibrary: withSchoolFrameworks(frameworkLibrary, schoolId),
    mappings: []
  });
}

function buildBundle(input: { schoolId: string; subjectConfigs: SubjectConfig[]; aoleConfigs: AoleConfig[]; frameworkLibrary: FrameworkDefinition[]; mappings: MappingEntry[] }): SchoolDataBundle {
  const subjects = input.subjectConfigs
    .filter((subjectItem) => subjectItem.active && subjectItem.appearsInMappingDropdowns)
    .map((subjectItem) => subjectItem.name)
    .sort((a, b) => a.localeCompare(b));
  const subjectAoleMap = Object.fromEntries(input.subjectConfigs.map((subjectItem) => [subjectItem.name, subjectItem.aole]));
  const frameworkMap = Object.fromEntries(
    input.frameworkLibrary.map((framework) => [framework.name, Object.fromEntries(framework.strands.map((strand) => [strand.name, strand.elements.map((elementItem) => elementItem.name)]))])
  );
  const frameworkCoverage = Object.fromEntries(input.frameworkLibrary.map((framework) => [framework.name, buildCoverage(framework, input.mappings, subjects)]));
  const subjectOverviews = makeSubjectOverviews(input.schoolId, subjects, input.subjectConfigs, input.mappings);
  const subjectDetails = makeSubjectDetails(subjectOverviews, input.mappings);

  return {
    schoolId: input.schoolId,
    faculties: input.aoleConfigs.map((item) => item.name),
    departments: subjects,
    subjects,
    subjectConfigs: input.subjectConfigs,
    aoleOptions: input.aoleConfigs.map((item) => item.name),
    aoleConfigs: input.aoleConfigs,
    subjectAoleMap,
    yearGroups: base.yearGroups,
    terms: base.terms,
    frameworkLibrary: input.frameworkLibrary,
    frameworkMap,
    mappings: input.mappings,
    frameworkCoverage,
    wholeSchoolDashboard: makeWholeSchoolDashboard(input.schoolId, subjects, input.mappings),
    literacyDashboard: makeDashboard("Literacy", "Literacy Dashboard", "Reading, writing and oracy opportunities across subjects.", frameworkCoverage, input.mappings),
    numeracyDashboard: makeDashboard("Numeracy", "Numeracy Dashboard", "Number, measurement, data and numerical reasoning opportunities across curriculum planning.", frameworkCoverage, input.mappings),
    dcfDashboard: makeDashboard("Digital Competence Framework", "DCF Dashboard", "Digital competence opportunities across digital citizenship, collaboration, producing and data thinking.", frameworkCoverage, input.mappings),
    themesDashboard: makeDashboard("Cross-cutting Themes", "Cross-cutting Themes Dashboard", "Visibility for RSE, human rights, diversity and careers-related learning across curriculum plans.", frameworkCoverage, input.mappings),
    subjectOverviews,
    subjectDetails,
    subjectProfiles: makeSubjectProfiles(subjectDetails)
  };
}

function makeWholeSchoolDashboard(schoolId: string, subjects: string[], mappings: MappingEntry[]): Dashboard {
  return {
    eyebrow: "Whole-school view",
    title: "Whole-school Dashboard",
    description: "A single curriculum map showing where Literacy, Numeracy, DCF and cross-cutting themes are planned across subjects and year groups.",
    cards: [
      { label: "Mapped opportunities", value: String(mappings.length), note: "Curriculum mapping entries for the current school." },
      { label: "Frameworks visible", value: "4", note: "Literacy, Numeracy, DCF and cross-cutting themes." },
      { label: "Subjects included", value: String(subjects.length), note: "Subject-first curriculum list configured in admin." },
      { label: "Recent updates", value: String(mappings.filter((entryItem) => entryItem.lastMappedDate >= "2026-04-01").length), note: "Curriculum entries updated this term." }
    ],
    heatmapTitle: "Framework Coverage by Year Group",
    heatmapRows: ["Literacy", "Numeracy", "DCF", "Cross-cutting themes"],
    heatmapColumns: base.yearGroups,
    heatmapValues: heatValues(schoolId, 4),
    reviewItems: [
      { title: "Year 11 visibility", status: "Mapping note", description: "Year 11 curriculum entries are represented across configured frameworks." },
      { title: "Framework balance", status: "Mapping note", description: "Mapped opportunities show curriculum connections across subjects." },
      { title: "Curriculum review", status: "Mapping note", description: "Review suggested where fewer recorded opportunities appear in the current school view." }
    ],
    entries: [...mappings].sort((a, b) => b.lastMappedDate.localeCompare(a.lastMappedDate)).slice(0, 8)
  };
}

function makeDashboard(framework: string, title: string, description: string, coverage: Record<string, FrameworkCoverage>, mappings: MappingEntry[]): Dashboard {
  const frameworkCoverage = coverage[framework];
  return {
    eyebrow: "Framework view",
    title,
    description,
    cards: [
      { label: "Mapped opportunities", value: String(frameworkCoverage.total), note: "Entries linked to this framework." },
      { label: "Strands tracked", value: String(frameworkCoverage.strands.length), note: "Configured framework strands." },
      { label: "Elements tracked", value: String(frameworkCoverage.strands.reduce((sum, item) => sum + item.elements.length, 0)), note: "Elements available in the browser." },
      { label: "Unmapped elements", value: String(frameworkCoverage.unmappedElements.length), note: "Elements with no current entries yet." }
    ],
    heatmapTitle: `${frameworkCoverage.framework} Coverage by Year Group`,
    heatmapRows: frameworkCoverage.strands.map((item) => item.strand),
    heatmapColumns: base.yearGroups,
    heatmapValues: heatValues(framework, frameworkCoverage.strands.length),
    reviewItems: [
      { title: "Distribution by strand", status: "Visibility", description: "Shows how mapped opportunities are spread across this framework." },
      { title: "Element library", status: "Visibility", description: "Teachers can browse strand and element explanations before mapping." },
      { title: "Unmapped elements", status: "Visibility", description: "Elements with no current mappings are listed for curriculum planning conversations." }
    ],
    entries: mappings.filter((entryItem) => entryItem.framework === framework).slice(0, 6),
    coverage: frameworkCoverage
  };
}

function buildCoverage(framework: FrameworkDefinition, mappings: MappingEntry[], subjects: string[]): FrameworkCoverage {
  const frameworkEntries = mappings.filter((item) => item.framework === framework.name);
  const total = frameworkEntries.length || 1;
  const allRows: ElementCoverageRow[] = [];
  const strands = framework.strands.map((strand) => {
    const mappedEntries = frameworkEntries.filter((item) => item.strand === strand.name);
    const elements = strand.elements.map((elementItem, elementIndex) => {
      const elementEntries = mappedEntries.filter((item) => item.element === elementItem.name);
      const row = {
        strand: strand.name,
        element: elementItem.name,
        count: elementEntries.length,
        subjects: elementEntries.length ? unique(elementEntries.map((item) => item.subject)) : fallbackSubjects(subjects, elementIndex),
        yearGroups: elementEntries.length ? unique(elementEntries.map((item) => item.year)) : fallbackYears(elementIndex),
        lastMappedDate: elementEntries.sort((a, b) => b.lastMappedDate.localeCompare(a.lastMappedDate))[0]?.lastMappedDate ?? "No current mapping"
      };
      allRows.push(row);
      return row;
    });
    const count = mappedEntries.length;
    return { strand: strand.name, count, percentage: Math.round((count / total) * 100), elements };
  });
  return { framework: framework.name, total: frameworkEntries.length, strands, mostMappedElements: [...allRows].filter((item) => item.count > 0).sort((a, b) => b.count - a.count).slice(0, 5), unmappedElements: allRows.filter((item) => item.count === 0) };
}

function makeSubjectOverviews(schoolId: string, subjects: string[], subjectConfigs: SubjectConfig[], mappings: MappingEntry[]): SubjectOverview[] {
  return subjects.map((subjectName, index) => {
    const rows = mappings.filter((item) => item.subject === subjectName);
    const config = subjectConfigs.find((item) => item.name === subjectName);
    const fallbackTotal = 8 + index * 2;
    return {
      schoolId,
      subject: subjectName,
      aole: config?.aole,
      active: config?.active ?? true,
      appearsInMappingDropdowns: config?.appearsInMappingDropdowns ?? true,
      faculty: config?.aole ?? "Optional AoLE not set",
      department: subjectName,
      total: rows.length ? rows.length * 5 + fallbackTotal : fallbackTotal,
      literacy: countFramework(rows, "Literacy", 2 + index),
      numeracy: countFramework(rows, "Numeracy", 2 + index),
      dcf: countFramework(rows, "Digital Competence Framework", 1 + index),
      themes: countFramework(rows, "Cross-cutting Themes", 1 + index),
      lastReviewedDate: `2026-0${(index % 4) + 2}-${String(12 + index).padStart(2, "0")}`
    };
  });
}

function makeSubjectDetails(overviews: SubjectOverview[], mappings: MappingEntry[]) {
  return Object.fromEntries(
    overviews.map((overview, index) => {
      const rows = mappings.filter((item) => item.subject === overview.subject);
      return [
        overview.subject,
        {
          ...overview,
          byYearGroup: Object.fromEntries(base.yearGroups.map((year, yearIndex) => [year, rows.filter((item) => item.year === year).length * 3 + 1 + ((index + yearIndex) % 4)])),
          byFramework: { Literacy: overview.literacy, Numeracy: overview.numeracy, DCF: overview.dcf, "Cross-cutting themes": overview.themes },
          schemes: unique(rows.map((item) => item.schemeReference)).concat([`${overview.subject.slice(0, 3).toUpperCase()}-MAP-${index + 1}`]).slice(0, 4),
          strandsCovered: unique(rows.map((item) => item.strand)).slice(0, 6),
          elementsCovered: unique(rows.map((item) => item.element)).slice(0, 8)
        }
      ];
    })
  );
}

function makeSubjectProfiles(subjectDetails: Record<string, SubjectDetail>) {
  return Object.fromEntries(
    Object.entries(subjectDetails).map(([subjectName, overview], index) => [
      subjectName,
      {
        cards: [
          { label: "Mapped entries", value: String(overview.total), note: "Subject-level curriculum planning entries." },
          { label: "Frameworks covered", value: String(Object.values(overview.byFramework).filter(Boolean).length), note: "Curriculum areas visible in this subject." },
          { label: "Schemes referenced", value: String(overview.schemes.length), note: "Planning references connected to mappings." },
          { label: "AoLE metadata", value: overview.aole ?? "Not set", note: "Optional reporting metadata only." }
        ],
        rows: ["Literacy", "Numeracy", "DCF", "Themes"],
        columns: base.yearGroups,
        values: heatValues(subjectName, 4),
        notes: [
          `${subjectName} has curriculum visibility through mapped opportunities without recording learner outcomes.`,
          "Subject discussion can focus on visibility, progression language and balance across year groups.",
          `Review suggested: ${overview.lastReviewedDate}. Use the map to discuss curriculum visibility and planning connections.`
        ]
      }
    ])
  );
}

function withSchoolFrameworks(frameworks: FrameworkDefinition[], schoolId: string): FrameworkDefinition[] {
  return frameworks.map((framework) => ({ ...framework, schoolId, strands: framework.strands.map((strand) => ({ ...strand, schoolId, elements: strand.elements.map((elementItem) => ({ ...elementItem, schoolId })) })) }));
}

function entry(schoolId: string, subjectName: string, framework: string, strand: string, elementName: string, year: string, term: string, unit: string, activityDescription: string, schemeReference: string, lastMappedDate: string): MappingEntry {
  const id = `${schoolId}-${subjectName}-${framework}-${strand}-${elementName}-${year}-${unit}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return { schoolId, id, subject: subjectName, framework, strand, element: elementName, context: unit, year, term, unit, activityDescription, schemeReference, progressionReference: suggestedProgressionForYear(year), note: "Curriculum mapping entry for visibility only.", lastMappedDate };
}

function subject(name: string, aole: string | undefined, displayOrder: number, schoolId: string): SubjectConfig {
  return { schoolId, id: `${schoolId}-${name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name, aole, active: true, displayOrder, appearsInMappingDropdowns: true };
}

function heatValues(seed: string, rows: number) {
  const offset = seed.length % 11;
  return Array.from({ length: rows }, (_, row) => base.yearGroups.map((_, col) => 50 + ((offset + row * 9 + col * 7) % 39)));
}

function countFramework(items: MappingEntry[], framework: string, fallback: number) {
  const count = items.filter((item) => item.framework === framework).length;
  return count ? count * 5 + fallback : fallback;
}

function fallbackSubjects(subjects: string[], index: number) {
  return subjects.length ? [subjects[index % subjects.length], subjects[(index + 2) % subjects.length]].filter(Boolean) : [];
}

function fallbackYears(index: number) {
  return [base.yearGroups[index % base.yearGroups.length], base.yearGroups[(index + 1) % base.yearGroups.length]];
}

function unique(items: string[]) {
  return Array.from(new Set(items)).filter(Boolean);
}
