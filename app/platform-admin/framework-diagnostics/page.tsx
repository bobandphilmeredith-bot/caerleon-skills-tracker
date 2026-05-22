"use client";

import { useMemo, useState } from "react";
import { AccessDenied } from "@/components/AccessDenied";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/lib/auth";
import { useCurrentSchool, useCurrentSchoolData } from "@/lib/currentSchool";
import { areaThemes } from "@/lib/theme";
import type { FrameworkDefinition, ProgressionStep, StrandDefinition } from "@/lib/types";

const steps: ProgressionStep[] = ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"];

export default function FrameworkDiagnosticsPage() {
  const { currentUser, canManagePlatform } = useAuth();
  const { currentSchoolId } = useCurrentSchool();
  const { subjects, subjectConfigs, frameworkLibrary } = useCurrentSchoolData();
  const [subjectName, setSubjectName] = useState(subjects[0] ?? "");
  const [frameworkName, setFrameworkName] = useState(frameworkLibrary[0]?.name ?? "");
  const selectedFramework = frameworkLibrary.find((framework) => framework.name === frameworkName) ?? frameworkLibrary[0];
  const [strandName, setStrandName] = useState(selectedFramework?.strands[0]?.name ?? "");
  const selectedStrand = selectedFramework?.strands.find((strand) => strand.name === strandName) ?? selectedFramework?.strands[0];
  const [elementName, setElementName] = useState(selectedStrand?.elements[0]?.name ?? "");
  const selectedElement = selectedStrand?.elements.find((element) => element.name === elementName) ?? selectedStrand?.elements[0];
  const [progressionStep, setProgressionStep] = useState<ProgressionStep>("Step 3");
  const selectedSubject = subjectConfigs.find((subject) => subject.name === subjectName);

  const payload = useMemo(
    () => ({
      school_id: currentSchoolId,
      subject_id: selectedSubject?.id ?? null,
      framework_id: selectedFramework?.id ?? null,
      strand_id: selectedStrand?.id ?? null,
      element_id: selectedElement?.id ?? null,
      progression_step: progressionStep,
      progression_descriptor_id: null,
      user_id: currentUser?.id ?? null,
      role: currentUser?.role ?? null
    }),
    [currentSchoolId, currentUser?.id, currentUser?.role, progressionStep, selectedElement?.id, selectedFramework?.id, selectedStrand?.id, selectedSubject?.id]
  );

  if (!canManagePlatform) {
    return <AccessDenied title="Platform admin restricted" message="Only platform admins can view framework diagnostics." />;
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Framework Diagnostics"
        eyebrow="Platform admin"
        description="Check the IDs the mapping form will use before a curriculum entry is saved."
        accent={areaThemes.overview.accent}
      />

      <div className="grid gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm lg:grid-cols-2">
        <DiagnosticSelect label="Subject" value={subjectName} options={subjects} onChange={setSubjectName} />
        <DiagnosticSelect
          label="Framework"
          value={selectedFramework?.name ?? ""}
          options={frameworkLibrary.map((framework) => framework.name)}
          onChange={(value) => {
            const nextFramework = frameworkLibrary.find((framework) => framework.name === value) as FrameworkDefinition | undefined;
            setFrameworkName(value);
            setStrandName(nextFramework?.strands[0]?.name ?? "");
            setElementName(nextFramework?.strands[0]?.elements[0]?.name ?? "");
          }}
        />
        <DiagnosticSelect
          label="Strand"
          value={selectedStrand?.name ?? ""}
          options={selectedFramework?.strands.map((strand) => strand.name) ?? []}
          onChange={(value) => {
            const nextStrand = selectedFramework?.strands.find((strand) => strand.name === value) as StrandDefinition | undefined;
            setStrandName(value);
            setElementName(nextStrand?.elements[0]?.name ?? "");
          }}
        />
        <DiagnosticSelect label="Element" value={selectedElement?.name ?? ""} options={selectedStrand?.elements.map((element) => element.name) ?? []} onChange={setElementName} />
        <DiagnosticSelect label="Progression descriptor" value={progressionStep} options={steps} onChange={(value) => setProgressionStep(value as ProgressionStep)} />
      </div>

      <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-gray-950">Selected IDs</h2>
        <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
          {Object.entries(payload).map(([key, value]) => (
            <div key={key} className="rounded-md bg-gray-50 p-3">
              <dt className="text-xs font-bold uppercase tracking-widest text-gray-500">{key}</dt>
              <dd className="mt-1 break-words font-mono text-gray-900">{value ?? "Not available"}</dd>
            </div>
          ))}
        </dl>
      </article>

      <article className="rounded-lg border border-gray-200 bg-gray-950 p-5 text-sm text-white shadow-sm">
        <h2 className="text-lg font-bold">Final save payload preview</h2>
        <pre className="mt-4 overflow-auto rounded-md bg-black/40 p-4 text-xs leading-6">{JSON.stringify(payload, null, 2)}</pre>
      </article>
    </section>
  );
}

function DiagnosticSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-gray-700">{label}</span>
      <select className="focus-ring w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-950" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
