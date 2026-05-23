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
  const { subjects, subjectConfigs, frameworkLibrary, crossCuttingThemes, mappings } = useCurrentSchoolData();
  const [subjectName, setSubjectName] = useState(subjects[0] ?? "");
  const [frameworkName, setFrameworkName] = useState(frameworkLibrary[0]?.name ?? "");
  const selectedFramework = frameworkLibrary.find((framework) => framework.name === frameworkName) ?? frameworkLibrary[0];
  const [strandName, setStrandName] = useState(selectedFramework?.strands[0]?.name ?? "");
  const selectedStrand = selectedFramework?.strands.find((strand) => strand.name === strandName) ?? selectedFramework?.strands[0];
  const [elementName, setElementName] = useState(selectedStrand?.elements[0]?.name ?? "");
  const selectedElement = selectedStrand?.elements.find((element) => element.name === elementName) ?? selectedStrand?.elements[0];
  const [progressionStep, setProgressionStep] = useState<ProgressionStep>("Step 3");
  const selectedSubject = subjectConfigs.find((subject) => subject.name === subjectName);
  const frameworkDiagnostics = buildFrameworkDiagnostics(frameworkLibrary);
  const themeDiagnostics = buildThemeDiagnostics(crossCuttingThemes, mappings);
  const junkFindings = findPrototypeLabels(frameworkLibrary);

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

      <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-gray-950">Framework Diagnostics</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="py-3 pr-4 font-bold">Framework</th>
                <th className="py-3 pr-4 font-bold">Strands</th>
                <th className="py-3 pr-4 font-bold">Elements</th>
                <th className="py-3 pr-4 font-bold">Descriptors</th>
                <th className="py-3 pr-4 font-bold">Missing progression steps</th>
              </tr>
            </thead>
            <tbody>
              {frameworkDiagnostics.map((row) => (
                <tr key={row.framework} className="border-b border-gray-100">
                  <td className="py-3 pr-4 font-semibold text-gray-900">{row.framework}</td>
                  <td className="py-3 pr-4 text-gray-700">{row.strands}</td>
                  <td className="py-3 pr-4 text-gray-700">{row.elements}</td>
                  <td className="py-3 pr-4 text-gray-700">{row.descriptors}</td>
                  <td className="py-3 pr-4 text-gray-700">{row.missingSteps.length ? row.missingSteps.join(", ") : "None detected"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <DiagnosticCard label="Orphan strands" value="Run SQL diagnostic" />
          <DiagnosticCard label="Orphan elements" value="Run SQL diagnostic" />
          <DiagnosticCard label="Orphan descriptors" value="Run SQL diagnostic" />
        </div>
      </article>

      <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-gray-950">Theme Diagnostics</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {themeDiagnostics.themeCounts.map((theme) => (
            <DiagnosticCard key={theme.name} label={theme.name} value={`${theme.count} linked mapping${theme.count === 1 ? "" : "s"}`} />
          ))}
          <DiagnosticCard label="Mappings with no theme links" value={String(themeDiagnostics.mappingsWithoutThemes)} />
          <DiagnosticCard label="Theme links without valid mapping/theme" value="Run SQL diagnostic" />
        </div>
      </article>

      {junkFindings.length ? (
        <article className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-800 shadow-sm">
          Old/prototype labels still appear active: {junkFindings.join(", ")}
        </article>
      ) : (
        <article className="rounded-lg border border-green-200 bg-green-50 p-5 text-sm font-bold text-green-800 shadow-sm">
          No old/prototype labels detected in the active app framework library.
        </article>
      )}

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

function DiagnosticCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-gray-50 p-3">
      <div className="text-xs font-bold uppercase tracking-widest text-gray-500">{label}</div>
      <div className="mt-1 font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function buildFrameworkDiagnostics(frameworkLibrary: FrameworkDefinition[]) {
  return frameworkLibrary.map((framework) => {
    const elementRows = framework.strands.flatMap((strand) => strand.elements.map((element) => ({ strand: strand.name, element })));
    const missingSteps = elementRows.flatMap(({ strand, element }) =>
      steps
        .filter((step) => {
          if (framework.shortName === "DCF" && (step === "Step 1" || step === "Step 2")) return false;
          return !element.progressionDescriptors[step];
        })
        .map((step) => `${strand} / ${element.name}: ${step}`)
    );
    return {
      framework: framework.name,
      strands: framework.strands.length,
      elements: elementRows.length,
      descriptors: elementRows.reduce((sum, row) => sum + Object.values(row.element.progressionDescriptors).filter(Boolean).length, 0),
      missingSteps
    };
  });
}

function buildThemeDiagnostics(crossCuttingThemes: { id: string; name: string; active: boolean }[], mappings: { crossCuttingThemeIds?: string[]; crossCuttingThemes?: string[] }[]) {
  const activeThemes = crossCuttingThemes.filter((theme) => theme.active);
  return {
    themeCounts: activeThemes.map((theme) => ({
      name: theme.name,
      count: mappings.filter((mapping) => (mapping.crossCuttingThemeIds?.includes(theme.id) ?? false) || (mapping.crossCuttingThemes?.includes(theme.name) ?? false)).length
    })),
    mappingsWithoutThemes: mappings.filter((mapping) => (mapping.crossCuttingThemeIds?.length ?? mapping.crossCuttingThemes?.length ?? 0) === 0).length
  };
}

function findPrototypeLabels(frameworkLibrary: FrameworkDefinition[]) {
  const blocked = new Set([
    "Using number skills",
    "Use of calculation",
    "Using measuring skills",
    "Using data skills",
    "Developing numerical reasoning",
    "Oracy",
    "Planning writing",
    "Technical accuracy",
    "Identity and wellbeing",
    "Evaluating outputs",
    "Culture and community"
  ]);
  const labels = frameworkLibrary.flatMap((framework) => [framework.name, ...framework.strands.flatMap((strand) => [strand.name, ...strand.elements.map((element) => element.name)])]);
  return labels.filter((label) => blocked.has(label));
}
