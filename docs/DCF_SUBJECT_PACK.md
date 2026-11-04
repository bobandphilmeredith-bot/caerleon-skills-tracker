# Subject DCF preparation pack

## Staff process

1. Open **Subjects → Subject DCF Pack**, or open **DCF → Prepare subject PDF**.
2. Choose the subject. Leave **All year groups** and **All terms** selected for the full subject pack, or narrow the selection.
3. Review the task list. Expand a task to check its activity and DCF references.
4. Select **Download subject DCF PDF**. A PDF downloads directly; a print dialog is not required.
5. Check the tasks against what is taught, locate examples of pupil work and use the practice prompts to prepare for discussion. Use the printed spaces for evidence notes and follow-up actions.

**Subject View** and individual **Subject Detail** pages also provide a **Prepare subject DCF PDF** shortcut with the subject already selected. The dedicated page is `/reports/dcf-subject`; `?subject=Welsh` preselects a subject.

## Pack contents

The A4 pack contains a dated school and subject cover, scope and task counts, strand coverage, a task finder, every matching DCF task, a discussion rehearsal and follow-up notes. Each task includes its recorded activity, separate task detail where present, context, scheme reference, DCF strands/elements, progression references, descriptors, notes and mapping record ID. Long content continues onto additional numbered pages. Embedded Noto Sans fonts support Welsh characters.

Tasks are ordered by year group and term. Duplicate mappings and identical DCF links are counted once; distinct descriptors and notes are retained. Recorded links that cannot be resolved against the current catalogue remain visible and are flagged for checking. The selection is limited to the current school and one subject. All signed-in roles that can read school mappings can prepare a pack; editing permissions are unchanged.

The download is disabled until the selection contains a DCF task. Loading errors withhold the preview and export. Font/download errors show a retry message. Changing school or account cancels an in-flight download. Demo exports are marked throughout.

## Interpretation

The pack describes planned opportunities, not verified delivery or pupil attainment. Academic year is not recorded, so staff must check the planning cycle. A subject is not expected to cover every DCF element. Prompts are original preparation questions, not an official Estyn question list. The PDF cites Estyn's Summer 2025 curriculum inspection guidance and distinguishes mapped plans from the pupil work and discussion needed to explore learning.

## Verification

- `node --experimental-strip-types scripts/test-dcf-subject-pack.mjs` checks school/subject filtering, duplicate links, descriptors, stable references, empty selections and long-document pagination.
- Add `--output` to write sample and long-task PDFs into `tmp/pdfs/` for rendering and visual review.
- Run the existing DCF and provision report tests, TypeScript checks and the production build.
- Browser checks cover subject selection, direct download, filters, empty selections, subject shortcuts, subject-lead access, mobile layout and download failures.

PDFs are generated in the browser from the loaded school data; this feature needs no database migration or external PDF service.
