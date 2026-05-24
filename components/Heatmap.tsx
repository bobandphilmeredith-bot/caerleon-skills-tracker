import { areaThemes, type AreaTheme } from "@/lib/theme";

export function CoverageHeatmap({
  title,
  rows,
  rowTitles,
  columns,
  values,
  theme = areaThemes.overview
}: {
  title: string;
  rows: string[];
  rowTitles?: string[];
  columns: string[];
  values: number[][];
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
              <Row key={row} row={row} title={rowTitles?.[rowIndex]} values={values[rowIndex]} theme={theme} />
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function Row({ row, title, values, theme }: { row: string; title?: string; values: number[]; theme: AreaTheme }) {
  return (
    <>
      <div className="flex min-h-12 items-center rounded-md px-3 text-sm font-bold leading-snug" style={{ backgroundColor: theme.soft, color: theme.text }} title={title}>
        {row}
      </div>
      {values.map((value, index) => (
        <div
          key={`${row}-${index}`}
          className="grid min-h-12 place-items-center rounded-md text-sm font-bold"
          style={{ backgroundColor: heatColour(value, theme), color: value > 68 ? theme.contrast : theme.text }}
          title={`${value}% mapped`}
        >
          {value}%
        </div>
      ))}
    </>
  );
}

function heatColour(value: number, theme: AreaTheme) {
  if (value >= 82) return theme.heat[4];
  if (value >= 68) return theme.heat[3];
  if (value >= 52) return theme.heat[2];
  if (value >= 36) return theme.heat[1];
  return theme.heat[0];
}
