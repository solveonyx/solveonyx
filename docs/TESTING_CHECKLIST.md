# Testing Checklist

## Purpose

This checklist is for manual browser testing of the current multi-tenant, role, and permission foundation.

## General Setup

- Use a fresh browser session or private window when switching test users.
- Confirm the app is running with `npm run dev`.
- Confirm the database migrations used for permissions, user directory RLS, and `update_tenant_user_role(...)` have been applied in Supabase.
- Keep one known Tenant Admin in each tenant so last-admin protection can be tested safely.
- AeroWorks Demo is the current demo/test tenant name. It replaced a real client name for privacy during development.
- `test_admin@aeroworks.demo` is a fake/manual test user for role and permission testing only. Do not use it to test real email invite delivery.

## Joe As Platform Admin

Expected identity:

- Email: `jshulfer@solveonyx.com`
- Platform admin: yes
- Tenant role: Tenant Admin in development tenants used for testing

Tests:

- Can log in.
- Header shows current tenant name.
- Header shows Joe's user identity.
- Header shows Platform Admin badge.
- Sidebar shows Workspace links.
- Sidebar shows Platform Admin section.
- Sidebar shows Documentation link.
- Sidebar shows tenant switcher under Platform Admin section.
- Tenant switcher can change active tenant.
- `/dashboard` updates after tenant switch.
- `/companies` shows tenant-scoped company data.
- `/settings/users` is accessible.
- `/platform/tenants` is accessible.
- `/platform/docs` is accessible.
- Logout redirects to `/login`.
- `/dashboard` is not accessible after logout.

## test_admin@aeroworks.demo As Tenant Admin

Expected identity:

- Email: `test_admin@aeroworks.demo`
- Platform admin: no
- Active tenant: AeroWorks Demo
- Tenant role: Tenant Admin
- Purpose: fake/manual role and permission testing user only.

Tests:

- Can log in.
- Header shows AeroWorks Demo.
- Sidebar does not show Platform Admin section.
- Sidebar does not show tenant switcher.
- Direct navigation to `/platform/tenants` is blocked.
- Direct navigation to `/platform/docs` is blocked.
- Users link is visible.
- `/settings/users` is accessible.
- Invite User placeholder is visible if `users.invite` is present.
- Role dropdowns are visible if `users.edit` is present.
- Can change another user's role.
- Cannot remove the last active Tenant Admin from the tenant.

## Manager Role

Expected permissions:

- Has `users.view`.
- Does not have `users.edit`.

Tests:

- Can log in.
- Header shows assigned tenant.
- Sidebar does not show Platform Admin section.
- Sidebar does not show tenant switcher.
- Users link is visible.
- `/settings/users` is accessible.
- Role column is read-only text.
- Role dropdowns are not visible.
- Invite User placeholder is hidden unless Manager has `users.invite`.
- Direct PATCH attempts to `/api/tenant-users/role` should fail without `users.edit`.

## User Role

Expected permissions:

- Does not have `users.view`.

Tests:

- Can log in.
- Header shows assigned tenant.
- Sidebar does not show Platform Admin section.
- Sidebar does not show tenant switcher.
- Users link is hidden.
- Direct navigation to `/settings/users` shows access denied or redirects according to the app pattern.
- Cannot access `/platform/tenants`.
- Cannot access `/platform/docs`.

## Read Only Role

Expected permissions:

- Does not have `users.view`.

Tests:

- Can log in.
- Header shows assigned tenant.
- Sidebar does not show Platform Admin section.
- Sidebar does not show tenant switcher.
- Users link is hidden.
- Direct navigation to `/settings/users` shows access denied or redirects according to the app pattern.
- Cannot access `/platform/tenants`.
- Cannot access `/platform/docs`.

## Tenant Switching

Tests:

- Platform admin sees tenant switcher.
- Non-platform users do not see tenant switcher.
- Changing tenant updates the header tenant name.
- Changing tenant updates `/dashboard` diagnostics.
- Changing tenant updates tenant-scoped pages.
- Tenant switcher does not appear for non-platform Tenant Admin, Manager, User, or Read Only.

## Platform Admin Pages

Tests:

- Platform admin can access `/platform/tenants`.
- Platform admin can access `/platform/docs`.
- Non-platform users cannot access `/platform/tenants`.
- Non-platform users cannot access `/platform/docs`.
- Platform Documentation page shows all expected docs.
- Documentation sections expand and collapse.

## Users Page Visibility

Tests:

- Tenant Admin can see Users sidebar link.
- Manager can see Users sidebar link.
- User cannot see Users sidebar link.
- Read Only cannot see Users sidebar link.
- Tenant Admin can access `/settings/users`.
- Manager can access `/settings/users`.
- User cannot access `/settings/users`.
- Read Only cannot access `/settings/users`.

## Role Editing

Tests:

- Tenant Admin sees role dropdowns.
- Tenant Admin can change a user from User to Manager.
- Tenant Admin can change a user from Manager to Read Only.
- Tenant Admin can change their own role only when another active Tenant Admin remains.
- Manager sees read-only role text.
- User cannot access the page.
- Read Only cannot access the page.
- Inactive roles are not assignable.
- Role changes refresh the users list.

## Last Tenant Admin Protection

Tests:

- Create or confirm a tenant with exactly one active Tenant Admin.
- Try changing that Tenant Admin to Manager, User, or Read Only.
- Expected result: change is blocked with a clear error.
- Add another active Tenant Admin.
- Try changing the first Tenant Admin to Manager.
- Expected result: change succeeds.
