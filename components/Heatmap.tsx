import { areaThemes, type AreaTheme } from "@/lib/theme";
import type { HeatmapCell } from "@/lib/types";

export function CoverageHeatmap({
  title,
  description,
  rows,
  rowTitles,
  columns,
  values,
  cells,
  theme = areaThemes.overview
}: {
  title: string;
  description?: string;
  rows: string[];
  rowTitles?: string[];
  columns: string[];
  values: number[][];
  cells?: HeatmapCell[][];
  theme?: AreaTheme;
}) {
  return (
    <article className="rounded-lg border bg-white p-5 shadow-sm" style={{ borderColor: theme.border }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
          <span>Fewer</span>
          <span className="h-3 w-8 rounded-sm" style={{ backgroundColor: theme.heat[0] }} />
          <span className="h-3 w-8 rounded-sm" style={{ backgroundColor: theme.heat[2] }} />
          <span className="h-3 w-8 rounded-sm" style={{ backgroundColor: theme.heat[4] }} />
          <span>More</span>
        </div>
      </div>
      {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">{description}</p> : null}
      <div className="mt-5 overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="grid gap-2" style={{ gridTemplateColumns: `150px repeat(${columns.length}, minmax(72px, 1fr))` }}>
            <div />
            {columns.map((column) => (
              <div key={column} className="text-center text-xs font-bold text-gray-500">
                {column}
              </div>
            ))}
            {rows.map((row, rowIndex) => (
              <Row key={row} row={row} title={rowTitles?.[rowIndex]} values={values[rowIndex]} cells={cells?.[rowIndex]} theme={theme} />
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function Row({ row, title, values, cells, theme }: { row: string; title?: string; values: number[]; cells?: HeatmapCell[]; theme: AreaTheme }) {
  return (
    <>
      <div className="flex min-h-12 items-center rounded-md px-3 text-sm font-bold leading-snug" style={{ backgroundColor: theme.soft, color: theme.text }} title={title}>
        {row}
      </div>
      {values.map((value, index) => {
        const cell = cells?.[index];
        const displayValue = cell?.percentage ?? value;
        const hasMappings = cell ? cell.total > 0 : true;
        return (
          <div
            key={`${row}-${index}`}
            className="grid min-h-14 place-items-center rounded-md px-2 text-center text-sm font-bold"
            style={{ backgroundColor: hasMappings ? heatColour(displayValue, theme) : theme.soft, color: hasMappings && displayValue > 68 ? theme.contrast : theme.text }}
            title={cell ? cellTitle(row, cell) : `${value}% mapped`}
          >
            {hasMappings ? (
              <span>
                <span className="block">{displayValue}%</span>
                {cell ? <span className="mt-0.5 block text-[0.68rem] font-semibold opacity-80">{cell.count} of {cell.total} entries</span> : null}
              </span>
            ) : (
              <span className="text-xs leading-4">No mappings</span>
            )}
          </div>
        );
      })}
    </>
  );
}

function cellTitle(row: string, cell: HeatmapCell) {
  if (!cell.total) return `${row}: no mappings in this year group`;
  const examples = cell.entries.slice(0, 4).map((entry) => `${entry.subject}: ${entry.schemeReference || entry.title}`).join("; ");
  return `${row}: ${cell.count} of ${cell.total} entries include this area${examples ? `. Examples: ${examples}` : ""}`;
}

function heatColour(value: number, theme: AreaTheme) {
  if (value >= 82) return theme.heat[4];
  if (value >= 68) return theme.heat[3];
  if (value >= 52) return theme.heat[2];
  if (value >= 36) return theme.heat[1];
  return theme.heat[0];
}
