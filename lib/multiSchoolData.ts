import * as base from "@/lib/fakeData";
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

export const schoolDataById: Record<string, SchoolDataBundle> = {
  school_caerleon: buildBundle({
    schoolId: "school_caerleon",
    subjectConfigs: base.subjectConfigs.map((item) => ({ ...item, schoolId: "school_caerleon" })),
    aoleConfigs: base.aoleConfigs.map((item) => ({ ...item, schoolId: "school_caerleon" })),
    frameworkLibrary: withSchoolFrameworks(base.frameworkLibrary, "school_caerleon"),
    mappings: []
  }),
  school_newportsample: buildBundle({
    schoolId: "school_newportsample",
    subjectConfigs: newportSubjects,
    aoleConfigs: base.aoleConfigs.map((item) => ({ ...item, schoolId: "school_newportsample" })),
    frameworkLibrary: withSchoolFrameworks(base.frameworkLibrary, "school_newportsample"),
    mappings: []
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

export function buildBundle(input: { schoolId: string; subjectConfigs: SubjectConfig[]; aoleConfigs: AoleConfig[]; frameworkLibrary: FrameworkDefinition[]; mappings: MappingEntry[] }): SchoolDataBundle {
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
    heatmapValues: wholeSchoolHeatValues(mappings),
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
    heatmapValues: frameworkHeatValues(framework, frameworkCoverage.strands, mappings),
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
        subjects: elementEntries.length ? unique(elementEntries.map((item) => item.subject)) : [],
        yearGroups: elementEntries.length ? unique(elementEntries.map((item) => item.year)) : [],
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
  return subjects.map((subjectName) => {
    const rows = mappings.filter((item) => item.subject === subjectName);
    const config = subjectConfigs.find((item) => item.name === subjectName);
    return {
      schoolId,
      subject: subjectName,
      aole: config?.aole,
      active: config?.active ?? true,
      appearsInMappingDropdowns: config?.appearsInMappingDropdowns ?? true,
      faculty: config?.aole ?? "Optional AoLE not set",
      department: subjectName,
      total: rows.length,
      literacy: countFramework(rows, "Literacy"),
      numeracy: countFramework(rows, "Numeracy"),
      dcf: countFramework(rows, "Digital Competence Framework"),
      themes: countFramework(rows, "Cross-cutting Themes"),
      lastReviewedDate: "Not reviewed yet"
    };
  });
}

function makeSubjectDetails(overviews: SubjectOverview[], mappings: MappingEntry[]) {
  return Object.fromEntries(
    overviews.map((overview) => {
      const rows = mappings.filter((item) => item.subject === overview.subject);
      return [
        overview.subject,
        {
          ...overview,
          byYearGroup: Object.fromEntries(base.yearGroups.map((year) => [year, rows.filter((item) => item.year === year).length])),
          byFramework: { Literacy: overview.literacy, Numeracy: overview.numeracy, DCF: overview.dcf, "Cross-cutting themes": overview.themes },
          schemes: unique(rows.map((item) => item.schemeReference)).slice(0, 4),
          strandsCovered: unique(rows.map((item) => item.strand)).slice(0, 6),
          elementsCovered: unique(rows.map((item) => item.element)).slice(0, 8)
        }
      ];
    })
  );
}

function makeSubjectProfiles(subjectDetails: Record<string, SubjectDetail>) {
  return Object.fromEntries(
    Object.entries(subjectDetails).map(([subjectName, overview]) => [
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
        values: [
          base.yearGroups.map(() => 0),
          base.yearGroups.map(() => 0),
          base.yearGroups.map(() => 0),
          base.yearGroups.map(() => 0)
        ],
        notes: [
          `${subjectName} is ready for curriculum mapping entries.`,
          "Subject discussion can focus on visibility, progression language and balance across year groups.",
          "Review suggested when curriculum mapping entries have been added."
        ]
      }
    ])
  );
}

function withSchoolFrameworks(frameworks: FrameworkDefinition[], schoolId: string): FrameworkDefinition[] {
  return frameworks.map((framework) => ({ ...framework, schoolId, strands: framework.strands.map((strand) => ({ ...strand, schoolId, elements: strand.elements.map((elementItem) => ({ ...elementItem, schoolId })) })) }));
}

function subject(name: string, aole: string | undefined, displayOrder: number, schoolId: string): SubjectConfig {
  return { schoolId, id: `${schoolId}-${name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name, aole, active: true, displayOrder, appearsInMappingDropdowns: true };
}

function wholeSchoolHeatValues(mappings: MappingEntry[]) {
  const frameworks = ["Literacy", "Numeracy", "Digital Competence Framework", "Cross-cutting Themes"];
  return frameworks.map((framework) => base.yearGroups.map((year) => mappings.filter((entry) => entry.framework === framework && entry.year === year).length));
}

function frameworkHeatValues(framework: string, strands: FrameworkCoverage["strands"], mappings: MappingEntry[]) {
  return strands.map((strand) => base.yearGroups.map((year) => mappings.filter((entry) => entry.framework === framework && entry.strand === strand.strand && entry.year === year).length));
}

function countFramework(items: MappingEntry[], framework: string) {
  return items.filter((item) => item.framework === framework).length;
}

function unique(items: string[]) {
  return Array.from(new Set(items)).filter(Boolean);
}
