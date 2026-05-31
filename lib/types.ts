export type Card = {
  label: string;
  value: string;
  note: string;
};

export type School = {
  id: string;
  slug: string;
  name: string;
  motto: string;
  logoUrl: string;
  primaryColour: string;
  secondaryColour: string;
  active: boolean;
  createdAt: string;
};

export type ElementDefinition = {
  id?: string;
  schoolId?: string;
  name: string;
  officialWording: string;
  explanation: string;
  examples: string[];
  progressionDescriptors: Record<ProgressionStep, string>;
  progressionDescriptorRefs?: ProgressionDescriptorDefinition[];
  searchKeywords: string[];
  relatedConnections: string[];
};

export type StrandDefinition = {
  id?: string;
  schoolId?: string;
  name: string;
  shortName?: string | null;
  elements: ElementDefinition[];
};

export type FrameworkDefinition = {
  id?: string;
  schoolId?: string;
  name: string;
  shortName: string;
  strands: StrandDefinition[];
};

export type MappingFrameworkReference = {
  id?: string;
  frameworkId: string;
  strandId: string;
  elementId: string;
  progressionDescriptorId?: string | null;
  progressionStep?: number | null;
  framework: string;
  frameworkShortName?: string;
  strand: string;
  strandShortName?: string | null;
  element: string;
  progressionReference?: ProgressionReference;
  descriptor?: string;
  notes?: string;
};

export type ProgressionDescriptorDefinition = {
  id: string;
  progressionStep: ProgressionStep;
  progressionStepNumber: number;
  descriptorText: string;
};

export type MappingEntry = {
  schoolId?: string;
  subjectId?: string;
  frameworkId?: string;
  strandId?: string;
  elementId?: string;
  progressionDescriptorId?: string;
  frameworkReferences?: MappingFrameworkReference[];
  crossCuttingThemeIds?: string[];
  crossCuttingThemeElementLinks?: SelectedCctElement[];
  crossCuttingThemeElementIds?: string[];
  crossCuttingThemes?: string[];
  crossCuttingThemeNotes?: string;
  id: string;
  subject: string;
  framework: string;
  strand: string;
  element: string;
  context: string;
  year: string;
  term: string;
  unit: string;
  activityDescription: string;
  taskDescription?: string;
  schemeReference: string;
  progressionReference?: ProgressionReference;
  note?: string;
  lastMappedDate: string;
};

export type ProgressionStep = "Step 1" | "Step 2" | "Step 3" | "Step 4" | "Step 5";

export type ProgressionReference = ProgressionStep | "Step 3–4" | "Step 4–5" | "Not specified";

export type SubjectConfig = {
  schoolId?: string;
  id: string;
  name: string;
  shortName?: string | null;
  aoeId?: string | null;
  aole?: string;
  active: boolean;
  displayOrder: number;
  appearsInMappingDropdowns: boolean;
};

export type AoleConfig = {
  schoolId?: string;
  id: string;
  name: string;
  active: boolean;
  displayOrder?: number;
};

export type CrossCuttingTheme = {
  id: string;
  schoolId?: string | null;
  name: string;
  description?: string | null;
  active: boolean;
  displayOrder: number;
  elements?: CrossCuttingThemeElement[];
};

export type CrossCuttingThemeElement = {
  id: string;
  schoolId?: string | null;
  themeId: string;
  name: string;
  description?: string | null;
  displayOrder: number;
  active: boolean;
};

export type SelectedCctElement = {
  themeId: string;
  elementId: string;
};

export type ReviewItem = {
  title: string;
  status: string;
  description: string;
};

export type ElementCoverageRow = {
  strand: string;
  strandShortName?: string | null;
  element: string;
  count: number;
  subjects: string[];
  yearGroups: string[];
  lastMappedDate: string;
};

export type StrandCoverage = {
  strand: string;
  strandShortName?: string | null;
  count: number;
  percentage: number;
  elements: ElementCoverageRow[];
};

export type FrameworkCoverage = {
  framework: string;
  total: number;
  strands: StrandCoverage[];
  mostMappedElements: ElementCoverageRow[];
  unmappedElements: ElementCoverageRow[];
};

export type Dashboard = {
  eyebrow: string;
  title: string;
  description: string;
  cards: Card[];
  heatmapTitle: string;
  heatmapDescription?: string;
  heatmapRows: string[];
  heatmapRowTitles?: string[];
  heatmapColumns: string[];
  heatmapValues: number[][];
  heatmapCells?: HeatmapCell[][];
  reviewItems: ReviewItem[];
  entries: MappingEntry[];
  coverage?: FrameworkCoverage;
};

export type HeatmapCell = {
  percentage: number | null;
  count: number;
  total: number;
  entries: {
    id: string;
    title: string;
    subject: string;
    schemeReference: string;
  }[];
};

export type SubjectOverview = {
  schoolId?: string;
  subject: string;
  aole?: string;
  active: boolean;
  appearsInMappingDropdowns: boolean;
  faculty: string;
  department: string;
  total: number;
  literacy: number;
  numeracy: number;
  dcf: number;
  themes: number;
  lastReviewedDate: string;
};

export type SubjectDetail = SubjectOverview & {
  byYearGroup: Record<string, number>;
  byFramework: Record<string, number>;
  schemes: string[];
  strandsCovered: string[];
  elementsCovered: string[];
};
