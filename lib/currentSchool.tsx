"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useSchoolSettings } from "@/lib/schoolSettings";
import { createEmptySchoolData, defaultSchoolId, sampleSchools, schoolDataById, type SchoolDataBundle } from "@/lib/multiSchoolData";
import type { School, SubjectConfig } from "@/lib/types";

type CurrentSchoolContextValue = {
  schools: School[];
  currentSchool: School;
  currentSchoolId: string;
  data: SchoolDataBundle;
  switchSchool: (schoolId: string) => void;
  addSchool: () => School;
  updateSchool: (schoolId: string, patch: Partial<School>) => void;
  toggleSchoolActive: (schoolId: string) => void;
  resolveSchoolBySlug: (slug: string) => School | undefined;
};

const CurrentSchoolContext = createContext<CurrentSchoolContextValue | null>(null);

export function CurrentSchoolProvider({ children }: { children: React.ReactNode }) {
  const { updateBranding } = useSchoolSettings();
  const [schools, setSchools] = useState<School[]>(sampleSchools);
  const [currentSchoolId, setCurrentSchoolId] = useState(defaultSchoolId);
  const [customData, setCustomData] = useState<Record<string, SchoolDataBundle>>({});

  useEffect(() => {
    const savedSchools = window.localStorage.getItem("skills-tracker-schools");
    const savedCurrent = window.localStorage.getItem("skills-tracker-current-school");
    if (savedSchools) {
      try {
        setSchools(JSON.parse(savedSchools));
      } catch {
        setSchools(sampleSchools);
      }
    }
    if (savedCurrent) setCurrentSchoolId(savedCurrent);
  }, []);

  const currentSchool = schools.find((school) => school.id === currentSchoolId) ?? schools[0] ?? sampleSchools[0];
  const data = customData[currentSchool.id] ?? schoolDataById[currentSchool.id] ?? createEmptySchoolData(currentSchool.id);

  useEffect(() => {
    window.localStorage.setItem("skills-tracker-schools", JSON.stringify(schools));
  }, [schools]);

  useEffect(() => {
    window.localStorage.setItem("skills-tracker-current-school", currentSchool.id);
    updateBranding({
      schoolName: currentSchool.name,
      motto: currentSchool.motto,
      primaryColour: currentSchool.primaryColour,
      secondaryColour: currentSchool.secondaryColour,
      logoDataUrl: currentSchool.logoUrl
    });
  }, [currentSchool.id, currentSchool.name, currentSchool.motto, currentSchool.primaryColour, currentSchool.secondaryColour, currentSchool.logoUrl]);

  const value = useMemo<CurrentSchoolContextValue>(
    () => ({
      schools,
      currentSchool,
      currentSchoolId: currentSchool.id,
      data,
      switchSchool: (schoolId) => {
        const next = schools.find((school) => school.id === schoolId && school.active);
        if (next) setCurrentSchoolId(next.id);
      },
      addSchool: () => {
        const id = `school_${Date.now()}`;
        const newSchool: School = {
          id,
          slug: `school-${schools.length + 1}`,
          name: "New School",
          motto: "Curriculum visibility",
          logoUrl: "/schlogo.png",
          primaryColour: "#1D3557",
          secondaryColour: "#0F2238",
          active: true,
          createdAt: new Date().toISOString().slice(0, 10)
        };
        setSchools((current) => [...current, newSchool]);
        setCustomData((current) => ({
          ...current,
          [id]: createEmptySchoolData(id, defaultNewSchoolSubjects(id))
        }));
        return newSchool;
      },
      updateSchool: (schoolId, patch) => {
        setSchools((current) => current.map((school) => (school.id === schoolId ? { ...school, ...patch } : school)));
      },
      toggleSchoolActive: (schoolId) => {
        setSchools((current) => current.map((school) => (school.id === schoolId ? { ...school, active: !school.active } : school)));
      },
      resolveSchoolBySlug: (slug) => schools.find((school) => school.slug === slug)
    }),
    [currentSchool, data, schools]
  );

  return <CurrentSchoolContext.Provider value={value}>{children}</CurrentSchoolContext.Provider>;
}

export function useCurrentSchool() {
  const value = useContext(CurrentSchoolContext);
  if (!value) throw new Error("useCurrentSchool must be used within CurrentSchoolProvider");
  return value;
}

export function useCurrentSchoolData() {
  return useCurrentSchool().data;
}

function defaultNewSchoolSubjects(schoolId: string): SubjectConfig[] {
  return ["English", "Maths", "Science", "Humanities", "Technology"].map((name, index) => ({
    schoolId,
    id: `${schoolId}-${name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
    aole: undefined,
    active: true,
    displayOrder: index + 1,
    appearsInMappingDropdowns: true
  }));
}
