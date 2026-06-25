# Frontend Architecture

## Purpose

This document explains how the current Next.js frontend is organized and how it connects to authentication, tenant context, and permissions.

## Technology

The frontend uses:

- Next.js.
- React.
- Supabase client libraries.
- Server Components for protected pages.
- Client Components where browser interaction is needed.

## Main Pages

Current pages:

- `/login`
- `/dashboard`
- `/companies`
- `/settings/users`
- `/platform/tenants`
- `/platform/docs`

## Authentication Flow

Users sign in through Supabase Auth.

Basic flow:

```text
/login
  -> Supabase Auth
  -> authenticated session
  -> protected app pages
```

Protected pages use server-side auth helpers to load the current user context.

## Current User Context

The main auth helper is:

- `getCurrentUserContext()`

It loads the authenticated user's app context, including:

- User ID.
- Email.
- First name.
- Last name.
- Platform admin status.
- Active tenant ID.
- Active tenant name.
- Active tenant role ID.
- Active tenant role name.
- Active tenant permissions.
- Tenant memberships.
- Profile row.

The important permission-related fields are:

```ts
activeTenantRoleId
activeTenantRoleName
activeTenantPermissions
```

Example permission array:

```ts
[
  "dashboard.view",
  "companies.view",
  "companies.create",
  "users.view",
  "users.invite",
  "users.edit"
]
```

## Protected Layout

Protected app pages share the sidebar and top header.

The sidebar contains:

- Workspace links.
- Platform Admin links for platform admins only.
- Tenant switcher for platform admins only.
- Pin/unpin behavior stored in `localStorage`.
- Logout.

The top header shows:

- Active tenant name.
- Current user name.
- Current user email when it fits cleanly.
- Platform Admin badge when applicable.

The header appears on protected pages and does not appear on `/login`.

## Active Tenant Selection

The app determines the active tenant from the existing tenant context flow.

Important current behavior:

- Platform admins can see the tenant dropdown and switch tenants they have access to.
- Non-platform Tenant Admins, Managers, Users, and Read Only users do not see the tenant dropdown.
- Non-platform users still see the active tenant name read-only in the top header.
- Active tenant selection is not the security source of truth.
- RLS and controlled RPC functions are still responsible for enforcing access.

Simple flow:

```text
Platform admin selects tenant
  -> active tenant state/cookie updates
  -> app refreshes
  -> server context reloads
  -> pages query data for activeTenantId
```

## Permission Helper

The frontend permission helper is:

- `hasPermission(context, permissionKey)`

It checks:

```ts
context.activeTenantPermissions.includes(permissionKey)
```

Platform admins do not receive special handling in this helper. If a platform admin should see tenant permission UI, those permissions need to be present in `activeTenantPermissions`.

## Permission-Gated UI

Current permission-gated UI:

- `/companies`
  - Shows `Add Company` only if the user has `companies.create`.
- `/settings/users`
  - Shows `Invite User` only if the user has `users.invite`.
  - Shows role editing controls only if the user has `users.edit`.
- Sidebar
  - Shows Users link only if the user has `users.view`.
  - Shows Platform Admin section only if `isPlatformAdmin` is true.

The `Add Company` and `Invite User` buttons are placeholders only.

## Current Page Responsibilities

### `/dashboard`

Shows authenticated context and tenant auth diagnostics.

Useful for verifying:

- Active tenant.
- Active tenant role.
- Active tenant role ID.
- Active tenant permissions.

### `/companies`

Shows tenant-scoped companies for the active tenant.

Current status:

- Read-only list.
- Permission-gated `Add Company` placeholder.
- No create/edit/delete flow yet.

### `/settings/users`

Shows tenant-scoped users for the active tenant.

Current status:

- Requires `users.view`.
- Shows role text for users without `users.edit`.
- Shows role dropdowns for users with `users.edit`.
- Calls `/api/tenant-users/role` for role updates.
- API route calls `update_tenant_user_role(...)`.
- Permission-gated `Invite User` placeholder.

Not built:

- Invite user flow.
- Remove user flow.
- Platform admin status editing.

### `/platform/tenants`

Shows platform-level tenant records.

Current status:

- Read-only list.
- Intended for platform administrators.

### `/platform/docs`

Shows internal Markdown documentation from the local `/docs` folder.

Current status:

- Platform-admin only.
- Read-only.
- Loads a known list of documentation files server-side.
- Displays each doc in an expandable section.

### `/login`

Signs users in through Supabase Auth.

## Current Development Setup

The project is pinned to Node using:

- `.nvmrc`

The current dev script uses Webpack:

```json
"dev": "next dev --webpack"
```

Turbopack remains available as an optional script:

```json
"dev:turbo": "next dev --turbopack"
```

Webpack is being used for local stability because the local Turbopack dev process previously became sluggish and held `.next/dev/lock`.

## What Is Not Built Yet

- Company CRUD.
- User invite flow.
- User remove flow.
- Tenant setup wizard.
- Role definition management UI.
- Production deployment.
- Billing.
- Active CPQ module.

