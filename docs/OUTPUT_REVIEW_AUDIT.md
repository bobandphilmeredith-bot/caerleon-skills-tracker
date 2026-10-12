# Provision and Coverage Output Audit

## Scope and judgement

Code-level review of navigation, curriculum uploads, shared data loading, dashboards, school and subject reports, themes and exports. This is not a staff usability study or a judgement of teaching quality. The previous output layer offered useful browsing, but was not dependable enough for leadership evaluation: counts and filters could disagree, and record volume could be mistaken for provision quality.

## Findings and changes

| Priority | Finding | Change |
| --- | --- | --- |
| High | School and department reports used inconsistent scopes and arbitrary quality ratings. | Shared Leadership Review and Department Review use the same subject, year and term filters throughout. Removed unsupported RAG judgements. |
| High | Y7 versus Year 7 could silently exclude uploaded records. | Normalised year groups and standard term labels in the shared data bundle. |
| High | Supabase row limits or failed reads could produce incomplete totals resembling genuine gaps. | Paginated reference and mapping reads, batched link queries, loading/error states and retry. Partial failed reads do not produce coverage totals. |
| High | Counts of links could overstate the number of distinct opportunities. | Count distinct activities per element and show distinct subjects, years and terms. |
| Medium | Summary views omitted subjects and some year groups. | Show configured subjects including zero records, and include actual year groups beyond the default list. |
| Medium | Theme arrays could be paired by position rather than identity. | Resolve theme and element links by identity, with labelled legacy fallback. Broad theme tags do not imply element coverage. |
| Medium | Bridging progression could appear as a single step. | Show bridging references separately from individual steps. |
| Medium | A fixed date was labelled as a recent update measure. | Show the actual latest recorded plan update, explicitly not a review date. Missing timing is not invented. |
| Medium | Leadership outputs were difficult to inspect and take into meetings. | Obvious review navigation, count-to-activity drilldowns, subject/term tables, element codes, full work descriptions, scoped CSV exports and print/PDF formatting. |
| Medium | Cynefin planning was difficult to find and compare. | Dedicated Cynefin Plan button and report with subject, year, term, planned work and identification reason. |
| Medium | Design Technology abbreviations prevented import matching. | Accept D & T, ST and DT aliases where a single Design Technology subject can be identified. |

## Review procedure

1. Senior leaders open Leadership Review and select the year group and term under review.
2. Check subjects with no recorded plans against the actual timetable before treating them as omissions.
3. Inspect the subject-by-term and year-by-term tables. Open counts to read the underlying work, rather than comparing totals alone.
4. Inspect Skills coverage for unrecorded elements, reliance on one subject and opportunities across multiple terms. Codes follow the configured framework's strand and element order.
5. Open a Department Review with the subject link. HODs inspect descriptions, progression and theme detail, correcting unclear plans where their role permits.
6. Use Cynefin Plan to compare when departments plan work and what pupils will do. Confirm text-only matches with the department.
7. Download the scoped summary, coverage or activities, or print the current view. Record agreed actions, owners and deadlines in the school's existing review process.

## Interpretation and remaining limitations

- Records have no academic-year field. All-term comparisons can mix planning cycles. Add a migrated academic-year model before claiming annual coverage or year-on-year change.
- A saved plan does not establish delivery, pupil attainment, impact or quality. Triangulate with pupil work and professional discussion.
- The system has no expected subject/cohort/term provision matrix. A zero is an absence of records in the selected scope, not automatically a teaching gap.
- The system has no persistent review decision, named action owner or deadline workflow. CSV/PDF outputs support meetings but do not replace action tracking.
- Each department is not expected to cover every framework element. Whole-framework denominators describe the reference catalogue, not departmental targets.
- Existing exploratory dashboards remain browsing tools; the shared review reports are the consistent evaluation output. Historical hard-coded year views should not be used as a complete inventory.
- Test with representative senior leaders and HODs after release, including mobile viewing, large real datasets and exported meeting papers. Code review is not a substitute for that feedback.

## Verification

`npm run test:reports` covers normalised years and terms, distinct activity counts, filter consistency, zero-record subjects/elements, theme identity, bridging progression, CSV safety and multi-page loading. Release verification also requires source type checking and a successful Vercel build for the pushed commit.
