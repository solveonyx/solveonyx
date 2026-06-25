# Frontend Architecture

## Purpose

This document explains how the current Next.js frontend is organized and how it connects to authentication, tenant switching, and permissions.

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
  "users.invite"
]
```

## Active Tenant Selection

Tenant switching is working.

The app determines the active tenant from the existing tenant switching flow. The active tenant controls which tenant's data the frontend asks for.

Important:

- Active tenant selection is not the security source of truth.
- RLS is still responsible for enforcing access at the database level.

Simple flow:

```text
User selects tenant
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

## Permission-Gated UI Placeholders

Current permission-gated placeholders:

- `/companies`
  - Shows `Add Company` only if the user has `companies.create`.
- `/settings/users`
  - Shows `Invite User` only if the user has `users.invite`.

These buttons do not do anything yet. They are placeholders only.

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

- Read-only list.
- Permission-gated `Invite User` placeholder.
- No invite/edit/remove flow yet.

### `/platform/tenants`

Shows platform-level tenant records.

Current status:

- Read-only list.
- Intended for platform administrators.

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
- User edit/remove flow.
- Tenant setup wizard.
- Server action/API permission enforcement.
- Role management UI.
- Production deployment.
- Billing.
- Active CPQ module.

