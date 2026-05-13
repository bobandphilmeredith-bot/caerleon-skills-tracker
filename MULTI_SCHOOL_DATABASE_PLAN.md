# Multi-School Database Plan

The app is now structured so each school can have its own curriculum data before Supabase is connected. The current implementation uses local state and local storage only.

## Future Tables

### schools
Stores one record per school.

Suggested fields:
- id
- slug
- name
- motto
- logo_url
- primary_colour
- secondary_colour
- active
- created_at
- updated_at

### users
Stores platform user identities.

Suggested fields:
- id
- email
- display_name
- created_at
- updated_at

### school_users
Joins users to schools and defines school-level roles.

Suggested fields:
- id
- school_id
- user_id
- role
- active
- created_at

### subjects
School-owned table.

Suggested fields:
- id
- school_id
- name
- aole_id
- active
- display_order
- appears_in_mapping_dropdowns
- created_at
- updated_at

### aoles
School-owned table for optional AoLE metadata.

Suggested fields:
- id
- school_id
- name
- active
- created_at
- updated_at

### frameworks
School-owned table.

Suggested fields:
- id
- school_id
- name
- short_name
- active
- display_order
- created_at
- updated_at

### strands
School-owned table.

Suggested fields:
- id
- school_id
- framework_id
- name
- active
- display_order
- created_at
- updated_at

### elements
School-owned table.

Suggested fields:
- id
- school_id
- strand_id
- name
- official_wording
- teacher_friendly_explanation
- example_classroom_opportunities
- search_keywords
- related_connections
- active
- display_order
- created_at
- updated_at

### curriculum_entries
School-owned table for curriculum mapping only.

Suggested fields:
- id
- school_id
- subject_id
- framework_id
- strand_id
- element_id
- year_group
- term
- unit_topic
- learning_activity_description
- scheme_reference
- optional_note
- last_mapped_date
- created_at
- updated_at

### review_cycles
School-owned table.

Suggested fields:
- id
- school_id
- name
- active
- created_at
- updated_at

### branding_settings
School-owned table.

Suggested fields:
- id
- school_id
- school_name
- motto
- logo_url
- primary_colour
- secondary_colour
- framework_colour_themes
- created_at
- updated_at

### audit_logs
Records important local actions when the live version is connected.

Suggested fields:
- id
- school_id
- user_id
- action
- entity_type
- entity_id
- summary
- created_at

## School Ownership Rule

Every school-owned table must include `school_id`.

This includes:
- subjects
- aoles
- frameworks
- strands
- elements
- curriculum_entries
- review_cycles
- branding_settings
- audit_logs

## Future Row-Level Security Notes

Supabase row-level security should enforce:
- Users can only access records for schools they belong to.
- School admins can manage only their own school.
- Platform admins can manage all schools.
- Curriculum entries must never expose records from another school.
- Reports and dashboards must always filter by `school_id`.

## Data Boundaries

This remains a curriculum mapping and visibility platform.

Do not add:
- pupil data
- assessment data
- behaviour data
- safeguarding data
