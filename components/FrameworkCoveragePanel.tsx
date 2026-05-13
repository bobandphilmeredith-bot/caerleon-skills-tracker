"use client";

import { useState } from "react";
import type { FrameworkCoverage, StrandCoverage } from "@/lib/types";
import { areaThemes, type AreaTheme } from "@/lib/theme";

export function FrameworkCoveragePanel({ coverage, theme = areaThemes.overview }: { coverage: FrameworkCoverage; theme?: AreaTheme }) {
  const [selectedStrand, setSelectedStrand] = useState(coverage.strands[0]?.strand ?? "");
  const strand = coverage.strands.find((item) => item.strand === selectedStrand) ?? coverage.strands[0];

  if (!strand) return null;

  return (
    <div className="space-y-5">
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
            >
              <div className="text-sm font-bold text-gray-900">{item.strand}</div>
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
        {strand.strand} Elements
      </h3>
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

function SummaryList({ title, rows, emptyText, theme }: { title: string; rows: { strand: string; element: string; count: number }[]; emptyText: string; theme: AreaTheme }) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      <div className="mt-4 space-y-3">
        {rows.length ? (
          rows.map((item) => (
            <div key={`${item.strand}-${item.element}`} className="flex items-start justify-between gap-4 rounded-md bg-gray-50 p-3">
              <div>
                <div className="text-sm font-bold text-gray-900">{item.element}</div>
                <div className="mt-1 text-xs font-semibold text-gray-500">{item.strand}</div>
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
                <td className="py-3 pr-4 font-semibold text-gray-900">{row.strand}</td>
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
