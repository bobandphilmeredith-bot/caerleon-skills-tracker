# DCF management report

Open **DCF → Open management report**, or **Review → DCF Management Report**. The report is available to school administrators and platform administrators at `/reports/dcf`.

The report draws on the current school's loaded curriculum mappings and DCF catalogue. Subject, year-group and term filters apply throughout. It includes:

- An executive summary of recorded provision and the next leadership decision.
- Element coverage by year group, including elements without records.
- Subject contributions and term sequencing, with activity drilldowns.
- Intended progression references, with bridging references kept separate.
- Evidence-linked record checks and proposed leadership priorities.
- Discussion prompts for Estyn and space for the school's evaluation and agreed actions.
- Source definitions and an optional full activity appendix.

Use **Print / save PDF** for a landscape A4 meeting paper. **Download meeting pack** saves a self-contained HTML snapshot that can be opened offline or printed; it preserves the selected filters and any entered notes. **Evidence CSV** exports every DCF activity in that selection. The optional appendix can be included in both the live report and meeting pack. Notes are held only in the open page: download the pack before leaving to retain them.

Counts describe planned opportunities, not delivery, pupil attainment, staff performance or an inspection grade. One activity is one unique mapping ID; multiple links do not inflate activity counts within an element or strand. Counts across elements and progression categories overlap and should not be summed. Explicit IDs take precedence over names when resolving framework references. Unresolved references remain visible in record checks and the activity register.

The coverage denominator is the school's configured DCF element catalogue, not a certification of national completeness. An unavailable catalogue is distinguished from zero coverage. Subjects with no DCF records remain visible; every department is not expected to cover the whole framework.

Recurrence means a resolved element appears in two or more standard terms within the same year group. The database has no academic-year field, so leaders must confirm the planning cycle before interpreting recurrence as a sequence. The report does not infer year-on-year improvement, universal pupil access, delivery or impact. The latest update is a mapping-record date, not a curriculum-review date.

Discussion prompts reference Estyn's Summer 2025 curriculum inspection guidance. The 2018 DCF thematic report is identified as historical context. Neither source supplies an inspection rating or endorses the report.

## Validation

Run `node --experimental-strip-types scripts/test-dcf-report.mjs` and `npm run test:reports`, followed by TypeScript and production build checks. The dedicated checks cover school isolation, duplicate links, scope consistency, missing definitions, unresolved references, progression bridges, within-year recurrence, stable evidence references under filtering and safe CSV escaping. Browser checks should cover filters, evidence dialogs, export contents, notes, empty selections, mobile layout and print output.
