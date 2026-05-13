"use client";

import { useCurrentSchoolData } from "@/lib/currentSchool";
import { themeForFramework } from "@/lib/theme";

export function ThemeMaps() {
  const { mappings } = useCurrentSchoolData();
  const theme = themeForFramework("Cross-cutting Themes");
  const themeMapOutputs = ["Relationships and sexuality education", "Human rights", "Diversity", "Careers and work-related experiences"].map((strand) => {
    const entries = mappings.filter((entry) => entry.framework === "Cross-cutting Themes" && entry.strand === strand);
    return {
      theme: strand === "Relationships and sexuality education" ? "RSE" : strand,
      subjects: unique(entries.map((entry) => entry.subject)),
      yearGroups: unique(entries.map((entry) => entry.year)),
      examples: entries.map((entry) => entry.unit).slice(0, 3),
      schemeReferences: entries.map((entry) => entry.schemeReference).slice(0, 3)
    };
  });

  return (
    <article className="rounded-lg border bg-white p-5 shadow-sm" style={{ borderColor: theme.border }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Cross-curricular Theme Maps</h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">Theme visibility across subjects, year groups and example mapped activities.</p>
        </div>
        <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: theme.soft, color: theme.text }}>
          Curriculum connections
        </span>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {themeMapOutputs.map((item) => (
          <section key={item.theme} className="rounded-md border border-gray-200 p-4">
            <h3 className="font-bold" style={{ color: theme.text }}>
              {item.theme}
            </h3>
            <div className="mt-3 grid gap-3 text-sm text-gray-700 sm:grid-cols-2">
              <p>
                <span className="font-bold text-gray-900">Subjects: </span>
                {item.subjects.join(", ") || "Currently mapped in future planning examples"}
              </p>
              <p>
                <span className="font-bold text-gray-900">Year groups: </span>
                {item.yearGroups.join(", ") || "Review suggested"}
              </p>
            </div>
            <div className="mt-3 space-y-2 text-sm text-gray-700">
              {item.examples.map((example, index) => (
                <div key={example} className="rounded-md bg-gray-50 p-2">
                  {example} · {item.schemeReferences[index]}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}

function unique(items: string[]) {
  return Array.from(new Set(items)).filter(Boolean);
}
