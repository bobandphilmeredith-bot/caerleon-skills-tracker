"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { CrossCuttingTheme, Dashboard, FrameworkCoverage, MappingEntry } from "@/lib/types";
import type { AreaTheme } from "@/lib/theme";

type CoverageAlert = {
  title: string;
  description: string;
  status: string;
  href: string;
  action: string;
};

export function CoverageAlerts({
  dashboard,
  mappings,
  subjects,
  yearGroups,
  frameworkCoverage,
  crossCuttingThemes,
  theme
}: {
  dashboard: Dashboard;
  mappings: MappingEntry[];
  subjects: string[];
  yearGroups: string[];
  frameworkCoverage: Record<string, FrameworkCoverage>;
  crossCuttingThemes: CrossCuttingTheme[];
  theme: AreaTheme;
}) {
  const alerts = useMemo(
    () => buildCoverageAlerts({ dashboard, mappings, subjects, yearGroups, frameworkCoverage, crossCuttingThemes }),
    [crossCuttingThemes, dashboard, frameworkCoverage, mappings, subjects, yearGroups]
  );

  return (
    <article className="rounded-lg border bg-white p-5 shadow-sm" style={{ borderColor: theme.border }}>
      <h2 className="text-lg font-bold text-gray-900">Coverage Alerts</h2>
      <p className="mt-2 text-sm leading-6 text-gray-600">Use this section to identify year groups, subjects or frameworks with limited mapping evidence.</p>

      <div className="mt-4 space-y-3">
        {alerts.length ? (
          alerts.map((alert) => (
            <Link key={`${alert.title}-${alert.description}`} href={alert.href} className="focus-ring block rounded-md border p-4 transition hover:shadow-sm" style={{ borderColor: theme.border }}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-bold text-gray-900">{alert.title}</h3>
                <span className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ backgroundColor: theme.soft, color: theme.text }}>
                  {alert.status}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-gray-600">{alert.description}</p>
              <div className="mt-3 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: theme.accent }}>
                {alert.action}
              </div>
            </Link>
          ))
        ) : (
          <p className="rounded-md bg-gray-50 p-4 text-sm leading-6 text-gray-600">No coverage alerts at the moment. Continue reviewing subject and framework coverage below.</p>
        )}
      </div>
    </article>
  );
}

function buildCoverageAlerts({
  dashboard,
  mappings,
  subjects,
  yearGroups,
  frameworkCoverage,
  crossCuttingThemes
}: {
  dashboard: Dashboard;
  mappings: MappingEntry[];
  subjects: string[];
  yearGroups: string[];
  frameworkCoverage: Record<string, FrameworkCoverage>;
  crossCuttingThemes: CrossCuttingTheme[];
}) {
  const alerts: CoverageAlert[] = [];
  const dashboardCoverage = dashboard.coverage;

  if (dashboardCoverage) {
    if (!dashboardCoverage.total) {
      alerts.push({
        title: `${dashboardCoverage.framework} has no mappings yet`,
        description: "No curriculum activities are currently linked to this framework.",
        status: "Needs evidence",
        href: "/add-entry",
        action: "Map skills"
      });
    }

    const unmappedStrands = dashboardCoverage.strands.filter((strand) => strand.count === 0).slice(0, 3);
    for (const strand of unmappedStrands) {
      alerts.push({
        title: `${strandLabel(strand)} has no mappings`,
        description: `${dashboardCoverage.framework} currently has no mapped opportunities for this strand.`,
        status: "Gap",
        href: "/curriculum-explorer",
        action: "Open mappings"
      });
    }

    if (dashboardCoverage.unmappedElements.length) {
      alerts.push({
        title: `${dashboardCoverage.unmappedElements.length} elements have no evidence`,
        description: "Some framework elements are not currently linked to curriculum activities.",
        status: "Review",
        href: `/framework-browser?framework=${encodeURIComponent(dashboardCoverage.framework)}`,
        action: "Open browser"
      });
    }

    return alerts.slice(0, 5);
  }

  const unmappedYearGroups = yearGroups.filter((year) => !mappings.some((entry) => entry.year === year));
  if (unmappedYearGroups.length) {
    alerts.push({
      title: `${unmappedYearGroups.length} year groups have no mappings`,
      description: `No mapped opportunities found for ${unmappedYearGroups.slice(0, 3).join(", ")}${unmappedYearGroups.length > 3 ? " and others" : ""}.`,
      status: "Gap",
      href: "/curriculum-explorer",
      action: "Open mappings"
    });
  }

  const unmappedSubjects = subjects.filter((subject) => !mappings.some((entry) => entry.subject === subject));
  if (unmappedSubjects.length) {
    alerts.push({
      title: `${unmappedSubjects.length} subjects have no mappings`,
      description: `No mapped opportunities found for ${unmappedSubjects.slice(0, 3).join(", ")}${unmappedSubjects.length > 3 ? " and others" : ""}.`,
      status: "Gap",
      href: "/subject-overview",
      action: "Open subjects"
    });
  }

  for (const coverage of Object.values(frameworkCoverage)) {
    if (!coverage.total) {
      alerts.push({
        title: `${coverage.framework} has no mappings`,
        description: "No curriculum activities are currently linked to this framework.",
        status: "Needs evidence",
        href: "/add-entry",
        action: "Map skills"
      });
    } else if (coverage.unmappedElements.length >= Math.ceil(coverage.strands.reduce((sum, strand) => sum + strand.elements.length, 0) / 2)) {
      alerts.push({
        title: `${coverage.framework} has limited element coverage`,
        description: `${coverage.unmappedElements.length} elements are not currently linked to curriculum activities.`,
        status: "Review",
        href: "/progression-overview",
        action: "Open overview"
      });
    }
  }

  const themesWithoutEvidence = crossCuttingThemes
    .filter((theme) => theme.active)
    .filter((theme) => !mappings.some((entry) => entry.crossCuttingThemeIds?.includes(theme.id) || entry.crossCuttingThemes?.includes(theme.name)));
  if (themesWithoutEvidence.length) {
    alerts.push({
      title: `${themesWithoutEvidence.length} CCT themes have no evidence`,
      description: `No theme links found for ${themesWithoutEvidence.slice(0, 2).map((theme) => theme.name).join(", ")}${themesWithoutEvidence.length > 2 ? " and others" : ""}.`,
      status: "Review",
      href: "/themes",
      action: "Open themes"
    });
  }

  return alerts.slice(0, 5);
}

function strandLabel(strand: { strand: string; strandShortName?: string | null }) {
  return strand.strandShortName ?? strand.strand;
}
