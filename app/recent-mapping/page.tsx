"use client";

import { PageHeader } from "@/components/PageHeader";
import { useCurrentSchoolData } from "@/lib/currentSchool";
import { frameworkReferenceText, frameworkShortLabel, matchingFrameworkReferences, primaryReferenceForFramework } from "@/lib/mappingFrameworks";
import { areaThemes, themeForFramework } from "@/lib/theme";

export default function RecentMappingPage() {
  const { mappings, subjectAoleMap } = useCurrentSchoolData();
  const recentMappingFeed = [...mappings].sort((a, b) => b.lastMappedDate.localeCompare(a.lastMappedDate)).slice(0, 8);
  return (
    <section className="space-y-6">
      <PageHeader
        title="Recent Curriculum Mapping"
        eyebrow="Collaborative updates"
        description="A positive view of recent curriculum mapping updates across subjects."
        accent={areaThemes.overview.accent}
      />

      <div className="space-y-4">
        {!recentMappingFeed.length ? <p className="rounded-lg border border-gray-200 bg-white p-5 text-sm text-gray-600">No curriculum mapping entries have been created yet.</p> : null}
        {recentMappingFeed.map((item) => {
          const references = matchingFrameworkReferences(item);
          const primaryReference = primaryReferenceForFramework(item);
          const theme = themeForFramework(primaryReference?.framework ?? item.framework);
          return (
            <article key={item.id} className="rounded-lg border bg-white p-5 shadow-sm" style={{ borderColor: theme.border }}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-950">{item.subject} added a mapped opportunity</h2>
                  <p className="mt-1 text-sm font-semibold text-gray-600">
                    {references.map(frameworkReferenceText).join(", ") || "No skills references"}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-gray-500">AoLE: {subjectAoleMap[item.subject] ?? "Not set"}</p>
                </div>
                <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: theme.soft, color: theme.text }}>
                  {references.length ? references.map((reference) => frameworkShortLabel(reference.frameworkShortName ?? reference.framework)).join(", ") : "No skills"}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-gray-700">{item.activityDescription}</p>
              <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-gray-500">Date added: {item.lastMappedDate}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
