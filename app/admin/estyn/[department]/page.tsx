import { notFound } from "next/navigation";
import { InspectionReport } from "@/components/reports/InspectionReport";
import { inspectionDepartments } from "@/lib/inspectionSummary";

export function generateStaticParams() {
  return inspectionDepartments.map(({ slug }) => ({ department: slug }));
}

export default async function DepartmentInspectionPage({ params }: { params: Promise<{ department: string }> }) {
  const { department } = await params;
  if (!inspectionDepartments.some((item) => item.slug === department)) notFound();
  return <InspectionReport departmentSlug={department} />;
}
