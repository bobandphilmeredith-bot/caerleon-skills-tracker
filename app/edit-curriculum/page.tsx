"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AccessDenied } from "@/components/AccessDenied";
import { CctElementSelector } from "@/components/CctElementSelector";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/lib/auth";
import { useCurrentSchool } from "@/lib/currentSchool";
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

const allYears = "All year groups";
const allTerms = "All terms";

export default function EditCurriculumPage() {
  const { canEditMappings, canEditSubject, currentUser } = useAuth();
  const { currentSchoolId, data, updateMapping } = useCurrentSchool();
  const { crossCuttingThemes, frameworkLibrary, mappings, subjectConfigs, terms, yearGroups } = data;
  const [subjectId, setSubjectId] = useState("");
  const [yearFilter, setYearFilter] = useState(allYears);
  const [termFilter, setTermFilter] = useState(allTerms);
  const [keyword, setKeyword] = useState("");
  const [editingEntry, setEditingEntry] = useState<MappingEntry | null>(null);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [themeRows, setThemeRows] = useState<CrossCuttingTheme[]>([]);
  const [saveMessage, setSaveMessage] = useState("");
  const [validationMessage, setValidationMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const editableSubjects = useMemo(
    () =>
      subjectConfigs
        .filter((subject) => subject.active && subject.appearsInMappingDropdowns && canEditSubject(subject.name))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [canEditSubject, subjectConfigs]
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
    if (!subjectId && editableSubjects.length) setSubjectId(editableSubjects[0].id);
    if (subjectId && !editableSubjects.some((subject) => subject.id === subjectId)) setSubjectId(editableSubjects[0]?.id ?? "");
  }, [editableSubjects, subjectId]);

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
    if (!draft || !themeOptions.length) return;
    const validSelections = new Set(themeOptions.flatMap((theme) => (theme.elements ?? []).map((element) => `${theme.id}:${element.id}`)));
    const nextSelection = draft.selectedCctElements.filter((item) => validSelections.has(`${item.themeId}:${item.elementId}`));
    if (nextSelection.length !== draft.selectedCctElements.length) updateDraft({ selectedCctElements: nextSelection });
  }, [draft, themeOptions]);

  const selectedSubject = editableSubjects.find((subject) => subject.id === subjectId);
  const filteredMappings = useMemo(
    () =>
      mappings
        .filter((entry) => matchesSubject(entry, selectedSubject))
        .filter((entry) => yearFilter === allYears || entry.year === yearFilter)
        .filter((entry) => termFilter === allTerms || entry.term === termFilter)
        .filter((entry) => matchesKeyword(entry, keyword))
        .sort(compareMappings),
    [keyword, mappings, selectedSubject, termFilter, yearFilter]
  );

  const groupedMappings = useMemo(() => groupMappings(filteredMappings, yearGroups), [filteredMappings, yearGroups]);

  if (!canEditMappings) {
    return <AccessDenied title="Edit Curriculum restricted" message="Your current role is read-only. Switch to a teacher, subject lead or school admin account to edit curriculum mappings." />;
  }

  function startEditing(entry: MappingEntry) {
    const firstFramework = progressionFrameworks[0];
    const firstStrand = firstFramework?.strands[0];
    const firstElement = firstStrand?.elements[0];
    const firstDescriptor = getPreferredDescriptor(availableDescriptorsFor(firstFramework, firstElement, entry.year), entry.year);
    setEditingEntry(entry);
    setDraft({
      subjectId: entry.subjectId ?? selectedSubject?.id ?? "",
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
    setSaveMessage("");
    setValidationMessage("");
  }

  function updateDraft(patch: Partial<EditDraft>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
    setValidationMessage("");
    setSaveMessage("");
  }

  function updateDraftFramework(frameworkId: string) {
    const framework = progressionFrameworks.find((item) => item.id === frameworkId);
    const strand = framework?.strands[0];
    const element = strand?.elements[0];
    const descriptor = getPreferredDescriptor(availableDescriptorsFor(framework, element, draft?.year ?? "Year 7"), draft?.year ?? "Year 7");
    updateDraft({
      frameworkId: framework?.id ?? "",
      strandId: strand?.id ?? "",
      elementId: element?.id ?? "",
      descriptorId: descriptor?.id ?? "",
      showDescriptor: false
    });
  }

  function updateDraftStrand(strandId: string) {
    const framework = progressionFrameworks.find((item) => item.id === draft?.frameworkId);
    const strand = framework?.strands.find((item) => item.id === strandId);
    const element = strand?.elements[0];
    const descriptor = getPreferredDescriptor(availableDescriptorsFor(framework, element, draft?.year ?? "Year 7"), draft?.year ?? "Year 7");
    updateDraft({
      strandId: strand?.id ?? "",
      elementId: element?.id ?? "",
      descriptorId: descriptor?.id ?? "",
      showDescriptor: false
    });
  }

  function updateDraftElement(elementId: string) {
    const framework = progressionFrameworks.find((item) => item.id === draft?.frameworkId);
    const strand = framework?.strands.find((item) => item.id === draft?.strandId);
    const element = strand?.elements.find((item) => item.id === elementId);
    const descriptor = getPreferredDescriptor(availableDescriptorsFor(framework, element, draft?.year ?? "Year 7"), draft?.year ?? "Year 7");
    updateDraft({
      elementId: element?.id ?? "",
      descriptorId: descriptor?.id ?? "",
      showDescriptor: false
    });
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

    const reference = buildFrameworkReference(framework, strand, element, descriptor, draft.frameworkNotes);
    updateDraft({
      frameworkReferences: [...draft.frameworkReferences, reference],
      frameworkNotes: "",
      showDescriptor: false
    });
  }

  async function saveChanges() {
    if (!editingEntry || !draft) return;
    const subject = editableSubjects.find((item) => item.id === draft.subjectId);
    const validation = validateDraft(draft, subject, crossCuttingThemes);
    if (validation) {
      setValidationMessage(validation);
      return;
    }

    setIsSaving(true);
    const selectedThemes = themesForSelectedElements(draft.selectedCctElements, themeOptions);
    const primaryReference = draft.frameworkReferences[0];
    const result = await updateMapping(editingEntry.id, {
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
      setSaveMessage("Curriculum mapping updated.");
      setValidationMessage("");
      setEditingEntry(null);
      setDraft(null);
    } else {
      setValidationMessage(`Could not save changes: ${result.message ?? "Unknown Supabase error"}`);
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Curriculum Editing"
        title="Edit Curriculum Mappings"
        description="Browse by subject, review existing curriculum mappings and update skills or theme evidence."
        accent={areaThemes.overview.accent}
      />

      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(260px,1.2fr)_minmax(220px,1fr)_minmax(220px,1fr)]">
          <Field label="Subject">
            <select className="focus-ring w-full rounded-md border border-gray-300 bg-white px-3 py-2" value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
              {editableSubjects.length ? null : <option value="">No editable subjects</option>}
              {editableSubjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Search mappings">
            <input
              className="focus-ring w-full rounded-md border border-gray-300 px-3 py-2"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Search title, scheme, notes..."
            />
          </Field>
          <Field label="Term">
            <select className="focus-ring w-full rounded-md border border-gray-300 bg-white px-3 py-2" value={termFilter} onChange={(event) => setTermFilter(event.target.value)}>
              <option value={allTerms}>{allTerms}</option>
              {(terms.length ? terms : ["Autumn", "Spring", "Summer"]).map((term) => (
                <option key={term} value={term}>
                  {term}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-4">
          <span className="mb-2 block text-sm font-semibold text-gray-700">Year group</span>
          <div className="flex flex-wrap gap-2">
            {[allYears, ...yearGroups].map((year) => (
              <FilterButton key={year} selected={yearFilter === year} onClick={() => setYearFilter(year)}>
                {year === allYears ? "All" : year.replace("Year ", "Y")}
              </FilterButton>
            ))}
          </div>
        </div>
      </div>

      {saveMessage ? (
        <div className="rounded-md border px-4 py-3 text-sm font-bold" style={{ borderColor: areaThemes.overview.border, backgroundColor: areaThemes.overview.soft, color: areaThemes.overview.text }}>
          {saveMessage}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.68fr)]">
        <div className="space-y-4">
          {!editableSubjects.length ? (
            <EmptyState message="No editable subjects are assigned to your account. Contact a school administrator." />
          ) : !filteredMappings.length ? (
            <EmptyState message="No curriculum mappings found for this subject yet." />
          ) : (
            groupedMappings.map(({ year, entries }) => (
              <section key={year} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-bold text-gray-950">{year}</h2>
                  <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: areaThemes.overview.soft, color: areaThemes.overview.text }}>
                    {entries.length} mapping{entries.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="mt-3 grid gap-3">
                  {entries.map((entry) => (
                    <MappingCard key={entry.id} entry={entry} active={editingEntry?.id === entry.id} onEdit={() => startEditing(entry)} />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>

        <aside className="xl:sticky xl:top-6 xl:self-start">
          {draft && editingEntry ? (
            <EditPanel
              draft={draft}
              entry={editingEntry}
              subjects={editableSubjects}
              frameworks={progressionFrameworks}
              cctThemes={themeOptions}
              yearGroups={yearGroups}
              terms={terms.length ? terms : ["Autumn", "Spring", "Summer"]}
              validationMessage={validationMessage}
              isSaving={isSaving}
              onCancel={() => {
                setEditingEntry(null);
                setDraft(null);
                setValidationMessage("");
              }}
              onChange={updateDraft}
              onFrameworkChange={updateDraftFramework}
              onStrandChange={updateDraftStrand}
              onElementChange={updateDraftElement}
              onAddReference={addFrameworkReference}
              onSave={saveChanges}
            />
          ) : (
            <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-gray-950">Select a mapping to edit</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">Choose a subject, browse the curriculum sequence, then open a mapping to update its skills or theme evidence.</p>
              <Link className="focus-ring btn btn-primary mt-4 inline-flex" href="/add-entry">
                Add a new curriculum mapping
              </Link>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function MappingCard({ entry, active, onEdit }: { entry: MappingEntry; active: boolean; onEdit: () => void }) {
  const skills = summariseSkills(entry.frameworkReferences ?? []);
  const themes = summariseThemes(entry.crossCuttingThemes ?? []);
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4" style={active ? { borderColor: areaThemes.overview.accent, backgroundColor: areaThemes.overview.soft } : undefined}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-gray-500">
            <span>{entry.schemeReference || "No scheme reference"}</span>
            <span aria-hidden="true">•</span>
            <span>{entry.term}</span>
            <span aria-hidden="true">•</span>
            <span>Updated {entry.lastMappedDate}</span>
          </div>
          <h3 className="mt-1 text-base font-bold text-gray-950">{entry.unit || entry.context || "Untitled mapping"}</h3>
          {entry.activityDescription ? <p className="mt-1 line-clamp-2 text-sm leading-6 text-gray-600">{entry.activityDescription}</p> : null}
          <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
            <SummaryBlock label="Skills" value={skills} empty="No framework references" />
            <SummaryBlock label="Themes" value={themes} empty="No theme elements" />
          </div>
        </div>
        <button className="focus-ring btn btn-secondary shrink-0" type="button" onClick={onEdit}>
          Edit
        </button>
      </div>
    </article>
  );
}

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

function EditPanel({
  draft,
  entry,
  subjects,
  frameworks,
  cctThemes,
  yearGroups,
  terms,
  validationMessage,
  isSaving,
  onCancel,
  onChange,
  onFrameworkChange,
  onStrandChange,
  onElementChange,
  onAddReference,
  onSave
}: {
  draft: EditDraft;
  entry: MappingEntry;
  subjects: SubjectConfig[];
  frameworks: FrameworkDefinition[];
  cctThemes: CrossCuttingTheme[];
  yearGroups: string[];
  terms: string[];
  validationMessage: string;
  isSaving: boolean;
  onCancel: () => void;
  onChange: (patch: Partial<EditDraft>) => void;
  onFrameworkChange: (frameworkId: string) => void;
  onStrandChange: (strandId: string) => void;
  onElementChange: (elementId: string) => void;
  onAddReference: () => void;
  onSave: () => void;
}) {
  const selectedFramework = frameworks.find((framework) => framework.id === draft.frameworkId);
  const selectedStrand = selectedFramework?.strands.find((strand) => strand.id === draft.strandId);
  const selectedElement = selectedStrand?.elements.find((element) => element.id === draft.elementId);
  const descriptors = availableDescriptorsFor(selectedFramework, selectedElement, draft.year);
  const selectedDescriptor = descriptors.find((descriptor) => descriptor.id === draft.descriptorId);
  const theme = themeForFramework(selectedFramework?.name);
  const hasLegacyBroadTheme = Boolean((entry.crossCuttingThemeIds?.length ?? 0) > 0 && !(entry.crossCuttingThemeElementLinks?.length ?? 0));

  useEffect(() => {
    const preferred = getPreferredDescriptor(descriptors, draft.year);
    if (preferred && !descriptors.some((descriptor) => descriptor.id === draft.descriptorId)) {
      onChange({ descriptorId: preferred.id, showDescriptor: false });
    }
  }, [descriptors, draft.descriptorId, draft.year, onChange]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-950">Edit mapping</h2>
          <p className="mt-1 text-sm text-gray-600">{entry.schemeReference || "No scheme reference"}</p>
        </div>
        <button className="focus-ring rounded-md border border-gray-300 px-3 py-2 text-sm font-bold text-gray-700" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>

      <div className="mt-5 space-y-5">
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-gray-900">Curriculum details</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Subject">
              <select className="focus-ring w-full rounded-md border border-gray-300 bg-white px-3 py-2" value={draft.subjectId} onChange={(event) => onChange({ subjectId: event.target.value })}>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Scheme/reference">
              <input className="focus-ring w-full rounded-md border border-gray-300 px-3 py-2" value={draft.schemeReference} onChange={(event) => onChange({ schemeReference: event.target.value })} />
            </Field>
            <Field label="Year group">
              <SegmentedButtons options={yearGroups} value={draft.year} onChange={(year) => onChange({ year })} />
            </Field>
            <Field label="Term">
              <SegmentedButtons options={terms} value={draft.term} onChange={(term) => onChange({ term })} />
            </Field>
            <Field label="Activity title" wide>
              <input className="focus-ring w-full rounded-md border border-gray-300 px-3 py-2" value={draft.activityTitle} onChange={(event) => onChange({ activityTitle: event.target.value })} />
            </Field>
            <Field label="Activity description" wide>
              <textarea className="focus-ring min-h-20 w-full rounded-md border border-gray-300 px-3 py-2" value={draft.activityDescription} onChange={(event) => onChange({ activityDescription: event.target.value })} />
            </Field>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-gray-900">Skills framework references</h3>
          {draft.frameworkReferences.length ? (
            <div className="space-y-2">
              {draft.frameworkReferences.map((reference) => (
                <div key={reference.id ?? referenceKey(reference)} className="rounded-md border border-gray-200 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <ReferenceSummary reference={reference} />
                      {reference.descriptor ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-600">{reference.descriptor}</p> : null}
                      {reference.notes ? <p className="mt-1 text-xs font-semibold text-gray-700">Note: {reference.notes}</p> : null}
                    </div>
                    <button
                      className="focus-ring rounded-md border border-gray-300 px-2 py-1 text-xs font-bold text-gray-700"
                      type="button"
                      onClick={() => onChange({ frameworkReferences: draft.frameworkReferences.filter((item) => referenceKey(item) !== referenceKey(reference)) })}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600">No framework references selected.</p>
          )}

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="grid gap-3">
              <Field label="Framework">
                <select className="focus-ring w-full rounded-md border border-gray-300 bg-white px-3 py-2" value={draft.frameworkId} onChange={(event) => onFrameworkChange(event.target.value)}>
                  {frameworks.map((framework) => (
                    <option key={framework.id} value={framework.id}>
                      {framework.shortName}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Strand">
                <select className="focus-ring w-full rounded-md border border-gray-300 bg-white px-3 py-2" value={draft.strandId} onChange={(event) => onStrandChange(event.target.value)}>
                  {(selectedFramework?.strands ?? []).map((strand) => (
                    <option key={strand.id} value={strand.id} title={strand.name}>
                      {strand.shortName ?? strand.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Element">
                <select className="focus-ring w-full rounded-md border border-gray-300 bg-white px-3 py-2" value={draft.elementId} onChange={(event) => onElementChange(event.target.value)}>
                  {(selectedStrand?.elements ?? []).map((element) => (
                    <option key={element.id} value={element.id}>
                      {element.name}
                    </option>
                  ))}
                </select>
              </Field>

              <div>
                <span className="mb-2 block text-sm font-semibold text-gray-700">Progression descriptor</span>
                {descriptors.length ? (
                  <div className="flex flex-wrap gap-2">
                    {descriptors.map((descriptor) => (
                      <button
                        key={descriptor.id}
                        className={`focus-ring rounded-md border px-3 py-2 text-sm font-bold ${descriptor.id === draft.descriptorId ? "" : "border-gray-300 bg-white text-gray-700"}`}
                        style={
                          descriptor.id === draft.descriptorId
                            ? { borderColor: theme.accent, backgroundColor: theme.soft, color: theme.text }
                            : undefined
                        }
                        type="button"
                        onClick={() => onChange({ descriptorId: descriptor.id, showDescriptor: false })}
                      >
                        {descriptor.progressionStep}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">No progression descriptors found for this element.</p>
                )}
              </div>

              {selectedFramework && selectedStrand && selectedElement && selectedDescriptor ? (
                <div className="rounded-md border p-3" style={{ borderColor: theme.border, backgroundColor: theme.soft }}>
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
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-gray-900">Cross-cutting theme elements</h3>
          {hasLegacyBroadTheme ? <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">This mapping has a legacy broad theme link. New saves use specific theme elements.</p> : null}
          <CctElementSelector themes={cctThemes} selected={draft.selectedCctElements} onChange={(selectedCctElements) => onChange({ selectedCctElements })} />
          <Field label="Theme notes" wide>
            <textarea className="focus-ring min-h-16 w-full rounded-md border border-gray-300 px-3 py-2" value={draft.themeNotes} onChange={(event) => onChange({ themeNotes: event.target.value })} />
          </Field>
        </section>
      </div>

      {validationMessage ? <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{validationMessage}</div> : null}

      <div className="mt-5 flex flex-wrap gap-3 border-t border-gray-200 pt-4">
        <button className="focus-ring btn btn-primary" type="button" onClick={onSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save changes"}
        </button>
        <button className="focus-ring btn btn-muted" type="button" onClick={onCancel}>
          Back to subject browser
        </button>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
      <h2 className="text-lg font-bold text-gray-950">{message}</h2>
      <Link className="focus-ring btn btn-primary mt-4 inline-flex" href="/add-entry">
        Add a new curriculum mapping
      </Link>
    </div>
  );
}

function SummaryBlock({ label, value, empty }: { label: string; value: string; empty: string }) {
  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
      <span className="block text-xs font-bold uppercase tracking-[0.12em] text-gray-500">{label}</span>
      <span className="mt-1 block line-clamp-2 font-semibold text-gray-800">{value || empty}</span>
    </div>
  );
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={wide ? "sm:col-span-2" : ""}>
      <span className="mb-1 block text-sm font-semibold text-gray-700">{label}</span>
      {children}
    </label>
  );
}

function FilterButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      className={`focus-ring rounded-md border px-3 py-2 text-sm font-bold ${selected ? "text-white" : "border-gray-300 bg-white text-gray-700"}`}
      style={selected ? { borderColor: areaThemes.overview.accent, backgroundColor: areaThemes.overview.accent } : undefined}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function SegmentedButtons({ options, value, onChange }: { options: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <FilterButton key={option} selected={option === value} onClick={() => onChange(option)}>
          {option.replace("Year ", "Y")}
        </FilterButton>
      ))}
    </div>
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

function matchesSubject(entry: MappingEntry, subject: SubjectConfig | undefined) {
  if (!subject) return false;
  return entry.subjectId === subject.id || entry.subject === subject.name;
}

function matchesKeyword(entry: MappingEntry, keyword: string) {
  const needle = keyword.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    entry.unit,
    entry.context,
    entry.activityDescription,
    entry.schemeReference,
    entry.note,
    entry.crossCuttingThemeNotes,
    ...(entry.frameworkReferences ?? []).map((reference) => reference.notes ?? ""),
    ...(entry.crossCuttingThemes ?? [])
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

function groupMappings(entries: MappingEntry[], configuredYears: string[]) {
  const orderedYears = [...configuredYears].sort((a, b) => yearNumber(a) - yearNumber(b));
  const years = Array.from(new Set([...orderedYears, ...entries.map((entry) => entry.year)])).sort((a, b) => yearNumber(a) - yearNumber(b));
  return years
    .map((year) => ({
      year,
      entries: entries.filter((entry) => entry.year === year).sort(compareMappings)
    }))
    .filter((group) => group.entries.length > 0);
}

function compareMappings(a: MappingEntry, b: MappingEntry) {
  const yearDiff = yearNumber(a.year) - yearNumber(b.year);
  if (yearDiff !== 0) return yearDiff;
  const schemeDiff = compareSchemeReference(a.schemeReference, b.schemeReference);
  if (schemeDiff !== 0) return schemeDiff;
  return (a.unit || a.context).localeCompare(b.unit || b.context);
}

function yearNumber(year: string) {
  const match = year.match(/\d+/);
  return match ? Number(match[0]) : 99;
}

function compareSchemeReference(a: string, b: string) {
  const aParts = numericParts(a);
  const bParts = numericParts(b);
  if (aParts.length && !bParts.length) return -1;
  if (!aParts.length && bParts.length) return 1;
  if (aParts.length && bParts.length) {
    const max = Math.max(aParts.length, bParts.length);
    for (let index = 0; index < max; index += 1) {
      const aValue = aParts[index] ?? -1;
      const bValue = bParts[index] ?? -1;
      if (aValue !== bValue) return aValue - bValue;
    }
  }
  return a.localeCompare(b);
}

function numericParts(value: string) {
  return (value.match(/\d+/g) ?? []).map(Number);
}

function summariseSkills(references: MappingFrameworkReference[]) {
  if (!references.length) return "";
  const labels = references.map((reference) => `${reference.frameworkShortName ?? reference.framework}: ${reference.element} ${reference.progressionReference ?? ""}`.trim());
  return labels.length > 2 ? `${labels.slice(0, 2).join(", ")} +${labels.length - 2}` : labels.join(", ");
}

function summariseThemes(themes: string[]) {
  if (!themes.length) return "";
  return themes.length > 2 ? `${themes.slice(0, 2).join(", ")} +${themes.length - 2}` : themes.join(", ");
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
  if (!draft.schemeReference.trim()) return "Scheme/reference cannot be blank.";
  if (!draft.frameworkReferences.length && !draft.selectedCctElements.length) return "Add at least one framework reference or cross-cutting theme element.";
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

function looksLikeUuid(value: string | undefined | null) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

function referenceKey(reference: MappingFrameworkReference) {
  return `${reference.frameworkId}:${reference.strandId}:${reference.elementId}:${reference.progressionDescriptorId ?? ""}:${reference.id ?? ""}`;
}
