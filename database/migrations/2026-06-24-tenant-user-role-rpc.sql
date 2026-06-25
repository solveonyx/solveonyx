-- SolveOnyx Tenant User Role Update RPC
-- Date: 2026-06-24
--
-- Purpose:
-- Add a secure database function for changing a tenant user's role.
--
-- This supports role editing from:
--
--   /settings/users
--
-- without granting broad direct UPDATE access on public.tenant_users.
--
-- Why this exists:
-- The frontend allows Tenant Admins to change user roles for testing and
-- tenant management. However, role changes need to be controlled carefully:
--
--   - only users with users.edit should be able to change roles
--   - changes must be limited to the active tenant
--   - requested roles must exist and be active
--   - the last active Tenant Admin in a tenant cannot be removed
--
-- Instead of allowing direct table updates through RLS, the app calls this
-- controlled RPC function:
--
--   public.update_tenant_user_role(
--     target_tenant_id uuid,
--     target_tenant_user_id uuid,
--     requested_role_id uuid
--   )
--
-- Current intended behavior:
--   Tenant Admin -> can edit roles because it has users.edit
--   Manager      -> can view users but cannot edit roles
--   User         -> cannot access the tenant user directory
--   Read Only    -> cannot access the tenant user directory
--
-- NOTE:
-- These changes were originally applied manually in Supabase.
-- This file documents the database migration for source control/history.

begin;

create or replace function public.update_tenant_user_role(
    target_tenant_id uuid,
    target_tenant_user_id uuid,
    requested_role_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    target_membership public.tenant_users%rowtype;
    requested_role public.roles%rowtype;
    tenant_admin_role_id uuid;
    other_tenant_admin_exists boolean;
begin
    -- Require an authenticated user.
    if auth.uid() is null then
        raise exception 'Not authenticated'
            using errcode = '28000';
    end if;

    -- Find the target membership and ensure it belongs to the requested tenant.
    select *
    into target_membership
    from public.tenant_users tu
    where tu.id = target_tenant_user_id
      and tu.tenant_id = target_tenant_id
    for update;

    if not found then
        raise exception 'Tenant user not found for this tenant'
            using errcode = 'P0002';
    end if;

    -- The logged-in user must have users.edit for this tenant.
    if not public.has_tenant_permission(target_tenant_id, 'users.edit') then
        raise exception 'Missing users.edit permission'
            using errcode = '42501';
    end if;

    -- Requested role must exist and be active.
    select *
    into requested_role
    from public.roles r
    where r.id = requested_role_id
      and r.is_active = true;

    if not found then
        raise exception 'Requested role is not active or does not exist'
            using errcode = '22023';
    end if;

    -- Find the universal Tenant Admin role.
    select r.id
    into tenant_admin_role_id
    from public.roles r
    where r.name = 'Tenant Admin'
      and r.is_active = true;

    if tenant_admin_role_id is null then
        raise exception 'Tenant Admin role is missing or inactive'
            using errcode = 'P0002';
    end if;

    -- Prevent removing the last active Tenant Admin from the tenant.
    if target_membership.role_id = tenant_admin_role_id
       and requested_role.id <> tenant_admin_role_id then

        select exists (
            select 1
            from public.tenant_users tu
            where tu.tenant_id = target_tenant_id
              and tu.role_id = tenant_admin_role_id
              and tu.status = 'active'
              and tu.id <> target_membership.id
        )
        into other_tenant_admin_exists;

        if not other_tenant_admin_exists then
            raise exception 'You cannot remove the last active Tenant Admin from this tenant'
                using errcode = '23514';
        end if;
    end if;

    -- Controlled update. No broad tenant_users UPDATE RLS policy is required.
    update public.tenant_users tu
    set
        role_id = requested_role.id,
        updated_at = now()
    where tu.id = target_membership.id
      and tu.tenant_id = target_tenant_id;
end;
$$;

-- Do not grant broad table UPDATE access to tenant_users.
-- Only allow authenticated users to execute this controlled RPC.
revoke all on function public.update_tenant_user_role(uuid, uuid, uuid) from public;
grant execute on function public.update_tenant_user_role(uuid, uuid, uuid) to authenticated;

commit;


-- Optional verification queries:
--
-- Confirm the function exists:
--
-- select
--     p.proname as function_name,
--     pg_get_function_identity_arguments(p.oid) as arguments,
--     pg_get_function_result(p.oid) as return_type
-- from pg_proc p
-- join pg_namespace n
--     on n.oid = p.pronamespace
-- where n.nspname = 'public'
--   and p.proname = 'update_tenant_user_role';
--
--
-- Confirm there is no broad UPDATE policy on tenant_users:
--
-- select
--     tablename,
--     policyname,
--     cmd,
--     qual,
--     with_check
-- from pg_policies
-- where schemaname = 'public'
--   and tablename = 'tenant_users'
-- order by policyname;