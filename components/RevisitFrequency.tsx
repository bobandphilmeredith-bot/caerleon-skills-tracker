import { useCurrentSchoolData } from "@/lib/currentSchool";
import type { AreaTheme } from "@/lib/theme";

export function RevisitFrequency({ framework, theme }: { framework?: string; theme: AreaTheme }) {
  const { mappings } = useCurrentSchoolData();
  const rows = buildRows(mappings, framework);

  return (
    <article className="rounded-lg border bg-white p-5 shadow-sm" style={{ borderColor: theme.border }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Revisit Frequency</h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">How selected elements are currently mapped across year groups, subjects and terms.</p>
        </div>
        <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: theme.soft, color: theme.text }}>
          Represented in planning
        </span>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {rows.map((row) => (
          <div key={row.element} className="rounded-md border border-gray-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-bold text-gray-900">{row.element}</h3>
              <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: theme.soft, color: theme.text }}>
                {row.count} currently mapped
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-600">Revisited across {row.yearGroups.join(", ") || "selected year groups"}.</p>
            <div className="mt-3 grid gap-2 text-xs font-semibold text-gray-600 sm:grid-cols-3">
              <span>Subjects: {row.subjects.join(", ")}</span>
              <span>Terms: {row.terms.join(", ")}</span>
              <span>{row.count <= 1 ? "Fewer recorded opportunities" : "Curriculum connections visible"}</span>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function buildRows(mappings: ReturnType<typeof useCurrentSchoolData>["mappings"], framework?: string) {
  const entries = framework ? mappings.filter((entry) => entry.framework === framework) : mappings;
  const groups = new Map<string, typeof entries>();
  entries.forEach((entry) => groups.set(entry.element, [...(groups.get(entry.element) ?? []), entry]));
  return Array.from(groups.entries())
    .map(([element, rows]) => ({
      element,
      yearGroups: unique(rows.map((row) => row.year)),
      subjects: unique(rows.map((row) => row.subject)),
      terms: unique(rows.map((row) => row.term)),
      count: rows.length
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

function unique(items: string[]) {
  return Array.from(new Set(items)).filter(Boolean);
}
