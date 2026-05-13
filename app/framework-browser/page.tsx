"use client";

import { FrameworkBrowser } from "@/components/FrameworkBrowser";
import { PageHeader } from "@/components/PageHeader";
import { areaThemes } from "@/lib/theme";

export default function FrameworkBrowserPage() {
  return (
    <section className="space-y-6">
      <PageHeader
        title="Framework Browser"
        eyebrow="Curriculum library"
        description="Browse strands and elements with teacher-friendly explanations and example classroom opportunities before creating a mapping entry."
        accent={areaThemes.overview.accent}
      />
      <FrameworkBrowser />
    </section>
  );
}
