# SolveOnyx Platform Overview

## What SolveOnyx Is Today

SolveOnyx is a multi-tenant SaaS platform. A tenant is a customer workspace, company account, or operating environment inside the platform.

The current app provides the foundation for:

- Logging in with Supabase Auth.
- Resolving an active tenant for protected pages.
- Platform-admin tenant switching.
- Viewing tenant-scoped companies.
- Viewing tenant-scoped users when the user has `users.view`.
- Editing tenant user roles when the user has `users.edit`.
- Viewing platform-wide tenants as a platform administrator.
- Viewing internal documentation as a platform administrator.
- Loading the active tenant role and permissions into the application context.
- Showing small permission-gated UI placeholders.

The platform is still early. Several important workflows are intentionally not built yet, including company creation, user invites, tenant setup, billing, production deployment, and the active CPQ module.

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
- `/settings/users`: tenant-scoped user directory, protected by `users.view`.
- `/platform/tenants`: global tenant list for platform administrators.
- `/platform/docs`: internal documentation viewer for platform administrators.

## Current Modules

### Finished Foundation

- Authentication.
- Tenant resolution.
- Platform-admin tenant switching.
- Tenant-scoped company reads.
- Tenant-scoped user reads.
- Platform-admin tenant reads.
- Platform-admin internal documentation viewer.
- Roles and permissions database foundation.
- Active tenant role and permissions in app context.
- Frontend permission helper.
- User directory access control with `users.view`.
- Tenant user role editing through a controlled RPC.

### Partially Built

- Permission-gated UI placeholders:
  - `Add Company` appears only with `companies.create`.
  - `Invite User` appears only with `users.invite`.
- Role editing on `/settings/users`:
  - Tenant Admin can change tenant user roles through `update_tenant_user_role()`.
  - Manager can view users but cannot edit roles.
  - User and Read Only cannot access the user directory.

The `Add Company` and `Invite User` buttons do not perform actions yet.

### Not Built Yet

- Company CRUD.
- User invite flow.
- User remove flow.
- Tenant setup wizard.
- Role management UI for changing role definitions or permission mappings.
- Production deployment.
- Billing.
- Active CPQ module.

## Current Tenants

Known tenants used during development include:

- SolveOnyx Dev.
- EOS AV.
- AeroWorks Demo.

Joe is currently known to be:

- A SolveOnyx platform administrator.
- Tenant Admin in the development tenants used for testing.

`test_admin@aeroworks.demo` is used as a non-platform Tenant Admin test user for AeroWorks Demo.

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

A platform admin is someone who can operate across the SolveOnyx platform. Platform admin access is controlled by `platform_admins`.

Platform Admin is not the same thing as Tenant Admin.

### Tenant Admin

Tenant Admin is a tenant role. It applies inside a specific tenant. A user can be Tenant Admin in one tenant and have a different role in another tenant.

### Universal Roles And Permissions

Roles are universal platform-standard tenant roles, not tenant-specific role definitions.

Current universal roles:

- Tenant Admin.
- Manager.
- User.
- Read Only.

Permissions are universal permission keys such as:

- `dashboard.view`
- `companies.view`
- `companies.create`
- `users.view`
- `users.invite`
- `users.edit`

`tenant_users.role_id` assigns one of the universal roles to a user inside a specific tenant.

## Key Architecture Decisions

1. Tenant access is controlled by `tenant_users`.
2. Platform admin access is controlled separately by `platform_admins`.
3. Active tenant selection is frontend/session context, not the database security source of truth.
4. Row Level Security enforces access at the database level.
5. Frontend `activeTenantId` controls which tenant's data the user is trying to view.
6. Roles and permissions are universal platform definitions.
7. A user can have a different role in each tenant through `tenant_users.role_id`.
8. Platform Admin is not the same thing as Tenant Admin.
9. Tenant user role editing is handled through the `update_tenant_user_role()` RPC, not broad direct `tenant_users` updates.
10. CPQ tables are parked and not part of the current active build.

