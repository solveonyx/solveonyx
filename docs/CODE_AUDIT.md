# Code Audit Notes

## Purpose

This file captures findings from a safe documentation/audit pass. It intentionally does not change app behavior.

## Summary

The current codebase appears aligned with the intended architecture:

- Tenant access is based on `tenant_users`.
- Platform access is based on `platform_admins`.
- Universal roles and permissions are loaded into `getCurrentUserContext()`.
- Frontend permission checks use `hasPermission(...)`.
- `/settings/users` is protected by `users.view`.
- Tenant user role editing uses `/api/tenant-users/role`.
- The API route calls the `update_tenant_user_role(...)` RPC instead of directly updating `tenant_users`.

## Risks Found

### RPC Deployment Dependency

Role editing depends on the Supabase database having `public.update_tenant_user_role(...)` installed.

Risk:

- If the app code is deployed before the RPC exists in the database, role editing will fail.

Recommendation:

- Confirm the migration has been applied in every environment before testing role editing.

### No Broad tenant_users UPDATE Policy Should Be Added

The current route calls the RPC, which is the right direction.

Risk:

- A future broad `tenant_users` update policy could bypass last Tenant Admin protection.

Recommendation:

- Keep direct role changes behind `update_tenant_user_role(...)`.
- Review policies before production.

### Permission Gating Is Split Between UI, Routes, RLS, And RPC

This is normal for a secure app, but it can become hard to reason about.

Recommendation:

- Keep documenting where each permission is enforced.
- Consider a small server-side permission helper pattern before adding many write routes.

### Users Page Query Shape May Need Pagination Later

The tenant users page is currently manageable for development.

Risk:

- Large tenants may need pagination, search, and better loading states.

Recommendation:

- Add pagination before onboarding large tenants.

### Internal Markdown Rendering Is A Simple First Version

The platform docs viewer is intentionally simple and read-only.

Risk:

- Complex Markdown features may not render exactly like GitHub.

Recommendation:

- Keep it simple until docs need richer rendering.

### Limited Automated Test Coverage

Current validation is mostly manual.

Risk:

- Permission regressions can slip in during fast iteration.

Recommendation:

- Add a small test suite around route protection, sidebar visibility, and role editing before broadening the product surface.

## Possible Cleanup Later

These are not urgent and were not changed during this pass:

- Review whether older Supabase helper files are all still used.
- Review unused UI primitives once the design system settles.
- Review whether `getDashboardContext()` is still needed after dashboard diagnostics mature.
- Standardize access denied behavior across protected pages.
- Add clearer comments around tenant context resolution if future developers find it hard to follow.

## TODO Search Findings

No urgent application TODO/FIXME comments were found during the documentation pass.

Most placeholder behavior is intentional:

- `Add Company` is a placeholder.
- `Invite User` is a placeholder.
- CPQ is parked.

## Recommended Next Code Cleanup

Before building more product surface, add a short server-side permission-checking pattern for future API routes and server actions. The goal should be consistency, not a large abstraction.

