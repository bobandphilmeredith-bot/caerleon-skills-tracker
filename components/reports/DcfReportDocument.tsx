import type { ReactNode } from "react";
import {
  dcfGuidance,
  dcfProgression,
  dcfScope,
  type DcfActivity,
  type DcfReport,
} from "@/lib/dcfReport";
import {
  formatMappingDescription,
  formatMappingTitle,
  unique,
} from "@/lib/reporting";

export type DcfMeetingNotes = {
  evaluation: string;
  decisions: string;
  owner: string;
  reviewDate: string;
};
export const emptyDcfNotes: DcfMeetingNotes = {
  evaluation: "",
  decisions: "",
  owner: "",
  reviewDate: "",
};
const date = (value: string) =>
  value && !Number.isNaN(Date.parse(value))
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeZone: "Europe/London",
      }).format(new Date(value))
    : "Not recorded";
export function DcfReportDocument({
  report: r,
  notes = emptyDcfNotes,
  includeEvidence = true,
  onInspect,
}: {
  report: DcfReport;
  notes?: DcfMeetingNotes;
  includeEvidence?: boolean;
  onInspect?: (label: string, entries: DcfActivity[]) => void;
}) {
  const covered = r.coverage.length - r.missing.length;
  const percent = r.coverage.length
    ? Math.round((covered / r.coverage.length) * 100)
    : null;
  const refs = (entries: DcfActivity[]) =>
    entries.map((entry) => entry.evidenceId).join(", ") || "—";
  const count = (label: string, entries: DcfActivity[]) =>
    onInspect && entries.length ? (
      <button
        className="dcf-count"
        onClick={() => onInspect(label, entries)}
        aria-label={`${label}: ${entries.length} activities. Inspect evidence.`}
      >
        {entries.length}
      </button>
    ) : (
      <span className={entries.length ? "dcf-number" : "dcf-zero"}>
        {entries.length}
      </span>
    );
  return (
    <article className="dcf-document">
      <header className="dcf-cover">
        <div className="dcf-kicker">
          {r.schoolName} <span>Leadership & curriculum review</span>
        </div>
        <div className="dcf-cover-grid">
          <div>
            <p className="dcf-eyebrow">Digital Competence Framework</p>
            <h1>
              DCF mapping
              <br />
              Management report
            </h1>
            <p className="dcf-subtitle">
              A shared view of planned provision, progression references and the
              next questions for leaders.
            </p>
          </div>
          <div className="dcf-report-mark" aria-hidden="true">
            DCF
            <span>
              REVIEW
              <br />& REFLECT
            </span>
          </div>
        </div>
        <div className="dcf-meta">
          <span>
            <b>Scope</b>
            {dcfScope(r)}
          </span>
          <span>
            <b>Prepared</b>
            {date(r.generatedAt)}
          </span>
          <span>
            <b>Latest record update</b>
            {date(r.latest)}
          </span>
        </div>
        {r.demo ? (
          <p className="dcf-demo">Demonstration data · not school findings</p>
        ) : null}
      </header>

      <Section
        id="dcf-summary"
        number="01"
        title="Executive summary"
        subtitle="What leaders can say from the records"
      >
        <p className="dcf-lead">
          {r.summary} <Source />
        </p>
        <div className="dcf-metrics">
          <Metric
            value={percent === null ? "Unavailable" : `${percent}%`}
            label="Element coverage"
            detail={`${covered} / ${r.coverage.length || "unavailable"} configured elements`}
          />
          <Metric
            value={String(r.entries.length)}
            label="Planned activities"
            detail="Distinct mapping records"
          />
          <Metric
            value={`${r.contributing.length} / ${r.subjectRows.length}`}
            label="Subjects contributing"
            detail="Configured subjects plus recorded subjects"
          />
          <Metric
            value={String(r.revisited.length)}
            label="Elements recurring"
            detail="At least 2 standard terms in the same year group"
          />
        </div>
        <div className="dcf-two-column">
          <div className="dcf-insight">
            <h3>Priority for leadership</h3>
            <p>
              {r.quality.some((item) => item.entries.length)
                ? "Resolve the flagged record checks, then use the unmapped elements and subject patterns to focus discussion with departments."
                : r.missing.length
                  ? "Check the unmapped elements with subject leaders and decide where purposeful opportunities belong in the curriculum."
                  : r.entries.length
                    ? "Test the mapped provision through pupil work and professional discussion, focusing on challenge, independence and transfer."
                    : "Establish a complete record of the planned opportunities before drawing conclusions about provision."}
            </p>
          </div>
          <div className="dcf-insight">
            <h3>What still needs evidence</h3>
            <p>
              Delivery, the quality of learning and pupil progress require
              separate evidence. Whole-school coverage does not establish that
              every pupil encounters a skill, particularly in option subjects.
            </p>
          </div>
        </div>
        <div className="dcf-caveat">
          <b>Scope of this report.</b> These are planning records, not an
          inspection judgement. No academic year is stored: records may span
          planning cycles. An empty cell means no record in this selection, not
          confirmed absence of teaching.{" "}
          {r.filters.subject
            ? "A subject is not expected to cover every DCF element. "
            : ""}
          {r.filters.term
            ? "A single-term selection cannot show recurrence across terms."
            : "Recurrence is a prompt to inspect sequencing, not proof of progression."}
        </div>
      </Section>

      <Section
        id="dcf-coverage"
        number="02"
        title="Breadth of the planned curriculum"
        subtitle="Read coverage alongside the activities and the intended learning"
      >
        <p>
          Coverage counts configured elements with at least one resolved DCF
          link. The denominator is the school’s current catalogue; it is not a
          verified national completeness score. <Source />
        </p>
        {!r.strands.length ? (
          <Empty>
            No DCF catalogue is available. Restore the definitions before
            interpreting coverage.
          </Empty>
        ) : (
          <div className="dcf-strands">
            {r.strands.map((strand, index) => (
              <div className="dcf-strand" key={strand.key}>
                <span className="dcf-strand-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3>{strand.name}</h3>
                  <p>
                    <b>
                      {strand.covered} / {strand.elements.length}
                    </b>{" "}
                    elements represented · {count(strand.name, strand.entries)}{" "}
                    activities · {strand.subjects.length} subjects
                  </p>
                  <div
                    className="dcf-meter"
                    role="meter"
                    aria-label={`${strand.name}: configured elements represented`}
                    aria-valuemin={0}
                    aria-valuemax={strand.elements.length || 1}
                    aria-valuenow={strand.covered}
                  >
                    <span
                      style={{
                        width: `${strand.elements.length ? (strand.covered / strand.elements.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="dcf-table-wrap">
          <table className="dcf-table dcf-element-table">
            <caption>
              Element register · distinct activities by year group.
              <span data-dcf-interactive-hint>
                {" "}
                Select a count to inspect its records.
              </span>
            </caption>
            <thead>
              <tr>
                <th scope="col">Element / local code</th>
                {r.years.map((year) => (
                  <th scope="col" className="dcf-numeric" key={year}>
                    {year}
                  </th>
                ))}
                <th scope="col">Spread & recurrence</th>
              </tr>
            </thead>
            <tbody>
              {r.coverage.map((item) => (
                <tr key={item.key}>
                  <th scope="row">
                    <small>{item.strand.name}</small>
                    <span className="dcf-code">{item.code}</span>{" "}
                    {item.element.name}
                  </th>
                  {item.years.map((cell) => (
                    <td
                      key={cell.year}
                      className={`dcf-numeric ${cell.entries.length ? "dcf-filled" : ""}`}
                    >
                      {count(
                        `${item.element.name}, ${cell.year}`,
                        cell.entries,
                      )}
                    </td>
                  ))}
                  <td>
                    <span
                      className={`dcf-tag ${!item.entries.length ? "dcf-tag-amber" : ""}`}
                    >
                      {!item.entries.length
                        ? "No record"
                        : item.subjects.length === 1
                          ? "One subject"
                          : `${item.subjects.length} subjects`}
                    </span>
                    <small>
                      {item.revisitYears.length
                        ? `Recurs: ${item.revisitYears.join(", ")}`
                        : "No recurrence recorded"}
                    </small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="dcf-footnote">
          Codes reflect catalogue order. An activity can map to multiple
          elements and strands, so column and strand counts must not be added to
          obtain the number of activities. Recurrence uses Autumn, Spring and
          Summer within the same year group; the planning cycle still needs
          confirmation.
        </p>
      </Section>

      <Section
        id="dcf-reach"
        number="03"
        title="Subject contribution & planned sequence"
        subtitle="Where opportunities sit, and who can access them"
      >
        <div className="dcf-table-wrap">
          <table className="dcf-table">
            <caption>
              Subject contribution · distinct activities in each strand.
              Subjects are listed alphabetically, including those with no
              records. <Source />
            </caption>
            <thead>
              <tr>
                <th scope="col">Subject</th>
                {r.strands.map((strand) => (
                  <th scope="col" key={strand.key} className="dcf-numeric">
                    {strand.name}
                  </th>
                ))}
                <th scope="col" className="dcf-numeric">
                  All DCF activities
                </th>
                <th scope="col">Year groups</th>
              </tr>
            </thead>
            <tbody>
              {r.subjectRows.map((row) => (
                <tr key={row.subject}>
                  <th scope="row">{row.subject}</th>
                  {row.strands.map((cell, i) => (
                    <td
                      key={i}
                      className={`dcf-numeric ${cell.entries.length ? "dcf-filled" : ""}`}
                    >
                      {count(`${row.subject}, ${cell.name}`, cell.entries)}
                    </td>
                  ))}
                  <td className="dcf-numeric">
                    {count(row.subject, row.entries)}
                  </td>
                  <td>{row.years.join(", ") || "No DCF records"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="dcf-footnote">
          These counts describe contribution, not staff performance. Subjects
          with no records need checking against the curriculum offer; every
          department is not expected to cover every element.
        </p>
        <div className="dcf-table-wrap">
          <table className="dcf-table dcf-compact-table">
            <caption>Year group and term · distinct DCF activities</caption>
            <thead>
              <tr>
                <th scope="col">Year group</th>
                {r.terms.map((term) => (
                  <th scope="col" key={term} className="dcf-numeric">
                    {term}
                  </th>
                ))}
                <th scope="col" className="dcf-numeric">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {r.timing.map((row) => (
                <tr key={row.year}>
                  <th scope="row">{row.year}</th>
                  {row.terms.map((cell) => (
                    <td
                      key={cell.term}
                      className={`dcf-numeric ${cell.entries.length ? "dcf-filled" : ""}`}
                    >
                      {count(`${row.year}, ${cell.term}`, cell.entries)}
                    </td>
                  ))}
                  <td className="dcf-numeric">
                    {count(row.year, row.entries)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="dcf-prompt">
          <b>Discuss access:</b> Which opportunities are universal, and which
          depend on subject choices? Check the timetable, option pathways and
          adaptations for learners needing support. The mapping has no
          pupil-level entitlement or participation data.
        </div>
      </Section>

      <Section
        id="dcf-progression"
        number="04"
        title="Progression to investigate"
        subtitle="Intended references are the starting point for reviewing challenge"
      >
        <div className="dcf-table-wrap">
          <table className="dcf-table dcf-compact-table">
            <caption>
              Distinct activities with each progression reference · an activity
              may appear in more than one row. <Source />
            </caption>
            <thead>
              <tr>
                <th scope="col">Progression reference</th>
                {r.years.map((year) => (
                  <th scope="col" key={year} className="dcf-numeric">
                    {year}
                  </th>
                ))}
                <th scope="col" className="dcf-numeric">
                  Activities
                </th>
              </tr>
            </thead>
            <tbody>
              {r.progression
                .filter(
                  (row) =>
                    !["Step 1", "Step 2", "Other bridging"].includes(
                      row.step,
                    ) || row.entries.length,
                )
                .map((row) => (
                  <tr key={row.step}>
                    <th scope="row">{row.step}</th>
                    {row.years.map((cell) => (
                      <td key={cell.year} className="dcf-numeric">
                        {count(`${row.step}, ${cell.year}`, cell.entries)}
                      </td>
                    ))}
                    <td className="dcf-numeric">
                      {count(row.step, row.entries)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <p>
          Bridging references remain separate. Steps are curriculum references,
          not assessments or fixed expectations for an age group. Multiple steps
          or repeated tasks do not, on their own, show that pupils make
          progress.
        </p>
        <div className="dcf-two-column">
          <div className="dcf-insight">
            <h3>Start with a sequence</h3>
            <p>
              {r.revisited.length
                ? `Inspect ${r.revisited
                    .slice(0, 3)
                    .map(
                      (item) =>
                        `${item.element.name} (${item.revisitYears.join(", ")})`,
                    )
                    .join("; ")}. Compare the actual earlier and later tasks.`
                : "No element recurs across standard terms in this selection. Check other terms and schemes before deciding whether a new opportunity is needed."}
            </p>
          </div>
          <div className="dcf-insight">
            <h3>Look for increasing demand</h3>
            <p>
              What can pupils select, explain, create or evaluate more
              independently? How do later tasks build on prior learning and
              transfer the skill into a different context?
            </p>
          </div>
        </div>
      </Section>

      <Section
        id="dcf-priorities"
        number="05"
        title="Leadership priorities"
        subtitle="Proposed review actions for agreement, not completed commitments"
      >
        <div className="dcf-actions">
          {r.actions.map((action, i) => (
            <div className="dcf-action" key={action.id}>
              <div>
                <span className="dcf-action-index">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="dcf-tag">{action.priority}</span>
              </div>
              <div>
                <h3>{action.finding}</h3>
                <p>{action.action}</p>
                <p className="dcf-action-check">
                  <b>Review evidence:</b> {action.check}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="dcf-table-wrap">
          <table className="dcf-table dcf-compact-table">
            <caption>
              Record checks · counts may overlap; these are data checks, not
              quality judgements. <Source />
            </caption>
            <thead>
              <tr>
                <th scope="col">Check</th>
                <th scope="col">Activities</th>
                <th scope="col">Evidence references</th>
              </tr>
            </thead>
            <tbody>
              {r.quality.map((item) => (
                <tr key={item.label}>
                  <th scope="row">{item.label}</th>
                  <td>{count(item.label, item.entries)}</td>
                  <td className="dcf-ref-list">{refs(item.entries)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        id="dcf-discussion"
        number="06"
        title="Discussion with Estyn"
        subtitle="Connect the map to what pupils experience and learn"
      >
        <p>
          Estyn’s curriculum guidance considers progression, curriculum access
          and evidence from learning. Use the school’s existing evidence
          alongside this map. These are suggested discussion prompts, not an
          Estyn checklist or grading rubric.{" "}
          <a className="dcf-source" href="#dcf-guidance">
            [2]
          </a>
        </p>
        <div className="dcf-discussion-grid">
          {[
            [
              "Curriculum intent",
              "Why have we placed these digital skills in these subjects and year groups?",
              "Bring schemes and the element register. Explain purposeful choices and the gaps leaders have identified.",
            ],
            [
              "Progression & transfer",
              "How do later tasks increase challenge and independence?",
              "Bring an earlier and later task, linked pupil work and teachers’ explanations of the sequence, including transition from primary.",
            ],
            [
              "Access & inclusion",
              "How do we know all pupils have suitable opportunities?",
              "Bring timetable and option-pathway checks, examples of adaptations and evidence of support for learners who need it.",
            ],
            [
              "Evaluation & improvement",
              "What did our review find, and what changed as a result?",
              "Bring work scrutiny, pupil and teacher discussion, agreed actions and follow-up evidence. Separate what is planned from what is verified.",
            ],
          ].map(([title, question, evidence]) => (
            <div className="dcf-discussion-card" key={title}>
              <h3>{title}</h3>
              <p className="dcf-question">{question}</p>
              <p>{evidence}</p>
            </div>
          ))}
        </div>
        <div className="dcf-meeting">
          <h3>School evaluation & agreed next steps</h3>
          <p className="dcf-footnote">
            School-authored meeting notes. Blank fields are for agreement during
            review; they are not generated findings.
          </p>
          <Note
            label="Evaluation / evidence from review"
            value={notes.evaluation}
          />
          <Note
            label="Agreed actions / evidence of success"
            value={notes.decisions}
          />
          <div className="dcf-two-column">
            <Note label="Owner(s)" value={notes.owner} />
            <Note
              label="Review date"
              value={notes.reviewDate ? date(notes.reviewDate) : ""}
            />
          </div>
        </div>
      </Section>

      <Section
        id="dcf-sources"
        number="07"
        title="Sources & interpretation"
        subtitle="A clear basis for every figure"
      >
        <div id="dcf-data-source" className="dcf-source-block">
          <h3>[1] School curriculum mapping snapshot</h3>
          <p>
            {r.schoolName} · {dcfScope(r)} · generated {date(r.generatedAt)} (
            {r.generatedAt}). {r.entries.length} distinct DCF activity records;{" "}
            {r.coverage.length} configured elements; {r.subjectRows.length}{" "}
            subjects in scope.
          </p>
          <ul>
            <li>
              Source: the current school’s saved curriculum mappings, linked
              framework references and configured subject and DCF definitions.
              Demonstration data is labelled when applicable.
            </li>
            <li>
              One activity is one unique mapping ID. Duplicate links within an
              activity count once at each element, strand, subject or
              progression category. Separate mapping IDs are retained even if
              their titles match.
            </li>
            <li>
              Element coverage = configured elements with at least one resolved
              DCF link ÷ configured elements × 100. Missing definitions give
              unavailable coverage. The catalogue has not been certified against
              a national version.
            </li>
            <li>
              Links resolve by stored IDs where available, otherwise by names.
              Unresolved links remain in the evidence register and record checks
              but are excluded from element and strand coverage.
            </li>
            <li>
              Filters apply to all figures and exports. Evidence references are
              assigned in the school’s full DCF snapshot before filtering;
              mapping IDs are the durable identifiers. Blank year/term values
              remain in totals and are flagged.
            </li>
            <li>
              Recurrence means one element is recorded in at least two of
              Autumn, Spring and Summer within the same year group. Without an
              academic-year field, these may be different planning cycles.
            </li>
            <li>
              Latest record update is a valid saved record date, not a review or
              delivery date. No baseline, pupil outcomes, delivery confirmation
              or expected provision matrix is available. No improvement trend or
              inspection rating is inferred.
            </li>
          </ul>
        </div>
        <div id="dcf-guidance" className="dcf-source-block">
          <h3>[2] Professional context</h3>
          <p>
            <a href={dcfGuidance.curriculum} target="_blank" rel="noreferrer">
              Estyn: Supplementary guidance on inspecting curriculum in
              maintained schools and PRUs (Summer 2025)
            </a>{" "}
            — see methodology, skills development and questions for leaders.
          </p>
          <p>
            <a href={dcfGuidance.dcf} target="_blank" rel="noreferrer">
              Estyn: Preparing for the Digital Competence Framework (12 July
              2018)
            </a>{" "}
            — historical recommendations on mapping, continuity, leadership and
            collaboration. This is background context, not a current inspection
            checklist.
          </p>
          <p className="dcf-footnote">
            Guidance checked 2 November 2026. The report uses the school’s
            stored framework wording and does not claim Estyn endorsement.
          </p>
        </div>
      </Section>

      {includeEvidence ? (
        <Section
          id="dcf-evidence"
          number="A"
          title="Activity evidence register"
          subtitle={`${r.entries.length} distinct activities · full planned descriptions and DCF references`}
        >
          <p className="dcf-footnote">
            This register contains plans, not verified pupil work. References
            match the snapshot in this report. Use the mapping ID to locate a
            record after the snapshot changes.
          </p>
          {!r.entries.length ? (
            <Empty>No DCF activities match this selection.</Empty>
          ) : (
            r.entries.map((entry) => (
              <EvidenceCard key={entry.mapping.id} entry={entry} />
            ))
          )}
        </Section>
      ) : (
        <div className="dcf-appendix-note">
          The activity appendix is omitted from this meeting pack. Use the
          evidence CSV or include the appendix when exporting for full
          traceability.
        </div>
      )}
      <footer className="dcf-footer">
        <b>{r.schoolName}</b>
        <span>
          DCF management report · {date(r.generatedAt)} · Planned provision
        </span>
      </footer>
    </article>
  );
}
export function EvidenceCard({ entry }: { entry: DcfActivity }) {
  const m = entry.mapping;
  return (
    <div className="dcf-evidence-card" id={`dcf-activity-${entry.evidenceId}`}>
      <div className="dcf-evidence-heading">
        <span className="dcf-evidence-id">{entry.evidenceId}</span>
        <div>
          <h3>{formatMappingTitle(m)}</h3>
          <p>
            {m.subject} · {m.year || "Year not recorded"} ·{" "}
            {m.term || "Term not recorded"} · Scheme:{" "}
            {m.schemeReference || "Not recorded"}
          </p>
        </div>
      </div>
      <p className="dcf-preserve">
        {formatMappingDescription(m) || "No activity description recorded."}
      </p>
      {m.taskDescription && m.taskDescription !== m.activityDescription ? (
        <p className="dcf-preserve">
          <b>Task detail:</b> {m.taskDescription}
        </p>
      ) : null}
      <ul>
        {unique(
          entry.references.map((ref) =>
            [
              ref.strand,
              ref.element,
              dcfProgression(ref),
              ref.descriptor,
              ref.notes,
            ]
              .filter(Boolean)
              .join(" → "),
          ),
        ).map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ul>
      <p className="dcf-footnote">
        Mapping ID: {m.id} · Last record update: {date(m.lastMappedDate)}
      </p>
    </div>
  );
}
function Source() {
  return (
    <a className="dcf-source" href="#dcf-data-source">
      [1]
    </a>
  );
}
function Section({
  id,
  number,
  title,
  subtitle,
  children,
}: {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="dcf-section" id={id}>
      <div className="dcf-section-heading">
        <span>{number}</span>
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
function Metric({
  value,
  label,
  detail,
}: {
  value: string;
  label: string;
  detail: string;
}) {
  return (
    <div className="dcf-metric">
      <strong>{value}</strong>
      <h3>{label}</h3>
      <p>{detail}</p>
    </div>
  );
}
function Empty({ children }: { children: ReactNode }) {
  return <p className="dcf-empty">{children}</p>;
}
function Note({ label, value }: { label: string; value: string }) {
  return (
    <div className="dcf-note">
      <b>{label}</b>
      <p className="dcf-preserve">{value || "To be agreed during review."}</p>
    </div>
  );
}
