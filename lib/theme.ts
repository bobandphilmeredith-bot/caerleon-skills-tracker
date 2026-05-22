export type AreaTheme = {
  name: string;
  accent: string;
  strong: string;
  soft: string;
  border: string;
  text: string;
  contrast: string;
  heat: string[];
};

export const areaThemes: Record<string, AreaTheme> = {
  overview: {
    name: "Overview",
    accent: "var(--school-primary, #741B47)",
    strong: "var(--school-secondary, #571435)",
    soft: "#F7EDF3",
    border: "color-mix(in srgb, var(--school-primary, #741B47) 24%, white)",
    text: "var(--school-secondary, #571435)",
    contrast: "#FFFFFF",
    heat: [
      "#F7EDF3",
      "color-mix(in srgb, var(--school-primary, #741B47) 18%, #F7EDF3)",
      "color-mix(in srgb, var(--school-primary, #741B47) 42%, #F7EDF3)",
      "var(--school-primary, #741B47)",
      "color-mix(in srgb, var(--school-primary, #741B47) 78%, #111827)"
    ]
  },
  literacy: {
    name: "Literacy",
    accent: "var(--literacy-accent, #EA580C)",
    strong: "var(--literacy-text, #9A3412)",
    soft: "var(--literacy-soft, #FFF7ED)",
    border: "color-mix(in srgb, var(--literacy-accent, #EA580C) 24%, white)",
    text: "var(--literacy-text, #9A3412)",
    contrast: "#FFFFFF",
    heat: [
      "var(--literacy-soft, #FFF7ED)",
      "color-mix(in srgb, var(--literacy-chart, #EA580C) 20%, var(--literacy-soft, #FFF7ED))",
      "color-mix(in srgb, var(--literacy-chart, #EA580C) 48%, var(--literacy-soft, #FFF7ED))",
      "var(--literacy-chart, #EA580C)",
      "color-mix(in srgb, var(--literacy-chart, #EA580C) 78%, var(--literacy-text, #9A3412))"
    ]
  },
  numeracy: {
    name: "Numeracy",
    accent: "var(--numeracy-accent, #2563EB)",
    strong: "var(--numeracy-text, #1E3A8A)",
    soft: "var(--numeracy-soft, #EFF6FF)",
    border: "color-mix(in srgb, var(--numeracy-accent, #2563EB) 24%, white)",
    text: "var(--numeracy-text, #1E3A8A)",
    contrast: "#FFFFFF",
    heat: [
      "var(--numeracy-soft, #EFF6FF)",
      "color-mix(in srgb, var(--numeracy-chart, #2563EB) 20%, var(--numeracy-soft, #EFF6FF))",
      "color-mix(in srgb, var(--numeracy-chart, #2563EB) 48%, var(--numeracy-soft, #EFF6FF))",
      "var(--numeracy-chart, #2563EB)",
      "color-mix(in srgb, var(--numeracy-chart, #2563EB) 78%, var(--numeracy-text, #1E3A8A))"
    ]
  },
  dcf: {
    name: "DCF",
    accent: "var(--dcf-accent, #CA8A04)",
    strong: "var(--dcf-text, #854D0E)",
    soft: "var(--dcf-soft, #FEFCE8)",
    border: "color-mix(in srgb, var(--dcf-accent, #CA8A04) 24%, white)",
    text: "var(--dcf-text, #854D0E)",
    contrast: "#FFFFFF",
    heat: [
      "var(--dcf-soft, #FEFCE8)",
      "color-mix(in srgb, var(--dcf-chart, #CA8A04) 20%, var(--dcf-soft, #FEFCE8))",
      "color-mix(in srgb, var(--dcf-chart, #CA8A04) 48%, var(--dcf-soft, #FEFCE8))",
      "var(--dcf-chart, #CA8A04)",
      "color-mix(in srgb, var(--dcf-chart, #CA8A04) 78%, var(--dcf-text, #854D0E))"
    ]
  },
  themes: {
    name: "CCT",
    accent: "var(--themes-accent, #15803D)",
    strong: "var(--themes-text, #166534)",
    soft: "var(--themes-soft, #F0FDF4)",
    border: "color-mix(in srgb, var(--themes-accent, #15803D) 24%, white)",
    text: "var(--themes-text, #166534)",
    contrast: "#FFFFFF",
    heat: [
      "var(--themes-soft, #F0FDF4)",
      "color-mix(in srgb, var(--themes-chart, #15803D) 20%, var(--themes-soft, #F0FDF4))",
      "color-mix(in srgb, var(--themes-chart, #15803D) 48%, var(--themes-soft, #F0FDF4))",
      "var(--themes-chart, #15803D)",
      "color-mix(in srgb, var(--themes-chart, #15803D) 78%, var(--themes-text, #166534))"
    ]
  }
};

export function themeForFramework(framework?: string) {
  if (!framework) return areaThemes.overview;
  if (framework === "Literacy" || framework === "Literacy Framework") return areaThemes.literacy;
  if (framework === "Numeracy" || framework === "Numeracy Framework") return areaThemes.numeracy;
  if (framework === "Digital Competence Framework" || framework === "DCF") return areaThemes.dcf;
  if (framework === "Cross-cutting Themes" || framework === "Cross-cutting themes" || framework === "Themes") return areaThemes.themes;
  return areaThemes.overview;
}

export function themeForDashboard(title: string, framework?: string) {
  if (framework) return themeForFramework(framework);
  if (title.includes("Whole-school") || title.includes("Overview")) return areaThemes.overview;
  return areaThemes.overview;
}
