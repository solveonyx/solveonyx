-- SolveOnyx User Directory RLS Update
-- Date: 2026-06-24
--
-- Purpose:
-- Update tenant user directory visibility so it follows the universal
-- roles/permissions model.
--
-- Before:
--   tenant_users rows were visible to tenant members broadly.
--   user_profiles only allowed users to view their own profile.
--   This caused tenant user directory rows to appear with N/A profile data
--   when the viewer could see the tenant_users row but not the related
--   user_profiles row.
--
-- After:
--   Users can always view their own tenant membership/profile.
--   Platform admins can view tenant memberships/profiles as needed.
--   Users with users.view permission can view tenant memberships and basic
--   profile data for users in that tenant.
--
-- Current intended behavior:
--   Tenant Admin -> users.view, users.invite, users.edit, users.remove
--   Manager      -> users.view
--   User         -> no users.view
--   Read Only    -> no users.view
--
-- This keeps /settings/users aligned with the permission matrix.
--
-- NOTE:
-- These changes were originally applied manually in Supabase.
-- This file documents the database migration for source control/history.

begin;

-- Replace the broader tenant membership read policy with a permission-aware policy.
drop policy if exists "users can view accessible tenant memberships"
on public.tenant_users;

drop policy if exists "users can view permitted tenant memberships"
on public.tenant_users;

create policy "users can view permitted tenant memberships"
on public.tenant_users
for select
to authenticated
using (
    -- Users can always see their own membership rows.
    user_id = auth.uid()

    -- Platform admins can see memberships globally.
    or public.is_platform_admin()

    -- Tenant users with users.view can see memberships in that tenant.
    or public.has_tenant_permission(tenant_id, 'users.view')
);


-- Replace the old profile-only read pattern with a permission-aware profile policy.
drop policy if exists "users can view their own profile"
on public.user_profiles;

drop policy if exists "users can view profiles in permitted tenants"
on public.user_profiles;

create policy "users can view profiles in permitted tenants"
on public.user_profiles
for select
to authenticated
using (
    -- Users can always see their own profile.
    id = auth.uid()

    -- Platform admins can see profiles.
    or public.is_platform_admin()

    -- Users with users.view can see basic profile data for users
    -- who belong to a tenant where the viewer has users.view permission.
    or exists (
        select 1
        from public.tenant_users target_tu
        where target_tu.user_id = user_profiles.id
          and public.has_tenant_permission(target_tu.tenant_id, 'users.view')
    )
);

commit;


-- Optional verification query:
--
-- select
--     tablename,
--     policyname,
--     cmd,
--     qual
-- from pg_policies
-- where schemaname = 'public'
--   and tablename in ('tenant_users', 'user_profiles')
-- order by tablename, policyname;