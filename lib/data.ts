// App-facing data layer.
// App data is currently served from local curriculum records.
// When Supabase is connected, replace these exports with query functions that
// return the same shapes used by the UI components.
import * as dataSource from "@/lib/fakeData";
import type { AoleConfig, Card, Dashboard, FrameworkCoverage, FrameworkDefinition, MappingEntry, SubjectConfig, SubjectDetail, SubjectOverview } from "@/lib/types";

export const faculties: string[] = dataSource.faculties;
export const departments: string[] = dataSource.departments;
export const subjects: string[] = dataSource.subjects;
export const subjectConfigs: SubjectConfig[] = dataSource.subjectConfigs;
export const aoleOptions: string[] = dataSource.aoleOptions;
export const aoleConfigs: AoleConfig[] = dataSource.aoleConfigs;
export const subjectAoleMap: Record<string, string | undefined> = dataSource.subjectAoleMap;
export const yearGroups: string[] = dataSource.yearGroups;
export const terms: string[] = dataSource.terms;
export const frameworkLibrary: FrameworkDefinition[] = dataSource.frameworkLibrary;
export const frameworkMap: Record<string, Record<string, string[]>> = dataSource.frameworkMap;
export const mappings: MappingEntry[] = dataSource.mappings;
export const frameworkCoverage: Record<string, FrameworkCoverage> = dataSource.frameworkCoverage;

export const wholeSchoolDashboard: Dashboard = dataSource.wholeSchoolDashboard;
export const literacyDashboard: Dashboard = dataSource.literacyDashboard;
export const numeracyDashboard: Dashboard = dataSource.numeracyDashboard;
export const dcfDashboard: Dashboard = dataSource.dcfDashboard;
export const themesDashboard: Dashboard = dataSource.themesDashboard;

export const subjectOverviews: SubjectOverview[] = dataSource.subjectOverviews;
export const subjectDetails: Record<string, SubjectDetail> = dataSource.subjectDetails;
export const subjectProfiles: Record<string, { cards: Card[]; rows: string[]; columns: string[]; values: number[][]; notes: string[] }> = dataSource.subjectProfiles;
export const adminSetupGroups: { title: string; items: string[] }[] = dataSource.adminSetupGroups;
