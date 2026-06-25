# SolveOnyx Platform Overview

## What SolveOnyx Is Today

SolveOnyx is a multi-tenant SaaS platform. A tenant is a customer workspace, company account, or operating environment inside the platform.

The current app provides the foundation for:

- Logging in with Supabase Auth.
- Switching between tenants.
- Viewing tenant-scoped companies.
- Viewing tenant-scoped users.
- Viewing platform-wide tenants as a platform administrator.
- Loading the active tenant role and permissions into the application context.
- Showing small permission-gated UI placeholders.

The platform is still early. Several important workflows are intentionally not built yet, including company creation, user invites, role management, billing, production deployment, and the active CPQ module.

## Current Technology

- Frontend: Next.js and React.
- Authentication: Supabase Auth.
- Database: Supabase Postgres.
- Security model: Postgres Row Level Security, using tenant membership and platform administrator tables.

Simple request flow:

```text
User logs in
  -> Supabase Auth verifies the user
  -> App loads user profile and tenant memberships
  -> App resolves active tenant
  -> App loads role and permissions for that tenant
  -> Pages query tenant-scoped data
```

## Current Pages

- `/login`: sign-in page.
- `/dashboard`: authenticated dashboard with tenant auth diagnostics.
- `/companies`: tenant-scoped read-only company list.
- `/settings/users`: tenant-scoped read-only user list.
- `/platform/tenants`: global tenant list for platform administrators.

## Current Modules

### Finished Foundation

- Authentication.
- Tenant switching.
- Tenant-scoped company reads.
- Tenant-scoped user reads.
- Platform-admin tenant reads.
- Roles and permissions database foundation.
- Active tenant role and permissions in app context.
- Frontend permission helper.

### Partially Built

- Permission-gated UI placeholders:
  - `Add Company` appears only with `companies.create`.
  - `Invite User` appears only with `users.invite`.

These buttons do not perform actions yet.

### Not Built Yet

- Company CRUD.
- User invite flow.
- User edit/remove flow.
- Tenant setup wizard.
- Permission enforcement on server actions or API routes.
- Role management UI.
- Production deployment.
- Billing.
- Active CPQ module.

## Current Tenants

The currently known working tenants are:

- SolveOnyx Dev.
- EOS AV.

Joe is currently known to be:

- A SolveOnyx platform administrator.
- Tenant Admin in SolveOnyx Dev.
- Tenant Admin in EOS AV.

This is useful for verifying platform-admin access, tenant switching, and permission-gated UI.

## Important Product Concepts

### Tenant

A tenant is a customer or workspace record. Tenant-specific data, such as companies and tenant users, belongs to a tenant.

### Tenant User

A tenant user is the connection between a person and a tenant.

```text
auth.users user
  -> user_profiles profile
  -> tenant_users membership
  -> tenants workspace
```

### Platform Admin

A platform admin is someone who can operate across the SolveOnyx platform. Platform admin access is separate from tenant roles.

Platform Admin is not the same thing as Tenant Admin.

### Tenant Admin

Tenant Admin is a tenant role. It applies inside a specific tenant. A user can be Tenant Admin in one tenant and have a different role in another tenant.

## Key Architecture Decisions

1. Tenant access is controlled by `tenant_users`.
2. Platform admin access is controlled separately by `platform_admins`.
3. Active tenant selection is frontend/session context, not the database security source of truth.
4. Row Level Security enforces access at the database level.
5. Frontend `activeTenantId` controls which tenant's data the user is trying to view.
6. Roles and permissions are universal platform definitions.
7. A user can have a different role in each tenant through `tenant_users.role_id`.
8. Platform Admin is not the same thing as Tenant Admin.
9. CPQ tables are parked and not part of the current active build.

