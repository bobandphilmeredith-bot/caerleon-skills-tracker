"use client";

import { DashboardPage } from "@/components/DashboardPage";
import { useCurrentSchoolData } from "@/lib/currentSchool";
import { useAuth } from "@/lib/auth";
import Link from "next/link";

export default function DcfPage() {
  const data = useCurrentSchoolData();
  const { canManageSchool } = useAuth();
  return (
    <div className="space-y-5">
      {canManageSchool ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-emerald-200 bg-emerald-50 p-5">
          <div>
            <h2 className="font-bold text-emerald-950">
              DCF management report
            </h2>
            <p className="mt-1 text-sm text-emerald-900">
              Coverage, sequencing and leadership priorities, with an evidence
              register and a printable pack for discussion with Estyn.
            </p>
          </div>
          <Link href="/reports/dcf" className="btn btn-primary">
            Open management report
          </Link>
        </div>
      ) : null}
      <DashboardPage dashboard={data.dcfDashboard} />
    </div>
  );
}
