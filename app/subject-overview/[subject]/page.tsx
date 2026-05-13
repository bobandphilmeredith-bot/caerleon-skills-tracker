import { SubjectDetailPageClient } from "@/components/SubjectDetailPageClient";

export default async function SubjectDetailPage({ params }: { params: Promise<{ subject: string }> }) {
  const resolvedParams = await params;
  return <SubjectDetailPageClient subjectName={decodeURIComponent(resolvedParams.subject)} />;
}
