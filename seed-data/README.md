# Seed Data

These CSV files are example imports for the future Supabase database.

Suggested import order:

1. `faculties.csv`
2. `departments.csv`
3. `aoles.csv`
4. `subjects.csv`
5. `academic_years.csv`
6. `terms.csv`
7. `frameworks.csv`
8. `strands.csv`
9. `elements.csv`
10. `curriculum_entries.csv`

`elements.example_classroom_opportunities` uses pipe-separated values so it can be imported as plain CSV text and split later in application code if needed.

The seed data is subject-first. AoLE is optional metadata for filtering and reports only.

The seed data contains curriculum mapping examples only. It does not include pupil, assessment, behaviour, grade, or personnel evaluation data.
