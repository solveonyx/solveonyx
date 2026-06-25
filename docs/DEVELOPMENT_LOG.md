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

Current working tenants:

- SolveOnyx Dev.
- EOS AV.

Joe is currently known to be:

- Platform admin.
- Tenant Admin in SolveOnyx Dev.
- Tenant Admin in EOS AV.

## Authentication And Tenant Foundation

Completed:

- Supabase Auth login.
- `user_profiles` stores personal profile data only.
- `tenant_users` controls tenant membership.
- `platform_admins` controls platform admin status.
- Tenant switching works.
- Active tenant context loads on protected pages.

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

## Frontend Permission Helper

Completed:

The frontend helper exists:

- `hasPermission(context, permissionKey)`

It checks whether `context.activeTenantPermissions` includes a permission key.

Current usage:

- `companies.create` gates the `Add Company` placeholder.
- `users.invite` gates the `Invite User` placeholder.

These buttons are placeholders only.

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

- Tenant-scoped read-only user list.
- Permission-gated `Invite User` placeholder.

Not built:

- Invite user flow.
- Edit user flow.
- Remove user flow.

### `/platform/tenants`

Built:

- Platform-admin scoped read-only tenant list.

Not built:

- Tenant creation or setup wizard.
- Tenant edit flow.

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
- User edit/remove flow.
- Tenant setup wizard.
- Permission enforcement on server actions/API routes.
- Role management UI.
- Production deployment.
- Billing.
- CPQ active module.

## Needs Verification

- Exact production deployment target.
- Final billing provider.
- Final role management UX.
- Final invite email flow.
- Whether permission checks should be centralized in server actions, route handlers, or both.

