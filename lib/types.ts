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
  searchKeywords: string[];
  relatedConnections: string[];
};

export type StrandDefinition = {
  id?: string;
  schoolId?: string;
  name: string;
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
  strand: string;
  element: string;
  progressionReference?: ProgressionReference;
  descriptor?: string;
  notes?: string;
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
};

export type CrossCuttingTheme = {
  id: string;
  schoolId?: string | null;
  name: string;
  description?: string | null;
  active: boolean;
  displayOrder: number;
};

export type ReviewItem = {
  title: string;
  status: string;
  description: string;
};

export type ElementCoverageRow = {
  strand: string;
  element: string;
  count: number;
  subjects: string[];
  yearGroups: string[];
  lastMappedDate: string;
};

export type StrandCoverage = {
  strand: string;
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
  heatmapRows: string[];
  heatmapColumns: string[];
  heatmapValues: number[][];
  reviewItems: ReviewItem[];
  entries: MappingEntry[];
  coverage?: FrameworkCoverage;
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
