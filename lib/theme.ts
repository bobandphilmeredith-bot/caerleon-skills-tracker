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
    border: "#DDD6FE",
    text: "#4C1D95",
    contrast: "#FFFFFF",
    heat: ["#F5F3FF", "#DDD6FE", "#A78BFA", "#7C3AED", "#4C1D95"]
  },
  literacy: {
    name: "Literacy",
    accent: "var(--literacy-accent, #EA580C)",
    strong: "#9A3412",
    soft: "var(--literacy-soft, #FFF7ED)",
    border: "#FED7AA",
    text: "var(--literacy-text, #9A3412)",
    contrast: "#FFFFFF",
    heat: ["var(--literacy-soft, #FFF7ED)", "#FED7AA", "#FDBA74", "var(--literacy-chart, #EA580C)", "#9A3412"]
  },
  numeracy: {
    name: "Numeracy",
    accent: "var(--numeracy-accent, #2563EB)",
    strong: "#1E3A8A",
    soft: "var(--numeracy-soft, #EFF6FF)",
    border: "#BFDBFE",
    text: "var(--numeracy-text, #1E3A8A)",
    contrast: "#FFFFFF",
    heat: ["var(--numeracy-soft, #EFF6FF)", "#BFDBFE", "#60A5FA", "var(--numeracy-chart, #2563EB)", "#1E3A8A"]
  },
  dcf: {
    name: "DCF",
    accent: "var(--dcf-accent, #CA8A04)",
    strong: "#92400E",
    soft: "var(--dcf-soft, #FEFCE8)",
    border: "#FDE68A",
    text: "var(--dcf-text, #854D0E)",
    contrast: "#111827",
    heat: ["var(--dcf-soft, #FEFCE8)", "#FEF08A", "#FACC15", "var(--dcf-chart, #CA8A04)", "#854D0E"]
  },
  themes: {
    name: "CCT",
    accent: "var(--themes-accent, #15803D)",
    strong: "#166534",
    soft: "var(--themes-soft, #F0FDF4)",
    border: "#BBF7D0",
    text: "var(--themes-text, #166534)",
    contrast: "#FFFFFF",
    heat: ["var(--themes-soft, #F0FDF4)", "#BBF7D0", "#4ADE80", "var(--themes-chart, #15803D)", "#166534"]
  }
};

export function themeForFramework(framework?: string) {
  if (!framework) return areaThemes.overview;
  if (framework === "Literacy") return areaThemes.literacy;
  if (framework === "Numeracy") return areaThemes.numeracy;
  if (framework === "Digital Competence Framework" || framework === "DCF") return areaThemes.dcf;
  if (framework === "Cross-cutting Themes" || framework === "Cross-cutting themes" || framework === "Themes") return areaThemes.themes;
  return areaThemes.overview;
}

export function themeForDashboard(title: string, framework?: string) {
  if (framework) return themeForFramework(framework);
  if (title.includes("Whole-school") || title.includes("Overview")) return areaThemes.overview;
  return areaThemes.overview;
}
