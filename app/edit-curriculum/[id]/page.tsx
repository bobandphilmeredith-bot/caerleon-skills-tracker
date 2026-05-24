"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AccessDenied } from "@/components/AccessDenied";
import { CctElementSelector } from "@/components/CctElementSelector";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/lib/auth";
import { useCurrentSchool } from "@/lib/currentSchool";
import { useLiveSubjects } from "@/lib/useLiveSubjects";
import { areaThemes, themeForFramework } from "@/lib/theme";
import type {
  CrossCuttingTheme,
  ElementDefinition,
  FrameworkDefinition,
  MappingEntry,
  MappingFrameworkReference,
  ProgressionDescriptorDefinition,
  ProgressionReference,
  SelectedCctElement,
  StrandDefinition,
  SubjectConfig
} from "@/lib/types";

type EditDraft = {
  subjectId: string;
  year: string;
  term: string;
  schemeReference: string;
  activityTitle: string;
  activityDescription: string;
  frameworkReferences: MappingFrameworkReference[];
  selectedCctElements: SelectedCctElement[];
  themeNotes: string;
  frameworkId: string;
  strandId: string;
  elementId: string;
  descriptorId: string;
  frameworkNotes: string;
  showDescriptor: boolean;
};

type ThemeApiRow = {
  id: string;
  school_id: string;
  name: string;
  description: string | null;
  active: boolean | null;
  elements?: Array<{
    id: string;
    school_id: string;
    theme_id: string;
    name: string;
    description: string | null;
    display_order: number | null;
    active: boolean | null;
  }>;
};

export default function EditCurriculumMappingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { canEditMappings, canEditSubject } = useAuth();
  const { currentSchoolId, data, updateMapping } = useCurrentSchool();
  const { crossCuttingThemes, frameworkLibrary, mappings, terms, yearGroups } = data;
  const { subjects: databaseSubjects } = useLiveSubjects(currentSchoolId);
  const mappingId = Array.isArray(params.id) ? params.id[0] : params.id;
  const entry = mappings.find((item) => item.id === mappingId);
  const [themeRows, setThemeRows] = useState<CrossCuttingTheme[]>([]);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [validationMessage, setValidationMessage] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [returnSubjectId, setReturnSubjectId] = useState("");
  const [returnYear, setReturnYear] = useState("");

  const editableSubjects = useMemo(
    () =>
      databaseSubjects
        .filter((subject) => subject.active && subject.appearsInMappingDropdowns && canEditSubject(subject.name))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [canEditSubject, databaseSubjects]
  );
  const progressionFrameworks = useMemo(
    () => frameworkLibrary.filter((framework) => ["Literacy Framework", "Numeracy Framework", "Digital Competence Framework"].includes(framework.name)),
    [frameworkLibrary]
  );
  const themeOptions = useMemo(
    () => (themeRows.length ? themeRows : crossCuttingThemes).filter((theme) => theme.active && looksLikeUuid(theme.id)),
    [crossCuttingThemes, themeRows]
  );

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setReturnSubjectId(urlParams.get("subject") ?? "");
    setReturnYear(urlParams.get("year") ?? "");
  }, []);

  useEffect(() => {
    const schoolIdForThemes = looksLikeUuid(currentSchoolId) ? currentSchoolId : "";
    let cancelled = false;
    if (!schoolIdForThemes) {
      setThemeRows([]);
      return;
    }
    void fetch(`/api/themes?schoolId=${encodeURIComponent(schoolIdForThemes)}`)
      .then((response) => (response.ok ? response.json() : { themes: [] }))
      .then(({ themes }: { themes?: ThemeApiRow[] }) => {
        if (cancelled) return;
        setThemeRows((themes ?? []).map(apiThemeToTheme));
      })
      .catch(() => {
        if (!cancelled) setThemeRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [currentSchoolId]);

  useEffect(() => {
    if (!entry || draft) return;
    const firstFramework = progressionFrameworks[0];
    const firstStrand = firstFramework?.strands[0];
    const firstElement = firstStrand?.elements[0];
    const firstDescriptor = getPreferredDescriptor(availableDescriptorsFor(firstFramework, firstElement, entry.year), entry.year);
    setDraft({
      subjectId: entry.subjectId ?? "",
      year: entry.year,
      term: entry.term,
      schemeReference: entry.schemeReference,
      activityTitle: entry.unit || entry.context,
      activityDescription: entry.activityDescription,
      frameworkReferences: entry.frameworkReferences ?? [],
      selectedCctElements: entry.crossCuttingThemeElementLinks ?? [],
      themeNotes: entry.crossCuttingThemeNotes ?? "",
      frameworkId: firstFramework?.id ?? "",
      strandId: firstStrand?.id ?? "",
      elementId: firstElement?.id ?? "",
      descriptorId: firstDescriptor?.id ?? "",
      frameworkNotes: "",
      showDescriptor: false
    });
  }, [draft, entry, progressionFrameworks]);

  useEffect(() => {
    if (!draft || !themeOptions.length) return;
    const validSelections = new Set(themeOptions.flatMap((theme) => (theme.elements ?? []).map((element) => `${theme.id}:${element.id}`)));
    const nextSelection = draft.selectedCctElements.filter((item) => validSelections.has(`${item.themeId}:${item.elementId}`));
    if (nextSelection.length !== draft.selectedCctElements.length) updateDraft({ selectedCctElements: nextSelection });
  }, [draft, themeOptions]);

  if (!canEditMappings) {
    return <AccessDenied title="Edit Curriculum restricted" message="Your current role is read-only. Switch to a teacher, subject lead or school admin account to edit curriculum mappings." />;
  }

  if (!entry) {
    return (
      <section className="space-y-6">
        <PageHeader eyebrow="Curriculum Editing" title="Mapping not found" description="This curriculum mapping could not be loaded." accent={areaThemes.overview.accent} />
        <Link className="focus-ring btn btn-primary" href="/edit-curriculum">
          Back to subject browser
        </Link>
      </section>
    );
  }

  if (!canEditSubject(entry.subject)) {
    return <AccessDenied title="Subject restricted" message="You do not have permission to edit curriculum mappings for this subject." />;
  }

  function updateDraft(patch: Partial<EditDraft>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
    setValidationMessage("");
    setSaveMessage("");
  }

  function updateDraftFramework(frameworkId: string) {
    if (!draft) return;
    const framework = progressionFrameworks.find((item) => item.id === frameworkId);
    const strand = framework?.strands[0];
    const element = strand?.elements[0];
    const descriptor = getPreferredDescriptor(availableDescriptorsFor(framework, element, draft.year), draft.year);
    updateDraft({ frameworkId: framework?.id ?? "", strandId: strand?.id ?? "", elementId: element?.id ?? "", descriptorId: descriptor?.id ?? "", showDescriptor: false });
  }

  function updateDraftStrand(strandId: string) {
    if (!draft) return;
    const framework = progressionFrameworks.find((item) => item.id === draft.frameworkId);
    const strand = framework?.strands.find((item) => item.id === strandId);
    const element = strand?.elements[0];
    const descriptor = getPreferredDescriptor(availableDescriptorsFor(framework, element, draft.year), draft.year);
    updateDraft({ strandId: strand?.id ?? "", elementId: element?.id ?? "", descriptorId: descriptor?.id ?? "", showDescriptor: false });
  }

  function updateDraftElement(elementId: string) {
    if (!draft) return;
    const framework = progressionFrameworks.find((item) => item.id === draft.frameworkId);
    const strand = framework?.strands.find((item) => item.id === draft.strandId);
    const element = strand?.elements.find((item) => item.id === elementId);
    const descriptor = getPreferredDescriptor(availableDescriptorsFor(framework, element, draft.year), draft.year);
    updateDraft({ elementId: element?.id ?? "", descriptorId: descriptor?.id ?? "", showDescriptor: false });
  }

  function addFrameworkReference() {
    if (!draft) return;
    const framework = progressionFrameworks.find((item) => item.id === draft.frameworkId);
    const strand = framework?.strands.find((item) => item.id === draft.strandId);
    const element = strand?.elements.find((item) => item.id === draft.elementId);
    const descriptor = element?.progressionDescriptorRefs?.find((item) => item.id === draft.descriptorId);
    if (!framework || !strand || !element || !descriptor) {
      setValidationMessage("Select a framework, strand, element and progression descriptor before adding a reference.");
      return;
    }
    updateDraft({
      frameworkReferences: [...draft.frameworkReferences, buildFrameworkReference(framework, strand, element, descriptor, draft.frameworkNotes)],
      frameworkNotes: "",
      showDescriptor: false
    });
  }

  async function saveChanges() {
    if (!draft || !entry) return;
    const subject = editableSubjects.find((item) => item.id === draft.subjectId);
    const validation = validateDraft(draft, subject, themeOptions);
    if (validation) {
      setValidationMessage(validation);
      return;
    }

    setIsSaving(true);
    const selectedThemes = themesForSelectedElements(draft.selectedCctElements, themeOptions);
    const primaryReference = draft.frameworkReferences[0];
    const result = await updateMapping(entry.id, {
      subjectId: subject?.id,
      subject: subject?.name ?? "",
      year: draft.year,
      term: draft.term,
      unit: draft.activityTitle.trim(),
      context: draft.activityTitle.trim(),
      schemeReference: draft.schemeReference.trim(),
      activityDescription: draft.activityDescription.trim(),
      taskDescription: "",
      frameworkId: primaryReference?.frameworkId,
      strandId: primaryReference?.strandId,
      elementId: primaryReference?.elementId,
      progressionDescriptorId: primaryReference?.progressionDescriptorId ?? undefined,
      frameworkReferences: draft.frameworkReferences,
      framework: primaryReference?.framework ?? "No framework reference",
      strand: primaryReference?.strand ?? "No strand reference",
      element: primaryReference?.element ?? "No element reference",
      progressionReference: primaryReference?.progressionReference ?? "Not specified",
      crossCuttingThemeIds: selectedThemes.map((theme) => theme.id),
      crossCuttingThemeElementIds: draft.selectedCctElements.map((item) => item.elementId),
      crossCuttingThemeElementLinks: draft.selectedCctElements,
      crossCuttingThemes: selectedThemes.map((theme) => theme.name),
      crossCuttingThemeNotes: draft.themeNotes.trim(),
      lastMappedDate: new Date().toISOString().slice(0, 10)
    });
    setIsSaving(false);

    if (result.ok) {
      const subjectParam = encodeURIComponent(subject?.id ?? returnSubjectId);
      const yearParam = encodeURIComponent(draft.year || returnYear);
      router.push(`/edit-curriculum?subject=${subjectParam}&year=${yearParam}`);
    } else {
      setValidationMessage(`Could not save changes: ${result.message ?? "Unknown Supabase error"}`);
    }
  }

  if (!draft) {
    return (
      <section className="space-y-6">
        <PageHeader eyebrow="Curriculum Editing" title="Edit Curriculum Mapping" description="Loading curriculum mapping..." accent={areaThemes.overview.accent} />
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Curriculum Editing"
        title="Edit Curriculum Mapping"
        description="Update curriculum details, skills references and theme evidence for this activity."
        accent={areaThemes.overview.accent}
      />

      <form className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm" onSubmit={(event) => event.preventDefault()}>
        <div className="space-y-5">
          <FormSection number="1" title="Curriculum details" description="Update where this activity sits in the curriculum.">
            <div className="grid gap-4 lg:grid-cols-3">
              <Field label="Subject">
                <select className="focus-ring w-full rounded-md border border-gray-300 bg-white px-3 py-2" value={draft.subjectId} onChange={(event) => updateDraft({ subjectId: event.target.value })}>
                  {editableSubjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Year group">
                <SegmentedButtons options={yearGroups} value={draft.year} onChange={(year) => updateDraft({ year })} />
              </Field>
              <Field label="Term">
                <SegmentedButtons options={terms.length ? terms : ["Autumn", "Spring", "Summer"]} value={draft.term} onChange={(term) => updateDraft({ term })} />
              </Field>
              <Field label="Scheme/reference">
                <input className="focus-ring w-full rounded-md border border-gray-300 px-3 py-2" value={draft.schemeReference} onChange={(event) => updateDraft({ schemeReference: event.target.value })} />
              </Field>
              <Field label="Activity title" wide>
                <input className="focus-ring w-full rounded-md border border-gray-300 px-3 py-2" value={draft.activityTitle} onChange={(event) => updateDraft({ activityTitle: event.target.value })} />
              </Field>
              <Field label="Activity description" wide>
                <textarea className="focus-ring min-h-20 w-full rounded-md border border-gray-300 px-3 py-2" value={draft.activityDescription} onChange={(event) => updateDraft({ activityDescription: event.target.value })} />
              </Field>
            </div>
          </FormSection>

          <FormSection number="2" title="Skills/framework references" description="Review, remove or add Literacy, Numeracy and DCF references.">
            {draft.frameworkReferences.length ? (
              <div className="mb-4 grid gap-2">
                {draft.frameworkReferences.map((reference) => (
                  <div key={reference.id ?? referenceKey(reference)} className="rounded-md border border-gray-200 bg-white p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <ReferenceSummary reference={reference} />
                        {reference.descriptor ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-600">{reference.descriptor}</p> : null}
                        {reference.notes ? <p className="mt-1 text-xs font-semibold text-gray-700">Note: {reference.notes}</p> : null}
                      </div>
                      <button className="focus-ring rounded-md border border-gray-300 px-2 py-1 text-xs font-bold text-gray-700" type="button" onClick={() => updateDraft({ frameworkReferences: draft.frameworkReferences.filter((item) => referenceKey(item) !== referenceKey(reference)) })}>
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mb-4 text-sm text-gray-600">No framework references selected.</p>
            )}
            <FrameworkReferencePicker
              draft={draft}
              frameworks={progressionFrameworks}
              onChange={updateDraft}
              onFrameworkChange={updateDraftFramework}
              onStrandChange={updateDraftStrand}
              onElementChange={updateDraftElement}
              onAddReference={addFrameworkReference}
            />
          </FormSection>

          <FormSection number="3" title="Cross-cutting theme elements" description="Select any specific wider curriculum theme elements represented in this activity.">
            {entry.crossCuttingThemeIds?.length && !entry.crossCuttingThemeElementLinks?.length ? <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">This mapping has a legacy broad theme link. New saves use specific theme elements.</p> : null}
            <CctElementSelector themes={themeOptions} selected={draft.selectedCctElements} onChange={(selectedCctElements) => updateDraft({ selectedCctElements })} />
          </FormSection>

          <FormSection number="4" title="Notes" description="Add any shared explanation for selected theme elements.">
            <Field label="Theme notes" wide>
              <textarea className="focus-ring min-h-20 w-full rounded-md border border-gray-300 px-3 py-2" value={draft.themeNotes} onChange={(event) => updateDraft({ themeNotes: event.target.value })} />
            </Field>
          </FormSection>
        </div>

        {validationMessage ? <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{validationMessage}</div> : null}
        {saveMessage ? <div className="mt-4 rounded-md border px-4 py-3 text-sm font-bold" style={{ borderColor: areaThemes.overview.border, backgroundColor: areaThemes.overview.soft, color: areaThemes.overview.text }}>{saveMessage}</div> : null}

        <div className="sticky bottom-0 -mx-5 mt-5 flex flex-wrap gap-3 border-t border-gray-200 bg-white/95 px-5 py-4 backdrop-blur">
          <button className="focus-ring btn btn-primary" type="button" onClick={saveChanges} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save changes"}
          </button>
          <Link className="focus-ring btn btn-secondary" href={`/edit-curriculum?subject=${encodeURIComponent(returnSubjectId || draft.subjectId)}&year=${encodeURIComponent(returnYear || draft.year)}`}>
            Back to subject browser
          </Link>
          <Link className="focus-ring btn btn-muted" href="/edit-curriculum">
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}

function FrameworkReferencePicker({ draft, frameworks, onChange, onFrameworkChange, onStrandChange, onElementChange, onAddReference }: { draft: EditDraft; frameworks: FrameworkDefinition[]; onChange: (patch: Partial<EditDraft>) => void; onFrameworkChange: (frameworkId: string) => void; onStrandChange: (strandId: string) => void; onElementChange: (elementId: string) => void; onAddReference: () => void }) {
  const selectedFramework = frameworks.find((framework) => framework.id === draft.frameworkId);
  const selectedStrand = selectedFramework?.strands.find((strand) => strand.id === draft.strandId);
  const selectedElement = selectedStrand?.elements.find((element) => element.id === draft.elementId);
  const descriptors = availableDescriptorsFor(selectedFramework, selectedElement, draft.year);
  const selectedDescriptor = descriptors.find((descriptor) => descriptor.id === draft.descriptorId);
  const theme = themeForFramework(selectedFramework?.name);

  useEffect(() => {
    const preferred = getPreferredDescriptor(descriptors, draft.year);
    if (preferred && !descriptors.some((descriptor) => descriptor.id === draft.descriptorId)) {
      onChange({ descriptorId: preferred.id, showDescriptor: false });
    }
  }, [descriptors, draft.descriptorId, draft.year, onChange]);

  if (!frameworks.length) {
    return <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">No active skills frameworks found for this school.</p>;
  }

  return (
    <div className="space-y-4">
      <PickerGroup label="Framework">
        {frameworks.map((framework) => (
          <PickerButton key={framework.id} selected={framework.id === draft.frameworkId} onClick={() => onFrameworkChange(framework.id ?? "")} themeName={framework.name}>
            {framework.shortName}
          </PickerButton>
        ))}
      </PickerGroup>
      <PickerGroup label="Strand">
        {(selectedFramework?.strands ?? []).map((strand) => (
          <PickerButton key={strand.id} selected={strand.id === draft.strandId} onClick={() => onStrandChange(strand.id ?? "")} themeName={selectedFramework?.name} title={strand.name}>
            {strand.shortName ?? strand.name}
          </PickerButton>
        ))}
      </PickerGroup>
      <PickerGroup label="Element">
        {(selectedStrand?.elements ?? []).map((element) => (
          <PickerButton key={element.id} selected={element.id === draft.elementId} onClick={() => onElementChange(element.id ?? "")} themeName={selectedFramework?.name}>
            {element.name}
          </PickerButton>
        ))}
      </PickerGroup>
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <span className="text-sm font-bold text-gray-800">Progression descriptor</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {descriptors.length ? (
            descriptors.map((descriptor) => (
              <button key={descriptor.id} className={`focus-ring rounded-md border px-3 py-2 text-sm font-bold ${descriptor.id === draft.descriptorId ? "" : "border-gray-300 bg-white text-gray-700"}`} style={descriptor.id === draft.descriptorId ? { borderColor: theme.accent, backgroundColor: theme.soft, color: theme.text } : undefined} type="button" onClick={() => onChange({ descriptorId: descriptor.id, showDescriptor: false })}>
                {descriptor.progressionStep}
              </button>
            ))
          ) : (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">No progression descriptors found for this element.</p>
          )}
        </div>
      </div>
      {selectedFramework && selectedStrand && selectedElement && selectedDescriptor ? (
        <div className="rounded-lg border p-3" style={{ borderColor: theme.border, backgroundColor: theme.soft }}>
          <ReferenceSummary reference={buildFrameworkReference(selectedFramework, selectedStrand, selectedElement, selectedDescriptor, draft.frameworkNotes)} />
          <DescriptorPreview text={selectedDescriptor.descriptorText} expanded={draft.showDescriptor} onToggle={() => onChange({ showDescriptor: !draft.showDescriptor })} />
          <Field label="Optional note explaining the link" wide>
            <textarea className="focus-ring mt-2 min-h-16 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm" value={draft.frameworkNotes} onChange={(event) => onChange({ frameworkNotes: event.target.value })} />
          </Field>
          <button className="focus-ring btn btn-secondary mt-3" type="button" onClick={onAddReference}>
            Add framework reference
          </button>
        </div>
      ) : null}
    </div>
  );
}

function apiThemeToTheme(row: ThemeApiRow, index: number): CrossCuttingTheme {
  return {
    id: row.id,
    schoolId: row.school_id,
    name: row.name,
    description: row.description,
    active: row.active ?? true,
    displayOrder: index + 1,
    elements: (row.elements ?? []).map((element) => ({
      id: element.id,
      schoolId: element.school_id,
      themeId: element.theme_id,
      name: element.name,
      description: element.description,
      displayOrder: element.display_order ?? 0,
      active: element.active ?? true
    }))
  };
}

function FormSection({ number, title, description, children }: { number: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-gray-200 p-4">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-sm font-bold" style={{ backgroundColor: areaThemes.overview.soft, color: areaThemes.overview.text }}>
          {number}
        </span>
        <div>
          <h2 className="font-bold text-gray-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={wide ? "lg:col-span-2" : ""}>
      <span className="mb-1 block text-sm font-semibold text-gray-700">{label}</span>
      {children}
    </label>
  );
}

function SegmentedButtons({ options, value, onChange }: { options: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = option === value;
        return (
          <button key={option} className={`focus-ring rounded-md border px-3 py-2 text-sm font-bold ${selected ? "text-white" : "border-gray-300 bg-white text-gray-700"}`} style={selected ? { borderColor: areaThemes.overview.accent, backgroundColor: areaThemes.overview.accent } : undefined} type="button" onClick={() => onChange(option)}>
            {option.replace("Year ", "Y")}
          </button>
        );
      })}
    </div>
  );
}

function PickerGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-2 block text-sm font-semibold text-gray-700">{label}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function PickerButton({ selected, onClick, themeName, title, children }: { selected: boolean; onClick: () => void; themeName?: string; title?: string; children: React.ReactNode }) {
  const theme = themeForFramework(themeName ?? "");
  return (
    <button className={`focus-ring min-h-10 max-w-64 rounded-md border px-3 py-2 text-sm font-bold leading-snug ${selected ? "" : "border-gray-300 bg-white text-gray-700"}`} style={selected ? { borderColor: theme.accent, backgroundColor: theme.soft, color: theme.text } : undefined} type="button" onClick={onClick} aria-pressed={selected} title={title}>
      {children}
    </button>
  );
}

function ReferenceSummary({ reference }: { reference: Pick<MappingFrameworkReference, "framework" | "frameworkShortName" | "strand" | "strandShortName" | "element" | "progressionReference"> }) {
  return (
    <p className="text-sm font-bold text-gray-950">
      {reference.frameworkShortName ?? reference.framework} <span className="text-gray-400">→</span> {reference.strandShortName ?? reference.strand} <span className="text-gray-400">→</span> {reference.element} <span className="text-gray-400">→</span> {reference.progressionReference}
    </p>
  );
}

function DescriptorPreview({ text, expanded, onToggle }: { text: string; expanded: boolean; onToggle: () => void }) {
  const isLong = text.length > 220;
  return (
    <div className="mt-2">
      <p className={`text-sm leading-6 text-gray-700 ${!expanded && isLong ? "line-clamp-3" : ""}`}>{text}</p>
      {isLong ? (
        <button className="focus-ring mt-1 text-sm font-bold" style={{ color: areaThemes.overview.text }} type="button" onClick={onToggle}>
          {expanded ? "Hide descriptor" : "Show full descriptor"}
        </button>
      ) : null}
    </div>
  );
}

function buildFrameworkReference(framework: FrameworkDefinition, strand: StrandDefinition, element: ElementDefinition, descriptor: ProgressionDescriptorDefinition, notes = ""): MappingFrameworkReference {
  return {
    id: `${framework.id}:${strand.id}:${element.id}:${descriptor.id}:${Date.now()}`,
    frameworkId: framework.id ?? "",
    frameworkShortName: framework.shortName,
    strandId: strand.id ?? "",
    strandShortName: strand.shortName ?? strand.name,
    elementId: element.id ?? "",
    progressionDescriptorId: descriptor.id,
    progressionStep: descriptor.progressionStepNumber,
    framework: framework.name,
    strand: strand.name,
    element: element.name,
    progressionReference: descriptor.progressionStep,
    descriptor: descriptor.descriptorText,
    notes: notes.trim()
  };
}

function availableDescriptorsFor(framework: FrameworkDefinition | undefined, element: ElementDefinition | undefined, yearGroup: string) {
  const descriptors = (element?.progressionDescriptorRefs ?? []).filter((descriptor) => descriptor.descriptorText.trim());
  const filtered = framework?.shortName === "DCF" || framework?.name === "Digital Competence Framework" ? descriptors.filter((descriptor) => descriptor.progressionStepNumber >= 3) : descriptors;
  return filtered.sort((a, b) => a.progressionStepNumber - b.progressionStepNumber);
}

function getPreferredDescriptor(descriptors: ProgressionDescriptorDefinition[], yearGroup: string) {
  const targetStep = yearGroup === "Year 10" || yearGroup === "Year 11" ? 5 : 4;
  return descriptors.find((descriptor) => descriptor.progressionStepNumber === targetStep) ?? descriptors.find((descriptor) => descriptor.progressionStepNumber === 4) ?? descriptors[0];
}

function themesForSelectedElements(selected: SelectedCctElement[], themes: CrossCuttingTheme[]) {
  const selectedThemeIds = new Set(selected.map((item) => item.themeId));
  return themes.filter((theme) => selectedThemeIds.has(theme.id));
}

function validateDraft(draft: EditDraft, subject: SubjectConfig | undefined, themes: CrossCuttingTheme[]) {
  if (!subject) return "Select a subject.";
  if (!looksLikeUuid(subject.id)) return "Subject data is not using database IDs. Reload subjects from Supabase.";
  if (!draft.year) return "Select a year group.";
  if (!draft.term) return "Select a term.";
  if (!draft.activityTitle.trim()) return "Activity title cannot be blank.";
  if (!validateFrameworkReferences(draft.frameworkReferences)) return "Framework reference data is not using database IDs. Reload framework data from Supabase.";
  if (!validateCctElements(draft.selectedCctElements, themes)) return "Cross-cutting theme data is not using database IDs. Reload cross-cutting themes from Supabase.";
  return "";
}

function validateFrameworkReferences(references: MappingFrameworkReference[]) {
  return references.every((reference) => looksLikeUuid(reference.frameworkId) && looksLikeUuid(reference.strandId) && looksLikeUuid(reference.elementId) && (!reference.progressionDescriptorId || looksLikeUuid(reference.progressionDescriptorId)));
}

function validateCctElements(selected: SelectedCctElement[], themes: CrossCuttingTheme[]) {
  const themeById = new Map(themes.map((theme) => [theme.id, theme]));
  return selected.every((item) => {
    const theme = themeById.get(item.themeId);
    const element = theme?.elements?.find((candidate) => candidate.id === item.elementId);
    return Boolean(theme && element && element.themeId === item.themeId && looksLikeUuid(item.themeId) && looksLikeUuid(item.elementId));
  });
}

function referenceKey(reference: MappingFrameworkReference) {
  return `${reference.frameworkId}:${reference.strandId}:${reference.elementId}:${reference.progressionDescriptorId ?? ""}:${reference.id ?? ""}`;
}

function looksLikeUuid(value: string | undefined | null) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}
