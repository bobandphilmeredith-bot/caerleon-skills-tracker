"use client";

import { useState } from "react";
import { matchingFrameworkReferences } from "@/lib/mappingFrameworks";
import type { FrameworkCoverage, MappingEntry, StrandCoverage } from "@/lib/types";
import { areaThemes, type AreaTheme } from "@/lib/theme";

const allYears = "All years";

export function FrameworkCoveragePanel({ coverage, entries = [], yearGroups = [], theme = areaThemes.overview }: { coverage: FrameworkCoverage; entries?: MappingEntry[]; yearGroups?: string[]; theme?: AreaTheme }) {
  const [selectedStrand, setSelectedStrand] = useState(coverage.strands[0]?.strand ?? "");
  const strand = coverage.strands.find((item) => item.strand === selectedStrand) ?? coverage.strands[0];

  if (!strand) return null;

  return (
    <div className="space-y-5">
      <FrameworkUsageLeague coverage={coverage} entries={entries} yearGroups={yearGroups} theme={theme} />

      <article className="rounded-lg border bg-white p-5 shadow-sm" style={{ borderColor: theme.border }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Strand and Element Coverage</h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">Click a strand to see the elements underneath it.</p>
          </div>
          <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: theme.soft, color: theme.text }}>
            {coverage.total} mapped opportunities
          </span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {coverage.strands.map((item) => (
            <button
              key={item.strand}
              className={`focus-ring rounded-lg border p-4 text-left transition ${
                item.strand === selectedStrand ? "" : "border-gray-200 bg-white"
              }`}
              style={item.strand === selectedStrand ? { borderColor: theme.accent, backgroundColor: theme.soft } : { borderColor: "#e5e7eb" }}
              type="button"
              onClick={() => setSelectedStrand(item.strand)}
              title={item.strand}
            >
              <div className="text-sm font-bold leading-snug text-gray-900">{strandLabel(item)}</div>
              <div className="mt-3 text-3xl font-bold" style={{ color: theme.accent }}>
                {item.count}
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full" style={{ width: `${item.percentage}%`, backgroundColor: theme.accent }} />
              </div>
              <div className="mt-2 text-xs font-semibold text-gray-500">{item.percentage}% of mapped opportunities</div>
            </button>
          ))}
        </div>

        <StrandDetail strand={strand} theme={theme} />
      </article>

      <div className="grid gap-5 lg:grid-cols-2">
        <SummaryList title="Most Frequently Mapped Elements" rows={coverage.mostMappedElements} emptyText="No mapped elements yet." theme={theme} />
        <SummaryList title="Elements With No Current Mappings" rows={coverage.unmappedElements} emptyText="All elements currently have mappings." theme={theme} />
      </div>

      <ElementCoverageTable coverage={coverage} theme={theme} />
    </div>
  );
}

function StrandDetail({ strand, theme }: { strand: StrandCoverage; theme: AreaTheme }) {
  return (
    <div className="mt-5 rounded-lg border p-4" style={{ borderColor: theme.border, backgroundColor: theme.soft }}>
      <h3 className="font-bold" style={{ color: theme.text }}>
        {strandLabel(strand)} Elements
      </h3>
      {strand.strandShortName && strand.strandShortName !== strand.strand ? <p className="mt-1 text-sm leading-6 text-gray-700">{strand.strand}</p> : null}
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {strand.elements.map((item) => (
          <div key={item.element} className="rounded-md bg-white p-3">
            <div className="text-sm font-bold text-gray-900">{item.element}</div>
            <div className="mt-2 text-2xl font-bold" style={{ color: theme.accent }}>
              {item.count}
            </div>
            <div className="text-xs font-semibold text-gray-500">mapped opportunities</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FrameworkUsageLeague({ coverage, entries, yearGroups, theme }: { coverage: FrameworkCoverage; entries: MappingEntry[]; yearGroups: string[]; theme: AreaTheme }) {
  const [selectedYear, setSelectedYear] = useState(allYears);
  const [view, setView] = useState<"strands" | "most" | "least">("strands");
  const references = entries
    .filter((entry) => selectedYear === allYears || entry.year === selectedYear)
    .flatMap((entry) =>
      matchingFrameworkReferences(entry, coverage.framework).map((reference) => ({
        entry,
        reference
      }))
    );
  const totalReferences = references.length;
  const mappedEntryCount = new Set(references.map((item) => item.entry.id)).size;
  const strandRows = coverage.strands
    .map((strand) => {
      const matching = references.filter((item) => item.reference.strand === strand.strand);
      return {
        label: strandLabel(strand),
        title: strand.strand,
        count: matching.length,
        entryCount: new Set(matching.map((item) => item.entry.id)).size,
        percentage: percent(matching.length, totalReferences)
      };
    })
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  const elementRows = coverage.strands
    .flatMap((strand) =>
      strand.elements.map((element) => {
        const matching = references.filter((item) => item.reference.strand === strand.strand && item.reference.element === element.element);
        return {
          label: element.element,
          strand: strandLabel(element),
          title: element.strand,
          count: matching.length,
          entryCount: new Set(matching.map((item) => item.entry.id)).size,
          percentage: percent(matching.length, totalReferences)
        };
      })
    );
  const visibleRows =
    view === "strands"
      ? strandRows
      : view === "most"
        ? [...elementRows].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)).slice(0, 10)
        : [...elementRows].sort((a, b) => a.count - b.count || a.label.localeCompare(b.label)).slice(0, 10);

  return (
    <article className="rounded-lg border bg-white p-5 shadow-sm" style={{ borderColor: theme.border }}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Framework Usage League Table</h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            Compare which strands and elements are being used most or least in mapped curriculum entries.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="focus-ring rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-800" value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)}>
            {[allYears, ...yearGroups].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <LeagueTab label="Strands" selected={view === "strands"} onClick={() => setView("strands")} theme={theme} />
        <LeagueTab label="Most used elements" selected={view === "most"} onClick={() => setView("most")} theme={theme} />
        <LeagueTab label="Least used elements" selected={view === "least"} onClick={() => setView("least")} theme={theme} />
      </div>

      <div className="mt-4 rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-bold text-gray-900">
            {totalReferences} {totalReferences === 1 ? "reference" : "references"} across {mappedEntryCount} {mappedEntryCount === 1 ? "entry" : "entries"}
          </p>
          <p className="text-xs font-semibold text-gray-500">Percentages show share of {selectedYear === allYears ? "all" : selectedYear} {coverage.framework} references.</p>
        </div>
        <div className="mt-4 space-y-3">
          {visibleRows.map((row) => (
            <LeagueRow key={`${view}-${row.title}-${row.label}`} row={row} theme={theme} />
          ))}
          {!visibleRows.length ? <p className="text-sm text-gray-600">No framework references are mapped for this selection yet.</p> : null}
        </div>
      </div>
    </article>
  );
}

function LeagueTab({ label, selected, onClick, theme }: { label: string; selected: boolean; onClick: () => void; theme: AreaTheme }) {
  return (
    <button
      className="focus-ring rounded-md border px-3 py-2 text-sm font-bold"
      style={selected ? { borderColor: theme.accent, backgroundColor: theme.accent, color: theme.contrast } : { borderColor: theme.border, backgroundColor: theme.soft, color: theme.text }}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function LeagueRow({ row, theme }: { row: { label: string; strand?: string; title: string; count: number; entryCount: number; percentage: number }; theme: AreaTheme }) {
  return (
    <div className="grid gap-2 rounded-md bg-gray-50 p-3 md:grid-cols-[minmax(180px,1fr)_120px_110px] md:items-center">
      <div>
        <div className="text-sm font-bold text-gray-900" title={row.title}>
          {row.label}
        </div>
        {row.strand ? (
          <div className="mt-1 text-xs font-semibold text-gray-500" title={row.title}>
            {row.strand}
          </div>
        ) : null}
      </div>
      <div className="text-sm font-bold" style={{ color: theme.text }}>
        {row.count} refs · {row.entryCount} entries
      </div>
      <div>
        <div className="flex items-center justify-between gap-2 text-xs font-bold" style={{ color: theme.text }}>
          <span>{row.percentage}%</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full" style={{ backgroundColor: theme.soft }}>
          <div className="h-full rounded-full" style={{ width: `${row.percentage}%`, backgroundColor: theme.accent }} />
        </div>
      </div>
    </div>
  );
}

function SummaryList({ title, rows, emptyText, theme }: { title: string; rows: { strand: string; strandShortName?: string | null; element: string; count: number }[]; emptyText: string; theme: AreaTheme }) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      <div className="mt-4 space-y-3">
        {rows.length ? (
          rows.map((item) => (
            <div key={`${item.strand}-${item.element}`} className="flex items-start justify-between gap-4 rounded-md bg-gray-50 p-3">
              <div>
                <div className="text-sm font-bold text-gray-900">{item.element}</div>
                <div className="mt-1 text-xs font-semibold text-gray-500" title={item.strand}>
                  {strandLabel(item)}
                </div>
              </div>
              <span className="rounded-full px-3 py-1 text-sm font-bold" style={{ backgroundColor: theme.accent, color: theme.contrast }}>
                {item.count}
              </span>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-600">{emptyText}</p>
        )}
      </div>
    </article>
  );
}

function ElementCoverageTable({ coverage, theme }: { coverage: FrameworkCoverage; theme: AreaTheme }) {
  const rows = coverage.strands.flatMap((strand) => strand.elements);

  return (
    <article className="rounded-lg border bg-white p-5 shadow-sm" style={{ borderColor: theme.border }}>
      <h2 className="text-lg font-bold text-gray-900">Element-level Coverage Table</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500">
              <th className="py-3 pr-4 font-bold">Strand</th>
              <th className="py-3 pr-4 font-bold">Element</th>
              <th className="py-3 pr-4 font-bold">Number of mapped opportunities</th>
              <th className="py-3 pr-4 font-bold">Subjects where mapped</th>
              <th className="py-3 pr-4 font-bold">Year groups where mapped</th>
              <th className="py-3 pr-4 font-bold">Last mapped date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.strand}-${row.element}`} className="border-b border-gray-100">
                <td className="py-3 pr-4 font-semibold text-gray-900" title={row.strand}>
                  {strandLabel(row)}
                </td>
                <td className="py-3 pr-4 text-gray-700">{row.element}</td>
                <td className="py-3 pr-4 text-gray-700">{row.count}</td>
                <td className="py-3 pr-4 text-gray-700">{row.count ? row.subjects.join(", ") : "Not currently mapped"}</td>
                <td className="py-3 pr-4 text-gray-700">{row.count ? row.yearGroups.join(", ") : "Not currently mapped"}</td>
                <td className="py-3 pr-4 text-gray-700">{row.lastMappedDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function strandLabel(strand: { strand: string; strandShortName?: string | null }) {
  return strand.strandShortName ?? strand.strand;
}

function percent(count: number, total: number) {
  return total ? Math.round((count / total) * 100) : 0;
}
