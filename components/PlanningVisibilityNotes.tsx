"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { FrameworkCoverage, ReviewItem } from "@/lib/types";
import type { AreaTheme } from "@/lib/theme";

type ModalType = "distribution" | "unmapped" | null;

const wholeSchoolActions: Record<string, { href: string; label: string }> = {
  "Year 11 visibility": { href: "/curriculum-explorer", label: "Open mappings" },
  "Framework balance": { href: "/progression-overview", label: "Open overview" },
  "Curriculum review": { href: "/review-summary", label: "Open summary" },
  "DCF progression": { href: "/progression-overview", label: "Open overview" },
  "Numeracy in Arts": { href: "/curriculum-explorer", label: "Open mappings" }
};

export function PlanningVisibilityNotes({
  items,
  coverage,
  theme
}: {
  items: ReviewItem[];
  coverage?: FrameworkCoverage;
  theme: AreaTheme;
}) {
  const [modal, setModal] = useState<ModalType>(null);
  const browserHref = coverage ? `/framework-browser?framework=${encodeURIComponent(coverage.framework)}` : "/framework-browser";

  return (
    <article className="rounded-lg border bg-white p-5 shadow-sm" style={{ borderColor: theme.border }}>
      <h2 className="text-lg font-bold text-gray-900">Planning Visibility Notes</h2>
      <div className="mt-4 space-y-3">
        {items.map((item) => {
          if (item.title === "Element library") {
            return (
              <Link key={item.title} href={browserHref} className="focus-ring block rounded-md border p-4 transition hover:shadow-sm" style={{ borderColor: theme.border }}>
                <NoteContent item={item} theme={theme} action="Open browser" />
              </Link>
            );
          }

          if (!coverage) {
            const action = wholeSchoolActions[item.title] ?? { href: "/curriculum-explorer", label: "Open mappings" };
            return (
              <Link key={item.title} href={action.href} className="focus-ring block rounded-md border p-4 transition hover:shadow-sm" style={{ borderColor: theme.border }}>
                <NoteContent item={item} theme={theme} action={action.label} />
              </Link>
            );
          }

          const modalType = item.title === "Unmapped elements" ? "unmapped" : "distribution";

          return (
            <button
              key={item.title}
              className="focus-ring block w-full rounded-md border p-4 text-left transition hover:shadow-sm"
              style={{ borderColor: theme.border }}
              type="button"
              onClick={() => setModal(modalType)}
            >
              <NoteContent item={item} theme={theme} action="View details" />
            </button>
          );
        })}
      </div>

      {modal && coverage ? <NotesModal modal={modal} coverage={coverage} theme={theme} onClose={() => setModal(null)} /> : null}
    </article>
  );
}

function NoteContent({ item, theme, action }: { item: ReviewItem; theme: AreaTheme; action: string }) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold text-gray-900">{item.title}</h3>
        <span className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ backgroundColor: theme.soft, color: theme.text }}>
          {item.status}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-gray-600">{item.description}</p>
      <div className="mt-3 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: theme.accent }}>
        {action}
      </div>
    </>
  );
}

function NotesModal({
  modal,
  coverage,
  theme,
  onClose
}: {
  modal: Exclude<ModalType, null>;
  coverage: FrameworkCoverage;
  theme: AreaTheme;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 px-4 py-6" role="dialog" aria-modal="true">
      <div className="max-h-[86vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-5 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 pb-4">
          <div>
            <div className="text-sm font-bold uppercase tracking-[0.14em]" style={{ color: theme.accent }}>
              {coverage.framework}
            </div>
            <h2 className="mt-1 text-2xl font-bold text-gray-950">{modal === "distribution" ? "Distribution by Strand" : "Unmapped Elements"}</h2>
          </div>
          <button className="focus-ring rounded-md px-3 py-2 text-sm font-bold" style={{ backgroundColor: theme.soft, color: theme.text }} type="button" onClick={onClose}>
            Close
          </button>
        </div>

        {modal === "distribution" ? <DistributionDetail coverage={coverage} theme={theme} /> : <UnmappedDetail coverage={coverage} theme={theme} />}
      </div>
    </div>
  );
}

function DistributionDetail({ coverage, theme }: { coverage: FrameworkCoverage; theme: AreaTheme }) {
  const rows = useMemo(
    () =>
      coverage.strands.map((strand) => ({
        strand: strand.strand,
        count: strand.count,
        subjects: unique(strand.elements.flatMap((item) => (item.count ? item.subjects : []))),
        yearGroups: unique(strand.elements.flatMap((item) => (item.count ? item.yearGroups : [])))
      })),
    [coverage]
  );

  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-gray-500">
            <th className="py-3 pr-4 font-bold">Strand name</th>
            <th className="py-3 pr-4 font-bold">Number of mapped opportunities</th>
            <th className="py-3 pr-4 font-bold">Subjects mapped</th>
            <th className="py-3 pr-4 font-bold">Year groups mapped</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.strand} className="border-b border-gray-100">
              <td className="py-3 pr-4 font-bold" style={{ color: theme.text }}>
                {row.strand}
              </td>
              <td className="py-3 pr-4 text-gray-700">{row.count}</td>
              <td className="py-3 pr-4 text-gray-700">{row.subjects.join(", ") || "Not currently mapped"}</td>
              <td className="py-3 pr-4 text-gray-700">{row.yearGroups.join(", ") || "Not currently mapped"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UnmappedDetail({ coverage, theme }: { coverage: FrameworkCoverage; theme: AreaTheme }) {
  return (
    <div className="mt-5 grid gap-3 md:grid-cols-2">
      {coverage.unmappedElements.map((element) => (
        <div key={`${element.strand}-${element.element}`} className="rounded-md border p-4" style={{ borderColor: theme.border, backgroundColor: theme.soft }}>
          <div className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: theme.accent }}>
            {element.strand}
          </div>
          <h3 className="mt-1 font-bold text-gray-950">{element.element}</h3>
          <p className="mt-2 text-sm text-gray-700">No current mappings.</p>
        </div>
      ))}
      {!coverage.unmappedElements.length ? <p className="text-sm text-gray-600">All elements in this framework currently have mappings.</p> : null}
    </div>
  );
}

function unique(items: string[]) {
  return Array.from(new Set(items)).filter(Boolean);
}
