# Development Log

## Purpose

This file records important platform decisions and current build status in plain English.

It is not a full changelog. It is a founder/developer reference for what has been built, what changed, and what still needs work.

## Current Platform State

SolveOnyx is currently a multi-tenant SaaS foundation built with:

- Next.js and React.
- Supabase Auth.
- Supabase Postgres.
- Row Level Security.

Known tenants used during development:

- SolveOnyx Dev.
- EOS AV.
- AeroWorks Demo.

AeroWorks Demo is the current demo/test tenant name. It replaced a real client name for privacy during development.

Joe is currently known to be:

- Platform admin.
- Tenant Admin in development tenants used for testing.

`test_admin@aeroworks.demo` is used as a non-platform Tenant Admin test user.

This is a fake/manual test user for role and permission testing only. It should not be used to test real email invite delivery.

## Authentication And Tenant Foundation

Completed:

- Supabase Auth login.
- `user_profiles` stores personal profile data only.
- `tenant_users` controls tenant membership.
- `platform_admins` controls platform admin status.
- Active tenant context loads on protected pages.
- Platform admins can switch tenants.
- Non-platform users do not see the tenant switcher.

Important cleanup completed:

- Removed tenant ownership from `user_profiles`.
- Removed role ownership from `user_profiles`.
- Removed tenant ownership from `roles`.

Architecture decision:

```text
User identity lives in auth.users and user_profiles.
Tenant access lives in tenant_users.
Platform admin access lives in platform_admins.
```

## Roles And Permissions Foundation

Completed:

- Roles are universal platform definitions.
- Current universal roles:
  - Tenant Admin.
  - Manager.
  - User.
  - Read Only.
- Permissions are universal permission keys.
- `role_permissions` maps roles to permissions.
- `tenant_users.role_id` assigns a universal role inside a specific tenant.

Current helper functions:

- `is_platform_admin()`
- `is_tenant_member(target_tenant_id uuid)`
- `has_tenant_permission(target_tenant_id uuid, required_permission_key text)`
- `update_tenant_user_role(target_tenant_id uuid, target_tenant_user_id uuid, requested_role_id uuid)`

Tenant Admin currently receives all seeded permissions.

## Auth Context Update

Completed:

`getCurrentUserContext()` now loads:

- `activeTenantRoleId`
- `activeTenantRoleName`
- `activeTenantPermissions`

This makes role and permission information available to frontend pages.

Example:

```ts
context.activeTenantRoleName
context.activeTenantPermissions
```

## Dashboard Diagnostics

Completed:

The dashboard now shows a read-only tenant auth diagnostics section.

It displays:

- Active Tenant.
- Active Tenant ID.
- Active Tenant Role.
- Active Tenant Role ID.
- Active Tenant Permissions.

This is for verification only.

## App Shell

Completed:

- Sidebar with Workspace links.
- Platform Admin section for platform admins only.
- Platform Documentation link.
- Tenant switcher for platform admins only.
- Logout at the bottom of the sidebar.
- Pin/unpin sidebar behavior stored in browser `localStorage`.
- Top header showing active tenant, current user, and Platform Admin badge.

## Frontend Permission Helper

Completed:

The frontend helper exists:

- `hasPermission(context, permissionKey)`

It checks whether `context.activeTenantPermissions` includes a permission key.

Current usage:

- `companies.create` gates the `Add Company` placeholder.
- `users.view` gates the Users sidebar link and `/settings/users`.
- `users.invite` gates the `Invite User` placeholder.
- `users.edit` gates tenant user role editing controls.

## Tenant User Role Editing

Completed:

- `/settings/users` loads active universal roles.
- Users with `users.edit` see role dropdowns.
- Users without `users.edit` see read-only role text.
- Role changes call `/api/tenant-users/role`.
- The API route calls `update_tenant_user_role(...)`.
- The RPC prevents removing the last active Tenant Admin.
- Direct broad `tenant_users` update access is intentionally avoided.

This allows testing Manager, User, and Read Only permission levels without exposing platform admin status editing.

## Current Page Status

### `/login`

Built:

- Login form.
- Supabase Auth sign-in.

### `/dashboard`

Built:

- User/context information.
- Tenant auth diagnostics.

### `/companies`

Built:

- Tenant-scoped read-only company list.
- Permission-gated `Add Company` placeholder.

Not built:

- Add company flow.
- Edit company flow.
- Delete company flow.

### `/settings/users`

Built:

- Tenant-scoped user list.
- Requires `users.view`.
- Permission-gated `Invite User` placeholder.
- Permission-gated role editing through RPC.

Not built:

- Invite user flow.
- Remove user flow.

### `/platform/tenants`

Built:

- Platform-admin scoped read-only tenant list.

Not built:

- Tenant creation or setup wizard.
- Tenant edit flow.

### `/platform/docs`

Built:

- Platform-admin scoped internal documentation viewer.
- Reads known Markdown files from `/docs`.

## Local Development Stabilization

Completed:

- Added `.nvmrc`.
- Local setup uses Node through `nvm`.
- `npm run dev` uses Webpack:

```json
"dev": "next dev --webpack"
```

Optional Turbopack script:

```json
"dev:turbo": "next dev --turbopack"
```

Reason:

The local Turbopack dev process became sluggish and held `.next/dev/lock`. Webpack is being used for a more stable local development loop.

## Parked Or Not Active

CPQ tables are parked and are not part of the active build.

Do not treat CPQ as live until it is explicitly reactivated.

## Not Built Yet

- Company CRUD.
- User invite flow.
- User remove flow.
- Tenant setup wizard.
- Role definition management UI.
- Production deployment.
- Billing.
- CPQ active module.

## Needs Verification

- Exact production deployment target.
- Final billing provider.
- Final role management UX.
- Final invite email flow.
- Whether automated tests should start with Playwright, Vitest, or both.
