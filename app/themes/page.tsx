"use client";

import { DashboardPage } from "@/components/DashboardPage";
import { ThemeMaps } from "@/components/ThemeMaps";
import { useCurrentSchoolData } from "@/lib/currentSchool";

export default function ThemesPage() {
  const data = useCurrentSchoolData();
  return (
    <div className="space-y-6">
      <DashboardPage dashboard={data.themesDashboard} />
      <ThemeMaps />
    </div>
  );
}
