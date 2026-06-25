# Database And Security

## Purpose

This document explains the current SolveOnyx database and security model in plain English.

The main idea is simple:

```text
Authentication proves who the user is.
tenant_users proves which tenants the user belongs to.
platform_admins proves whether the user can perform platform-level work.
RLS enforces what rows the user can read or modify.
```

## Authentication

SolveOnyx uses Supabase Auth.

Users authenticate through:

- `auth.users`

Application profile information is stored separately in:

- `user_profiles`

## user_profiles

`user_profiles` stores only personal/profile information.

Current fields:

- `id`
- `email`
- `first_name`
- `last_name`
- `status`
- `created_at`
- `updated_at`

Important decision:

- `user_profiles.tenant_id` was removed.
- `user_profiles.role_id` was removed.
- RLS should not use `user_profiles` to determine tenant access.

This keeps user identity separate from tenant membership.

## tenants

`tenants` stores customer/workspace records.

Known working tenants:

- SolveOnyx Dev.
- EOS AV.

Tenant-scoped application data should connect back to a tenant.

Example:

```text
tenants.id
  -> companies.tenant_id
  -> tenant_users.tenant_id
```

## tenant_users

`tenant_users` links users to tenants.

Important fields:

- `user_id`
- `tenant_id`
- `role_id`
- `status`
- `is_default`

This table is the source of truth for tenant access.

Example:

```text
Joe + SolveOnyx Dev + Tenant Admin
Joe + EOS AV + Tenant Admin
```

A user can have a different role in each tenant because the role assignment lives on `tenant_users.role_id`.

## platform_admins

`platform_admins` identifies SolveOnyx platform administrators.

Platform admin access is separate from tenant membership.

Important distinction:

- Platform Admin means platform-level access.
- Tenant Admin means tenant-level access inside a specific tenant.

A user can be both, but they are not the same thing.

## Universal Roles

Roles are now universal platform-standard tenant roles.

`roles.tenant_id` was removed.

Current universal roles:

- Tenant Admin.
- Manager.
- User.
- Read Only.

These roles are not tenant-specific definitions. They are shared platform definitions assigned per tenant through `tenant_users.role_id`.

## Permissions

Permissions are universal permission keys.

Examples:

- `dashboard.view`
- `companies.view`
- `companies.create`
- `users.view`
- `users.invite`

`role_permissions` maps roles to permissions.

```text
roles
  -> role_permissions
  -> permissions
```

Tenant Admin currently receives all seeded permissions.

## Current Database Helper Functions

The current database helper functions are:

- `is_platform_admin()`
- `is_tenant_member(target_tenant_id uuid)`
- `has_tenant_permission(target_tenant_id uuid, required_permission_key text)`

These functions support RLS and permission checks at the database level.

## Row Level Security

RLS uses:

- `tenant_users`
- `platform_admins`

RLS does not use:

- `user_profiles.tenant_id`
- `user_profiles.role_id`
- `roles.tenant_id`

Those fields were removed as part of the current architecture.

## Active Tenant And Security

Active tenant selection is app/session context. It decides which tenant the frontend is currently trying to show.

It is not the final security boundary.

Security should work like this:

```text
Frontend activeTenantId
  -> page queries data for that tenant
  -> Supabase/RLS checks whether the logged-in user is allowed
  -> database returns only allowed rows
```

This matters because a user should not gain access just by changing an active tenant value in the browser.

## Current Access Behavior

Currently working:

- Tenant switching is working.
- Companies page is tenant-scoped.
- Tenant Users page is tenant-scoped.
- Platform Tenants page is platform-admin scoped.
- Dashboard shows tenant auth diagnostics.
- `getCurrentUserContext()` loads active tenant role and permissions.

Not built yet:

- Permission enforcement on server actions.
- Permission enforcement on API routes beyond current route access patterns.
- Role management UI.
- User invite/edit/remove flows.
- Company create/edit/delete flows.

## CPQ Status

CPQ tables are parked. They are not part of the current active build.

Do not assume CPQ is live just because related database concepts may exist.

