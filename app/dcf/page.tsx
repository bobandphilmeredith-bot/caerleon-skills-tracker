"use client";

import { DashboardPage } from "@/components/DashboardPage";
import { useCurrentSchoolData } from "@/lib/currentSchool";

export default function DcfPage() {
  const data = useCurrentSchoolData();
  return <DashboardPage dashboard={data.dcfDashboard} />;
}
