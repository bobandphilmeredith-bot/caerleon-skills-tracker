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
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 p-5">
        <div>
          <h2 className="font-bold text-amber-950">Subject DCF pack</h2>
          <p className="mt-1 text-sm text-amber-900">Choose a subject and download its mapped DCF tasks, references and practice questions as a PDF for Estyn preparation.</p>
        </div>
        <Link href="/reports/dcf-subject" className="focus-ring btn btn-primary">Prepare subject PDF</Link>
      </div>
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
