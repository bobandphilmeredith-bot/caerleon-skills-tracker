"use client";

import { DashboardPage } from "@/components/DashboardPage";
import { useCurrentSchoolData } from "@/lib/currentSchool";

export default function Home() {
  const data = useCurrentSchoolData();
  return <DashboardPage dashboard={data.wholeSchoolDashboard} />;
}
