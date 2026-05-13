"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type BrandingSettings = {
  schoolName: string;
  motto: string;
  primaryColour: string;
  secondaryColour: string;
  logoDataUrl: string;
};

export type FrameworkThemeSetting = {
  primary: string;
  pale: string;
  badge: string;
  chart: string;
};

export type SchoolSettings = {
  branding: BrandingSettings;
  frameworkThemes: Record<string, FrameworkThemeSetting>;
};

const defaultLogo = "/schlogo.png";

export const defaultSchoolSettings: SchoolSettings = {
  branding: {
    schoolName: "Caerleon Comprehensive School",
    motto: "Maximising Potential",
    primaryColour: "#741B47",
    secondaryColour: "#571435",
    logoDataUrl: defaultLogo
  },
  frameworkThemes: {
    Literacy: { primary: "#EA580C", pale: "#FFF7ED", badge: "#9A3412", chart: "#EA580C" },
    Numeracy: { primary: "#2563EB", pale: "#EFF6FF", badge: "#1E3A8A", chart: "#2563EB" },
    DCF: { primary: "#CA8A04", pale: "#FEFCE8", badge: "#854D0E", chart: "#CA8A04" },
    "Cross-cutting themes": { primary: "#15803D", pale: "#F0FDF4", badge: "#166534", chart: "#15803D" }
  }
};

type SchoolSettingsContextValue = {
  settings: SchoolSettings;
  updateBranding: (patch: Partial<BrandingSettings>) => void;
  updateFrameworkTheme: (framework: string, patch: Partial<FrameworkThemeSetting>) => void;
  resetBranding: () => void;
  resetAllSettings: () => void;
};

const SchoolSettingsContext = createContext<SchoolSettingsContextValue | null>(null);

export function SchoolSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SchoolSettings>(defaultSchoolSettings);

  useEffect(() => {
    const saved = window.localStorage.getItem("caerleon-school-settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<SchoolSettings>;
        setSettings({
          branding: { ...defaultSchoolSettings.branding, ...parsed.branding },
          frameworkThemes: { ...defaultSchoolSettings.frameworkThemes, ...parsed.frameworkThemes }
        });
      } catch {
        setSettings(defaultSchoolSettings);
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("caerleon-school-settings", JSON.stringify(settings));
    applyCssVariables(settings);
  }, [settings]);

  const value = useMemo<SchoolSettingsContextValue>(
    () => ({
      settings,
      updateBranding: (patch) => setSettings((current) => ({ ...current, branding: { ...current.branding, ...patch } })),
      updateFrameworkTheme: (framework, patch) =>
        setSettings((current) => ({
          ...current,
          frameworkThemes: {
            ...current.frameworkThemes,
            [framework]: { ...current.frameworkThemes[framework], ...patch }
          }
        })),
      resetBranding: () => setSettings((current) => ({ ...current, branding: defaultSchoolSettings.branding })),
      resetAllSettings: () => setSettings(defaultSchoolSettings)
    }),
    [settings]
  );

  return <SchoolSettingsContext.Provider value={value}>{children}</SchoolSettingsContext.Provider>;
}

export function useSchoolSettings() {
  const value = useContext(SchoolSettingsContext);
  if (!value) throw new Error("useSchoolSettings must be used within SchoolSettingsProvider");
  return value;
}

function applyCssVariables(settings: SchoolSettings) {
  const root = document.documentElement;
  root.style.setProperty("--school-primary", settings.branding.primaryColour);
  root.style.setProperty("--school-secondary", settings.branding.secondaryColour);
  root.style.setProperty("--literacy-accent", settings.frameworkThemes.Literacy.primary);
  root.style.setProperty("--literacy-soft", settings.frameworkThemes.Literacy.pale);
  root.style.setProperty("--literacy-text", settings.frameworkThemes.Literacy.badge);
  root.style.setProperty("--literacy-chart", settings.frameworkThemes.Literacy.chart);
  root.style.setProperty("--numeracy-accent", settings.frameworkThemes.Numeracy.primary);
  root.style.setProperty("--numeracy-soft", settings.frameworkThemes.Numeracy.pale);
  root.style.setProperty("--numeracy-text", settings.frameworkThemes.Numeracy.badge);
  root.style.setProperty("--numeracy-chart", settings.frameworkThemes.Numeracy.chart);
  root.style.setProperty("--dcf-accent", settings.frameworkThemes.DCF.primary);
  root.style.setProperty("--dcf-soft", settings.frameworkThemes.DCF.pale);
  root.style.setProperty("--dcf-text", settings.frameworkThemes.DCF.badge);
  root.style.setProperty("--dcf-chart", settings.frameworkThemes.DCF.chart);
  root.style.setProperty("--themes-accent", settings.frameworkThemes["Cross-cutting themes"].primary);
  root.style.setProperty("--themes-soft", settings.frameworkThemes["Cross-cutting themes"].pale);
  root.style.setProperty("--themes-text", settings.frameworkThemes["Cross-cutting themes"].badge);
  root.style.setProperty("--themes-chart", settings.frameworkThemes["Cross-cutting themes"].chart);
}
