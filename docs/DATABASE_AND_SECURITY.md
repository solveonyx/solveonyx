# Database And Security

## Purpose

This document explains the current SolveOnyx database and security model in plain English.

The main idea is simple:

```text
Authentication proves who the user is.
tenant_users proves which tenants the user belongs to.
platform_admins proves whether the user can perform platform-level work.
roles and permissions describe what the user can do inside a tenant.
RLS enforces what rows the user can read.
Controlled RPC functions handle sensitive writes.
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

Known tenants used during development include:

- SolveOnyx Dev.
- EOS AV.
- AeroWorks Demo.

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

- `id`
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
test_admin@aeroworks.demo + AeroWorks Demo + Tenant Admin
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
- `users.edit`

`role_permissions` maps roles to permissions.

```text
roles
  -> role_permissions
  -> permissions
```

Current intended behavior:

- Tenant Admin has full tenant permissions, including `users.view`, `users.invite`, and `users.edit`.
- Manager has `users.view` but not `users.edit`.
- User does not have `users.view`.
- Read Only does not have `users.view`.

## Current Database Helper Functions

The current database helper functions are:

- `is_platform_admin()`
- `is_tenant_member(target_tenant_id uuid)`
- `has_tenant_permission(target_tenant_id uuid, required_permission_key text)`
- `update_tenant_user_role(target_tenant_id uuid, target_tenant_user_id uuid, requested_role_id uuid)`

`is_platform_admin()`, `is_tenant_member(...)`, and `has_tenant_permission(...)` support RLS and permission checks at the database level.

`update_tenant_user_role(...)` is a controlled RPC used by `/settings/users` role editing. It avoids granting broad direct `UPDATE` access on `tenant_users`.

## Row Level Security

RLS uses:

- `tenant_users`
- `platform_admins`
- `has_tenant_permission(...)` where permission-specific visibility is needed

RLS does not use:

- `user_profiles.tenant_id`
- `user_profiles.role_id`
- `roles.tenant_id`

Those fields were removed as part of the current architecture.

## User Directory Visibility

The tenant user directory is protected by the `users.view` permission.

This means:

```text
Tenant Admin -> can view users
Manager      -> can view users
User         -> cannot view users
Read Only    -> cannot view users
```

The frontend also hides the Users sidebar link unless the current context includes `users.view`.

## Tenant User Role Editing

Role editing is handled through:

```text
/settings/users
  -> /api/tenant-users/role
  -> public.update_tenant_user_role(...)
```

The API route checks the current app context for `users.edit`, then calls the RPC. The RPC enforces the final database-side rules:

- The caller must be authenticated.
- The target tenant user row must exist.
- The target row must belong to the tenant being edited.
- The caller must have `users.edit` for that tenant.
- The requested role must exist and be active.
- The last active Tenant Admin in a tenant cannot be removed.

Important security decision:

- Do not add a broad `tenant_users` update RLS policy for this feature.
- Keep role changes behind the controlled RPC.

## Active Tenant And Security

Active tenant selection is app/session context. It decides which tenant the frontend is currently trying to show.

It is not the final security boundary.

Security should work like this:

```text
Frontend activeTenantId
  -> page queries data for that tenant
  -> Supabase/RLS or RPC checks whether the logged-in user is allowed
  -> database returns or changes only allowed rows
```

This matters because a user should not gain access just by changing an active tenant value in the browser.

## Current Access Behavior

Currently working:

- Platform-admin tenant switching is working.
- Non-platform tenant users do not see the tenant switcher.
- Companies page is tenant-scoped.
- Users page is tenant-scoped and protected by `users.view`.
- Tenant Admin can edit user roles through the controlled RPC.
- Platform Tenants page is platform-admin scoped.
- Platform Documentation page is platform-admin scoped.
- Dashboard shows tenant auth diagnostics.
- `getCurrentUserContext()` loads active tenant role and permissions.

Not built yet:

- Company create/edit/delete flows.
- User invite/remove flows.
- Role definition management UI.
- Production deployment hardening.

## CPQ Status

CPQ tables are parked. They are not part of the current active build.

Do not assume CPQ is live just because related database concepts may exist.

