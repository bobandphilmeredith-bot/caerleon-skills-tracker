import * as base from "@/lib/fakeData";
import { defaultCrossCuttingThemes } from "@/lib/crossCuttingThemes";
import type { AoleConfig, Card, CrossCuttingTheme, Dashboard, ElementCoverageRow, FrameworkCoverage, FrameworkDefinition, HeatmapCell, MappingEntry, MappingFrameworkReference, School, SubjectConfig, SubjectDetail, SubjectOverview } from "@/lib/types";

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
  crossCuttingThemes: CrossCuttingTheme[];
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
    crossCuttingThemes: withSchoolThemes(defaultCrossCuttingThemes, "school_caerleon"),
    mappings: []
  }),
  school_newportsample: buildBundle({
    schoolId: "school_newportsample",
    subjectConfigs: newportSubjects,
    aoleConfigs: base.aoleConfigs.map((item) => ({ ...item, schoolId: "school_newportsample" })),
    frameworkLibrary: withSchoolFrameworks(base.frameworkLibrary, "school_newportsample"),
    crossCuttingThemes: withSchoolThemes(defaultCrossCuttingThemes, "school_newportsample"),
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
    crossCuttingThemes: withSchoolThemes(defaultCrossCuttingThemes, schoolId),
    mappings: []
  });
}

export function buildBundle(input: { schoolId: string; subjectConfigs: SubjectConfig[]; aoleConfigs: AoleConfig[]; frameworkLibrary: FrameworkDefinition[]; crossCuttingThemes?: CrossCuttingTheme[]; mappings: MappingEntry[] }): SchoolDataBundle {
  const subjects = input.subjectConfigs
    .filter((subjectItem) => subjectItem.active && subjectItem.appearsInMappingDropdowns)
    .map((subjectItem) => subjectItem.name)
    .sort((a, b) => a.localeCompare(b));
  const subjectAoleMap = Object.fromEntries(input.subjectConfigs.map((subjectItem) => [subjectItem.name, subjectItem.aole]));
  const frameworkMap = Object.fromEntries(
    input.frameworkLibrary.map((framework) => [framework.name, Object.fromEntries(framework.strands.map((strand) => [strand.name, strand.elements.map((elementItem) => elementItem.name)]))])
  );
  const frameworkReferences = expandFrameworkReferences(input.mappings);
  const frameworkCoverage = Object.fromEntries(input.frameworkLibrary.map((framework) => [framework.name, buildCoverage(framework, input.mappings, frameworkReferences, subjects)]));
  const literacyFramework = findFrameworkName(input.frameworkLibrary, "Literacy");
  const numeracyFramework = findFrameworkName(input.frameworkLibrary, "Numeracy");
  const dcfFramework = findFrameworkName(input.frameworkLibrary, "DCF", "Digital Competence Framework");
  const crossCuttingThemes = input.crossCuttingThemes ?? withSchoolThemes(defaultCrossCuttingThemes, input.schoolId);
  const subjectOverviews = makeSubjectOverviews(input.schoolId, subjects, input.subjectConfigs, input.mappings, frameworkReferences, {
    literacy: literacyFramework,
    numeracy: numeracyFramework,
    dcf: dcfFramework,
    themes: ""
  });
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
    crossCuttingThemes,
    frameworkMap,
    mappings: input.mappings,
    frameworkCoverage,
    wholeSchoolDashboard: makeWholeSchoolDashboard(input.schoolId, subjects, input.mappings, frameworkReferences),
    literacyDashboard: makeDashboard(literacyFramework, "Literacy Dashboard", "Reading, writing and oracy opportunities across subjects.", frameworkCoverage, input.mappings, frameworkReferences),
    numeracyDashboard: makeDashboard(numeracyFramework, "Numeracy Dashboard", "Number, measurement, data and numerical reasoning opportunities across curriculum planning.", frameworkCoverage, input.mappings, frameworkReferences),
    dcfDashboard: makeDashboard(dcfFramework, "DCF Dashboard", "Digital competence opportunities across digital citizenship, collaboration, producing and data thinking.", frameworkCoverage, input.mappings, frameworkReferences),
    themesDashboard: makeThemesDashboard(crossCuttingThemes, input.mappings),
    subjectOverviews,
    subjectDetails,
    subjectProfiles: makeSubjectProfiles(subjectDetails)
  };
}

function makeWholeSchoolDashboard(schoolId: string, subjects: string[], mappings: MappingEntry[], frameworkReferences: ExpandedFrameworkReference[]): Dashboard {
  const heatmapCells = wholeSchoolHeatValues(mappings, frameworkReferences);
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
    heatmapTitle: "Mapped Evidence by Year Group",
    heatmapDescription: "Shows the proportion of mapped curriculum entries in each year group that include at least one reference to each framework or theme area.",
    heatmapRows: ["Literacy", "Numeracy", "DCF", "Cross-cutting themes"],
    heatmapColumns: base.yearGroups,
    heatmapValues: heatmapCells.map((row) => row.map((cell) => cell.percentage ?? 0)),
    heatmapCells,
    reviewItems: [],
    entries: [...mappings].sort((a, b) => b.lastMappedDate.localeCompare(a.lastMappedDate)).slice(0, 8)
  };
}

function makeDashboard(framework: string, title: string, description: string, coverage: Record<string, FrameworkCoverage>, mappings: MappingEntry[], frameworkReferences: ExpandedFrameworkReference[]): Dashboard {
  const frameworkCoverage = coverage[framework] ?? emptyCoverage(framework);
  const heatmapCells = frameworkHeatCells(framework, frameworkCoverage.strands, frameworkReferences);
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
    heatmapTitle: `${frameworkCoverage.framework} Skill Links by Year Group`,
    heatmapDescription: `Shows which strands are most represented in each year group. Each cell shows the number of skill links first, with its share of that year group's ${frameworkCoverage.framework} links underneath.`,
    heatmapRows: frameworkCoverage.strands.map((item) => strandDisplayName(item)),
    heatmapRowTitles: frameworkCoverage.strands.map((item) => item.strand),
    heatmapColumns: base.yearGroups,
    heatmapValues: heatmapCells.map((row) => row.map((cell) => cell.percentage ?? 0)),
    heatmapCells,
    heatmapDisplayMode: "countShare",
    reviewItems: [
      { title: "Distribution by strand", status: "Visibility", description: "Shows how mapped opportunities are spread across this framework." },
      { title: "Element library", status: "Visibility", description: "Teachers can browse strand and element explanations before mapping." },
      { title: "Unmapped elements", status: "Visibility", description: "Elements with no current mappings are listed for curriculum planning conversations." }
    ],
    entries: mappings.filter((entryItem) => entryHasFramework(entryItem, framework)).slice(0, 6),
    coverage: frameworkCoverage
  };
}

function makeThemesDashboard(themes: CrossCuttingTheme[], mappings: MappingEntry[]): Dashboard {
  const activeThemes = themes.filter((theme) => theme.active);
  const linkedMappings = mappings.filter((entry) => (entry.crossCuttingThemeIds?.length ?? entry.crossCuttingThemes?.length ?? 0) > 0);
  return {
    eyebrow: "Cross-cutting themes",
    title: "Cross-cutting Themes Dashboard",
    description: "Theme tagging for curriculum activities. These are references only and do not use progression steps.",
    cards: [
      { label: "Theme-linked mappings", value: String(linkedMappings.length), note: "Curriculum entries with one or more cross-cutting themes." },
      { label: "Active themes", value: String(activeThemes.length), note: "Theme tags available for new mappings." },
      { label: "Mappings without themes", value: String(mappings.length - linkedMappings.length), note: "Entries with no cross-cutting theme selected." },
      { label: "Theme links", value: String(mappings.reduce((sum, entry) => sum + (entry.crossCuttingThemeIds?.length ?? entry.crossCuttingThemes?.length ?? 0), 0)), note: "Total theme references across mapped opportunities." }
    ],
    heatmapTitle: "Cross-cutting Theme Links by Year Group",
    heatmapRows: activeThemes.map((theme) => theme.name),
    heatmapColumns: base.yearGroups,
    heatmapValues: activeThemes.map((theme) =>
      base.yearGroups.map((year) => mappings.filter((entry) => entry.year === year && ((entry.crossCuttingThemeIds?.includes(theme.id) ?? false) || (entry.crossCuttingThemes?.includes(theme.name) ?? false))).length)
    ),
    reviewItems: [
      { title: "Theme references", status: "Visibility", description: "Shows where planned curriculum activities link to cross-cutting themes." },
      { title: "Entries without themes", status: "Review suggested", description: "Mapped opportunities can be reviewed where no cross-cutting theme has been selected." },
      { title: "No progression steps", status: "Reference only", description: "Cross-cutting themes are tags, not a progression framework." }
    ],
    entries: linkedMappings.slice(0, 8)
  };
}

function findFrameworkName(frameworks: FrameworkDefinition[], shortName: string, fallback = shortName) {
  return frameworks.find((framework) => framework.shortName === shortName || framework.name === fallback || framework.name === shortName)?.name ?? fallback;
}

function emptyCoverage(framework: string): FrameworkCoverage {
  return { framework, total: 0, strands: [], mostMappedElements: [], unmappedElements: [] };
}

function buildCoverage(framework: FrameworkDefinition, mappings: MappingEntry[], frameworkReferences: ExpandedFrameworkReference[], subjects: string[]): FrameworkCoverage {
  const frameworkEntries = frameworkReferences.filter((item) => item.framework === framework.name);
  const total = frameworkEntries.length || 1;
  const allRows: ElementCoverageRow[] = [];
  const strands = framework.strands.map((strand) => {
    const mappedEntries = frameworkEntries.filter((item) => item.strand === strand.name);
    const elements = strand.elements.map((elementItem, elementIndex) => {
      const elementEntries = mappedEntries.filter((item) => item.element === elementItem.name);
      const row = {
        strand: strand.name,
        strandShortName: strand.shortName,
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
    return { strand: strand.name, strandShortName: strand.shortName, count, percentage: Math.round((count / total) * 100), elements };
  });
  return { framework: framework.name, total: frameworkEntries.length, strands, mostMappedElements: [...allRows].filter((item) => item.count > 0).sort((a, b) => b.count - a.count).slice(0, 5), unmappedElements: allRows.filter((item) => item.count === 0) };
}

function strandDisplayName(strand: { strand: string; strandShortName?: string | null }) {
  return strand.strandShortName ?? strand.strand;
}

function makeSubjectOverviews(schoolId: string, subjects: string[], subjectConfigs: SubjectConfig[], mappings: MappingEntry[], frameworkReferences: ExpandedFrameworkReference[], frameworkNames: { literacy: string; numeracy: string; dcf: string; themes: string }): SubjectOverview[] {
  return subjects.map((subjectName) => {
    const rows = mappings.filter((item) => item.subject === subjectName);
    const subjectFrameworkReferences = frameworkReferences.filter((item) => item.subject === subjectName);
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
      literacy: countFramework(subjectFrameworkReferences, frameworkNames.literacy),
      numeracy: countFramework(subjectFrameworkReferences, frameworkNames.numeracy),
      dcf: countFramework(subjectFrameworkReferences, frameworkNames.dcf),
      themes: rows.filter((item) => (item.crossCuttingThemeIds?.length ?? item.crossCuttingThemes?.length ?? 0) > 0).length,
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

function withSchoolThemes(themes: CrossCuttingTheme[], schoolId: string): CrossCuttingTheme[] {
  return themes.map((theme) => ({ ...theme, schoolId }));
}

function subject(name: string, aole: string | undefined, displayOrder: number, schoolId: string): SubjectConfig {
  return { schoolId, id: `${schoolId}-${name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name, aole, active: true, displayOrder, appearsInMappingDropdowns: true };
}

function wholeSchoolHeatValues(mappings: MappingEntry[], frameworkReferences: ExpandedFrameworkReference[]): HeatmapCell[][] {
  const frameworkGroups = [
    ["Literacy", "Literacy Framework"],
    ["Numeracy", "Numeracy Framework"],
    ["Digital Competence Framework"],
    ["__theme_links__"]
  ];
  return frameworkGroups.map((frameworks) =>
    base.yearGroups.map((year) => {
      const yearMappings = mappings.filter((entry) => entry.year === year);
      const matchingIds = frameworks.includes("__theme_links__")
        ? new Set(
            yearMappings
              .filter((entry) => (entry.crossCuttingThemeElementIds?.length ?? entry.crossCuttingThemeElementLinks?.length ?? entry.crossCuttingThemeIds?.length ?? entry.crossCuttingThemes?.length ?? 0) > 0)
              .map((entry) => entry.id)
          )
        : new Set(frameworkReferences.filter((reference) => frameworks.includes(reference.framework) && reference.year === year).map((reference) => reference.mappingId));
      const matchedEntries = yearMappings.filter((entry) => matchingIds.has(entry.id));
      return {
        percentage: yearMappings.length ? Math.round((matchedEntries.length / yearMappings.length) * 100) : null,
        count: matchedEntries.length,
        total: yearMappings.length,
        entries: matchedEntries.map((entry) => ({
          id: entry.id,
          title: entry.unit || entry.context || "Untitled curriculum",
          subject: entry.subject,
          schemeReference: entry.schemeReference
        }))
      };
    })
  );
}

function frameworkHeatCells(framework: string, strands: FrameworkCoverage["strands"], frameworkReferences: ExpandedFrameworkReference[]): HeatmapCell[][] {
  return strands.map((strand) =>
    base.yearGroups.map((year) => {
      const yearReferences = frameworkReferences.filter((reference) => reference.framework === framework && reference.year === year);
      const strandReferences = yearReferences.filter((reference) => reference.strand === strand.strand);
      return {
        percentage: yearReferences.length ? Math.round((strandReferences.length / yearReferences.length) * 100) : null,
        count: strandReferences.length,
        total: yearReferences.length,
        entries: uniqueByMappingId(strandReferences).map((reference) => ({
          id: reference.mappingId,
          title: reference.element,
          subject: reference.subject,
          schemeReference: reference.element
        }))
      };
    })
  );
}

function countFramework(items: ExpandedFrameworkReference[], framework: string) {
  return items.filter((item) => item.framework === framework).length;
}

function unique(items: string[]) {
  return Array.from(new Set(items)).filter(Boolean);
}

function uniqueByMappingId(items: ExpandedFrameworkReference[]) {
  return Array.from(new Map(items.map((item) => [item.mappingId, item])).values());
}

type ExpandedFrameworkReference = MappingFrameworkReference & {
  mappingId: string;
  subject: string;
  year: string;
  lastMappedDate: string;
};

function expandFrameworkReferences(mappings: MappingEntry[]): ExpandedFrameworkReference[] {
  return mappings.flatMap((entry) => {
    const references = entry.frameworkReferences?.length
      ? entry.frameworkReferences
      : entry.frameworkId && entry.strandId && entry.elementId
        ? [
          {
            id: entry.id,
            frameworkId: entry.frameworkId ?? "",
            strandId: entry.strandId ?? "",
            elementId: entry.elementId ?? "",
            progressionDescriptorId: entry.progressionDescriptorId,
            framework: entry.framework,
            strand: entry.strand,
            element: entry.element,
            progressionReference: entry.progressionReference
          }
        ]
        : [];

    return references.map((reference) => ({
      ...reference,
      mappingId: entry.id,
      subject: entry.subject,
      year: entry.year,
      lastMappedDate: entry.lastMappedDate
    }));
  });
}

function entryHasFramework(entry: MappingEntry, framework: string) {
  return entry.frameworkReferences?.some((reference) => reference.framework === framework) ?? entry.framework === framework;
}
