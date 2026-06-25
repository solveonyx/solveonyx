# Next Steps

## Purpose

This document is a practical roadmap for the next SolveOnyx build sessions. It records what is working now, what should come next, and what should wait.

## What Is Working Now

- Supabase Auth login.
- Protected app layout with sidebar, header, logout, and sidebar pinning.
- Platform-admin-only sidebar section.
- Platform-admin-only tenant switcher.
- Active tenant name shown read-only in the top header for all protected users.
- `getCurrentUserContext()` loads active tenant role and permissions.
- `hasPermission(context, permissionKey)` works on the frontend.
- `/dashboard` shows auth and tenant diagnostics.
- `/companies` shows tenant-scoped companies.
- `/settings/users` is protected by `users.view`.
- `/settings/users` shows role editing controls only with `users.edit`.
- Role editing calls `/api/tenant-users/role`.
- `/api/tenant-users/role` calls `update_tenant_user_role(...)`.
- Last active Tenant Admin protection is handled by the RPC.
- `/platform/tenants` is platform-admin scoped.
- `/platform/docs` shows internal docs for platform admins.

## What Should Be Built Next

1. User invite flow.
   - Tenant Admin should be able to invite users into the active tenant.
   - The flow should require `users.invite`.
   - It should assign a universal role through `tenant_users.role_id`.

2. Company CRUD.
   - Start with create company.
   - Gate create with `companies.create`.
   - Keep reads tenant-scoped.

3. Server-side permission helper patterns.
   - Keep permission checks consistent across API routes and future server actions.
   - Avoid duplicating permission logic in many places.

4. Manual regression testing.
   - Run the role matrix across Tenant Admin, Manager, User, and Read Only.
   - Confirm direct navigation behaves correctly.

5. Automated test foundation.
   - Add a small set of tests once the next workflow is stable.
   - Best first target: permission visibility and protected route behavior.

## What Should Not Be Built Yet

- Billing.
- CPQ active module.
- Complex role definition management UI.
- Tenant setup wizard with many steps.
- Advanced reporting.
- Broad dashboard analytics.

These can wait until the core tenant/user/company foundation is stronger.

## Database Items To Remember

- `user_profiles` is profile-only.
- Tenant membership belongs in `tenant_users`.
- Platform admin status belongs in `platform_admins`.
- Roles are universal.
- Permissions are universal.
- A user gets a tenant role through `tenant_users.role_id`.
- Do not reintroduce `tenant_id` or `role_id` to `user_profiles`.
- Do not reintroduce `tenant_id` to `roles`.
- Keep user role changes behind `update_tenant_user_role(...)`.
- Do not add broad direct `UPDATE` access to `tenant_users` for role editing.
- User directory visibility depends on `users.view`.

## Frontend Items To Remember

- Use `getCurrentUserContext()` for protected app context.
- Use `hasPermission(context, "...")` for UI visibility.
- UI gating is not the final security boundary.
- Platform Admin is not the same thing as Tenant Admin.
- Tenant dropdown should stay platform-admin only.
- Non-platform users should see active tenant read-only in the header.
- `Add Company` is still a placeholder.
- `Invite User` is still a placeholder.

## Testing Checklist By Role

### Joe As Platform Admin

- Can log in.
- Sees Platform Admin section.
- Sees tenant switcher.
- Can switch tenants.
- Can access `/platform/tenants`.
- Can access `/platform/docs`.
- Sees Users link when active tenant role includes `users.view`.
- Can edit tenant user roles when active tenant role includes `users.edit`.

### Tenant Admin

- Can log in.
- Does not see Platform Admin section.
- Does not see tenant switcher.
- Sees active tenant in header.
- Sees Users link.
- Can access `/settings/users`.
- Sees Invite User placeholder.
- Can edit tenant user roles.
- Cannot remove the last active Tenant Admin.

### Manager

- Can log in.
- Does not see Platform Admin section.
- Does not see tenant switcher.
- Sees active tenant in header.
- Sees Users link.
- Can access `/settings/users`.
- Cannot edit tenant user roles.
- Should not see Invite User unless Manager has `users.invite`.

### User

- Can log in.
- Does not see Platform Admin section.
- Does not see tenant switcher.
- Does not see Users link.
- Cannot access `/settings/users`.

### Read Only

- Can log in.
- Does not see Platform Admin section.
- Does not see tenant switcher.
- Does not see Users link.
- Cannot access `/settings/users`.

## Recommended Next Task

Build the user invite flow next, starting with the smallest safe version:

```text
Tenant Admin clicks Invite User
  -> enters email and role
  -> server verifies users.invite
  -> invite creates or connects user membership for active tenant
  -> new user receives login/invite path
```

Before coding, inspect Supabase invite behavior and decide whether the first version should use Supabase Auth invites or a simpler staged invite table.

