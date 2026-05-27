# Platform Admin Role Preview Guide

## What This Feature Is For

The role preview switcher lets a platform admin see the system as another user role.

Use it when you want to check:

- which navigation links different users can see
- whether a page feels clear for teachers, subject leads or viewers
- whether admin-only areas are hidden correctly
- what the app looks like before giving guidance to staff

The preview does not change your real account role in Supabase.

## Who Can Use It

Only platform admins can use role preview.

Other users will not see the role preview control.

## Where To Find It

1. Sign in as a platform admin.
2. Look at the top-right area of the app header.
3. Use the **View as** dropdown.
4. Choose the role you want to preview.

Available preview roles:

- Platform admin
- School admin
- Teacher
- Subject lead
- Viewer

## What Changes In Preview Mode

When you choose a role, the app changes what you can see in the interface.

For example:

- navigation items may appear or disappear
- admin links may be hidden
- add/edit buttons may be hidden
- restricted pages may show an access message
- report links may change depending on the selected role

This is intended to help you understand the user experience for that role.

## What Does Not Change

Role preview does not change your real permissions in the database.

It does not:

- update your Supabase role
- change your staff profile
- change school user records
- change RLS policies
- make another real user account active
- permanently alter your access

Your real role remains platform admin.

## Preview Banner

When role preview is active, a banner appears near the top of the page.

It shows:

- the role you are currently viewing as
- your real role
- a button to return to platform admin view

This is there so you do not accidentally forget you are previewing another role.

## Returning To Your Real Role

To stop previewing:

1. Click **Return to Platform Admin** in the banner.

Or:

1. Open the **View as** dropdown.
2. Select **Platform admin**.

The app will return to your normal platform admin view.

## Suggested Checks

### Check Teacher View

Use this to confirm teachers can:

- open dashboards and subject views
- add curriculum mappings
- edit curriculum mappings where appropriate
- see framework and theme information

Check that teachers cannot:

- manage users
- open platform admin tools
- change school setup

### Check Subject Lead View

Use this to confirm subject leads can:

- review subject curriculum information
- use subject-level reporting
- add and edit mappings
- see the tools they need for department review

Check that subject leads cannot:

- manage all users
- open platform-wide admin tools

### Check Viewer View

Use this to confirm viewers can:

- read dashboards and reports
- browse curriculum evidence
- inspect framework coverage

Check that viewers cannot:

- add curriculum
- edit curriculum
- import data
- change admin settings

### Check School Admin View

Use this to confirm school admins can:

- manage school setup
- manage users for their school
- add and edit curriculum mappings
- access school-level reports

Check that school admins cannot:

- access platform-only school management areas
- manage other schools unless the app explicitly allows it

## Important Safety Notes

Role preview is for checking the interface.

Server-side API permissions still use your real account security. This means the app remains protected even while you are previewing another role.

If you need to test a full end-to-end action exactly as a real teacher or subject lead would experience it, use a real test account for that role.

## Troubleshooting

### I Cannot See The View As Dropdown

Check that you are signed in as a platform admin.

Only platform admins can preview roles.

### I Am Stuck Viewing Another Role

Use **Return to Platform Admin** in the preview banner.

If needed, refresh the page after returning to platform admin view.

### A Page Looks Restricted In Preview Mode

That is expected if the selected preview role should not access that page.

Switch back to platform admin view to continue managing the system.

## Quick Summary

Use **View as** to preview another role.

Use **Return to Platform Admin** to stop previewing.

Role preview changes the interface only. It does not change your real Supabase role.
