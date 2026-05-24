import type { AoleConfig, Card, Dashboard, ElementCoverageRow, FrameworkCoverage, FrameworkDefinition, MappingEntry, SubjectConfig, SubjectDetail, SubjectOverview } from "@/lib/types";
import { officialFrameworkLibrary } from "@/lib/officialFrameworks";

export const aoleOptions = ["Expressive Arts", "Health and Well-being", "Humanities", "Languages, Literacy and Communication", "Mathematics and Numeracy", "Science and Technology"];

export const aoleConfigs: AoleConfig[] = aoleOptions.map((name) => ({
  id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  name,
  active: true
}));

export const subjectConfigs: SubjectConfig[] = [
  subjectConfig("Maths", "Mathematics and Numeracy", 1),
  subjectConfig("English", "Languages, Literacy and Communication", 2),
  subjectConfig("French", "Languages, Literacy and Communication", 3),
  subjectConfig("German", "Languages, Literacy and Communication", 4),
  subjectConfig("Welsh", "Languages, Literacy and Communication", 5),
  subjectConfig("Geography", "Humanities", 6),
  subjectConfig("History", "Humanities", 7),
  subjectConfig("PE", "Health and Well-being", 8),
  subjectConfig("Business", "Humanities", 9),
  subjectConfig("Chemistry", "Science and Technology", 10),
  subjectConfig("Biology", "Science and Technology", 11),
  subjectConfig("Physics", "Science and Technology", 12),
  subjectConfig("Sociology", "Humanities", 13),
  subjectConfig("RSE", "Health and Well-being", 14),
  subjectConfig("Skills", undefined, 15),
  subjectConfig("DT", "Science and Technology", 16),
  subjectConfig("ICT", "Science and Technology", 17),
  subjectConfig("King's Trust", undefined, 18),
  subjectConfig("PSE", "Health and Well-being", 19),
  subjectConfig("Art", "Expressive Arts", 20),
  subjectConfig("Music", "Expressive Arts", 21)
];

export const subjects = subjectConfigs
  .filter((subject) => subject.active && subject.appearsInMappingDropdowns)
  .map((subject) => subject.name)
  .sort((a, b) => a.localeCompare(b));

export const faculties = aoleOptions;

export const departments = subjects;

export const yearGroups = ["Year 7", "Year 8", "Year 9", "Year 10", "Year 11"];

export const terms = ["Autumn", "Spring", "Summer"];

export const frameworkLibrary: FrameworkDefinition[] = officialFrameworkLibrary;

export const frameworkMap: Record<string, Record<string, string[]>> = Object.fromEntries(
  frameworkLibrary.map((framework) => [
    framework.name,
    Object.fromEntries(framework.strands.map((strand) => [strand.name, strand.elements.map((item) => item.name)]))
  ])
);

export const mappings: MappingEntry[] = [];

const columns = yearGroups;

export const frameworkCoverage: Record<string, FrameworkCoverage> = Object.fromEntries(frameworkLibrary.map((framework) => [framework.name, buildCoverage(framework)]));

export const wholeSchoolDashboard: Dashboard = {
  eyebrow: "Whole-school view",
  title: "Whole-school Dashboard",
  description: "A single curriculum map showing where Literacy, Numeracy, DCF and cross-cutting themes are planned across subjects and year groups.",
  cards: [
    { label: "Mapped opportunities", value: String(mappings.length), note: "Curriculum mapping entries across the school." },
    { label: "Frameworks visible", value: "4", note: "Literacy, Numeracy, DCF and cross-cutting themes." },
    { label: "Subjects included", value: String(subjects.length), note: "Subject-first curriculum list configured in admin." },
    { label: "Recent updates", value: String(mappings.filter((entryItem) => entryItem.lastMappedDate >= "2026-04-01").length), note: "Curriculum entries updated this term." }
  ],
  heatmapTitle: "Framework Coverage by Year Group",
  heatmapRows: ["Literacy", "Numeracy", "DCF", "Cross-cutting themes"],
  heatmapColumns: columns,
  heatmapValues: [
    [86, 78, 82, 69, 61],
    [74, 81, 76, 66, 58],
    [63, 72, 79, 71, 54],
    [58, 64, 69, 62, 49]
  ],
  reviewItems: [],
  entries: [...mappings].sort((a, b) => b.lastMappedDate.localeCompare(a.lastMappedDate)).slice(0, 8)
};

export const literacyDashboard = makeDashboard("Literacy Framework", "Literacy Dashboard", "Reading, writing and oracy opportunities across subjects.", [
  [91, 84, 80, 72, 65],
  [79, 76, 82, 74, 68],
  [73, 81, 78, 70, 63]
]);

export const numeracyDashboard = makeDashboard("Numeracy Framework", "Numeracy Dashboard", "Number, measurement, data and numerical reasoning opportunities across curriculum planning.", [
  [84, 88, 78, 70, 62],
  [72, 79, 76, 69, 57],
  [66, 74, 83, 71, 60],
  [58, 63, 67, 72, 55]
]);

export const dcfDashboard = makeDashboard("Digital Competence Framework", "DCF Dashboard", "Digital competence opportunities across digital citizenship, collaboration, producing and data thinking.", [
  [64, 70, 76, 68, 55],
  [73, 78, 82, 74, 62],
  [69, 76, 84, 80, 67],
  [51, 58, 66, 61, 49]
]);

export const themesDashboard = makeDashboard("Cross-cutting Themes", "Cross-cutting Themes Dashboard", "Visibility for RSE, human rights, diversity and careers-related learning across curriculum plans.", [
  [61, 67, 72, 64, 51],
  [70, 74, 69, 66, 58],
  [76, 82, 78, 71, 63],
  [55, 63, 68, 72, 60]
]);

export const subjectOverviews: SubjectOverview[] = subjects.map((subject, index) => {
  const subjectMappings = mappings.filter((item) => item.subject === subject);
  const config = subjectConfigs.find((item) => item.name === subject);
  return {
    subject,
    aole: config?.aole,
    active: config?.active ?? true,
    appearsInMappingDropdowns: config?.appearsInMappingDropdowns ?? true,
    faculty: config?.aole ?? "Optional AoLE not set",
    department: subject,
    total: subjectMappings.length,
    literacy: countFramework(subjectMappings, "Literacy"),
    numeracy: countFramework(subjectMappings, "Numeracy"),
    dcf: countFramework(subjectMappings, "Digital Competence Framework"),
    themes: countFramework(subjectMappings, "Cross-cutting Themes"),
    lastReviewedDate: "Not reviewed yet"
  };
});

export const subjectDetails: Record<string, SubjectDetail> = Object.fromEntries(
  subjectOverviews.map((overview) => {
    const subjectMappings = mappings.filter((item) => item.subject === overview.subject);
    return [
      overview.subject,
      {
        ...overview,
        byYearGroup: Object.fromEntries(yearGroups.map((year) => [year, subjectMappings.filter((item) => item.year === year).length])),
        byFramework: {
          Literacy: overview.literacy,
          Numeracy: overview.numeracy,
          DCF: overview.dcf,
          "Cross-cutting themes": overview.themes
        },
        schemes: unique(subjectMappings.map((item) => item.schemeReference)).slice(0, 4),
        strandsCovered: unique(subjectMappings.map((item) => item.strand)).slice(0, 6),
        elementsCovered: unique(subjectMappings.map((item) => item.element)).slice(0, 8)
      }
    ];
  })
);

export const subjectProfiles: Record<string, { cards: Card[]; rows: string[]; columns: string[]; values: number[][]; notes: string[] }> = Object.fromEntries(
  subjects.map((subject) => {
    const overview = subjectDetails[subject];
    return [
      subject,
      {
        cards: [
          { label: "Mapped entries", value: String(overview.total), note: "Subject-level curriculum planning entries." },
          { label: "Frameworks covered", value: String(Object.values(overview.byFramework).filter(Boolean).length), note: "Curriculum areas visible in this subject." },
          { label: "Schemes referenced", value: String(overview.schemes.length), note: "Planning references connected to mappings." },
          { label: "AoLE metadata", value: overview.aole ?? "Not set", note: "Optional reporting metadata only." }
        ],
        rows: ["Literacy", "Numeracy", "DCF", "Themes"],
        columns,
        values: [
          [0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0]
        ],
        notes: [
          `${subject} is ready for curriculum mapping entries.`,
          "Subject discussion can focus on visibility, progression language and balance across year groups.",
          "Review suggested when curriculum mapping entries have been added."
        ]
      }
    ];
  })
);

export const adminSetupGroups = [
  { title: "Faculties", items: faculties },
  { title: "Departments", items: departments },
  { title: "Subjects", items: subjects },
  { title: "Frameworks", items: frameworkLibrary.map((item) => item.name) },
  { title: "Strands", items: frameworkLibrary.flatMap((framework) => framework.strands.map((strand) => strand.name)) },
  { title: "Elements", items: frameworkLibrary.flatMap((framework) => framework.strands.flatMap((strand) => strand.elements.map((item) => item.name))) },
  { title: "Teacher-friendly explanations", items: frameworkLibrary.flatMap((framework) => framework.strands.flatMap((strand) => strand.elements.map((item) => item.explanation))).slice(0, 8) },
  { title: "Example classroom opportunities", items: frameworkLibrary.flatMap((framework) => framework.strands.flatMap((strand) => strand.elements.flatMap((item) => item.examples))).slice(0, 8) },
  {
    title: "Element active status",
    items: frameworkLibrary
      .flatMap((framework) => framework.strands.flatMap((strand) => strand.elements.map((item, index) => `${item.name}: ${index === 2 ? "Inactive" : "Active"}`)))
      .slice(0, 10)
  }
];

export const subjectAoleMap: Record<string, string | undefined> = Object.fromEntries(subjectConfigs.map((subject) => [subject.name, subject.aole]));

function makeDashboard(framework: string, title: string, description: string, values: number[][]): Dashboard {
  const coverage = frameworkCoverage[framework] ?? emptyCoverage(framework);

  return {
    eyebrow: "Framework view",
    title,
    description,
    cards: frameworkCards(coverage),
    heatmapTitle: `${coverage.framework} Coverage by Year Group`,
    heatmapRows: coverage.strands.map((item) => item.strand),
    heatmapColumns: columns,
    heatmapValues: values,
    reviewItems: [
      { title: "Distribution by strand", status: "Visibility", description: "Shows how mapped opportunities are spread across this framework." },
      { title: "Element library", status: "Visibility", description: "Teachers can browse strand and element explanations before mapping." },
      { title: "Unmapped elements", status: "Visibility", description: "Elements with no current mappings are listed for curriculum planning conversations." }
    ],
    entries: mappings.filter((entryItem) => entryItem.framework === framework).slice(0, 6),
    coverage
  };
}

function emptyCoverage(framework: string): FrameworkCoverage {
  return { framework, total: 0, strands: [], mostMappedElements: [], unmappedElements: [] };
}

function frameworkCards(coverage: FrameworkCoverage): Card[] {
  return [
    { label: "Mapped opportunities", value: String(coverage.total), note: "Entries linked to this framework." },
    { label: "Strands tracked", value: String(coverage.strands.length), note: "Configured framework strands." },
    { label: "Elements tracked", value: String(coverage.strands.reduce((sum, item) => sum + item.elements.length, 0)), note: "Elements available in the browser." },
    { label: "Unmapped elements", value: String(coverage.unmappedElements.length), note: "Elements with no current entries yet." }
  ];
}

function buildCoverage(framework: FrameworkDefinition): FrameworkCoverage {
  const frameworkEntries = mappings.filter((item) => item.framework === framework.name);
  const total = frameworkEntries.length || 1;
  const allRows: ElementCoverageRow[] = [];

  const strands = framework.strands.map((strand) => {
    const mappedEntries = frameworkEntries.filter((item) => item.strand === strand.name);
    const count = mappedEntries.length;
    const elements = strand.elements.map((elementItem, elementIndex) => {
      const elementEntries = mappedEntries.filter((item) => item.element === elementItem.name);
      const row: ElementCoverageRow = {
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

    return {
      strand: strand.name,
      count,
      percentage: Math.round((count / total) * 100),
      elements
    };
  });

  return {
    framework: framework.name,
    total,
    strands,
    mostMappedElements: [...allRows].filter((item) => item.count > 0).sort((a, b) => b.count - a.count).slice(0, 5),
    unmappedElements: allRows.filter((item) => item.count === 0)
  };
}

function element(name: string, explanation: string, examples: string[]) {
  return {
    name,
    officialWording: `${name}: represented in planning through purposeful classroom activity and curriculum connections.`,
    explanation,
    examples,
    progressionDescriptors: progressionDescriptors(name, explanation),
    searchKeywords: keywordSet(name, explanation),
    relatedConnections: relatedConnections(name)
  };
}

function progressionDescriptors(name: string, explanation: string) {
  return {
    "Step 1": "",
    "Step 2": "",
    "Step 3": "",
    "Step 4": "",
    "Step 5": ""
  };
}

function countFramework(items: MappingEntry[], framework: string) {
  return items.filter((item) => item.framework === framework).length;
}

function keywordSet(name: string, explanation: string) {
  const base = `${name} ${explanation}`.toLowerCase();
  const extra = [];
  if (base.includes("data") || base.includes("trend")) extra.push("interpreting data", "graphs", "evidence");
  if (base.includes("source") || base.includes("viewpoint") || base.includes("reliability")) extra.push("evaluating information", "bias", "source evaluation");
  if (base.includes("identity") || base.includes("community") || base.includes("culture")) extra.push("cynefin", "belonging", "local area");
  if (base.includes("reason")) extra.push("justify", "explain thinking", "decision making");
  return unique([name.toLowerCase(), ...extra]);
}

function relatedConnections(name: string) {
  if (name.includes("Comparing") || name.includes("Inference") || name.includes("Locating")) {
    return ["DCF Citizenship", "History source evaluation", "Numeracy data interpretation"];
  }
  if (name.includes("Interpreting") || name.includes("Data") || name.includes("Collecting")) {
    return ["Literacy Reading", "Science practical enquiry", "Geography evidence interpretation"];
  }
  if (name.includes("Diversity") || name.includes("Culture") || name.includes("Identity")) {
    return ["Cynefin", "Human rights", "Literacy personal response"];
  }
  return ["Literacy communication", "Digital collaboration", "Cross-curricular planning"];
}

function subjectConfig(name: string, aole: string | undefined, displayOrder: number): SubjectConfig {
  return {
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
    aole,
    active: true,
    displayOrder,
    appearsInMappingDropdowns: true
  };
}

function unique(items: string[]) {
  return Array.from(new Set(items)).filter(Boolean);
}
