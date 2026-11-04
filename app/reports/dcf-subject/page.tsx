import { SubjectDcfPack } from "@/components/reports/SubjectDcfPack";

export default async function SubjectDcfPage({ searchParams }: { searchParams: Promise<{ subject?: string | string[] }> }) {
  const params = await searchParams;
  return <SubjectDcfPack initialSubject={typeof params.subject === "string" ? params.subject : ""} />;
}
