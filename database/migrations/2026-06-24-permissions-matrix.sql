-- SolveOnyx Universal Permissions Matrix
-- Date: 2026-06-24
--
-- Purpose:
-- Add the first standardized platform permission matrix.
--
-- This migration assumes the roles table has already been converted to
-- universal platform roles:
--
--   Tenant Admin
--   Manager
--   User
--   Read Only
--
-- Permissions are universal platform-defined actions such as:
--
--   companies.view
--   companies.create
--   users.invite
--   settings.edit
--
-- Role assignments remain tenant-specific through:
--
--   tenant_users.tenant_id
--   tenant_users.user_id
--   tenant_users.role_id
--
-- This file also adds:
--
--   public.has_tenant_permission(target_tenant_id, required_permission_key)
--
-- That helper answers:
--
--   Does the currently logged-in user have this permission in this tenant?
--
-- NOTE:
-- These changes were originally applied manually in Supabase.
-- This file documents the database migration for source control/history.

begin;

-- Add uniqueness guard for permission keys.
do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'permissions_permission_key_unique'
          and conrelid = 'public.permissions'::regclass
    ) then
        alter table public.permissions
        add constraint permissions_permission_key_unique unique (permission_key);
    end if;
end $$;


-- Add uniqueness guard for role-permission mappings.
do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'role_permissions_role_permission_unique'
          and conrelid = 'public.role_permissions'::regclass
    ) then
        alter table public.role_permissions
        add constraint role_permissions_role_permission_unique unique (role_id, permission_id);
    end if;
end $$;


-- Seed universal permissions.
insert into public.permissions (
    id,
    module,
    action,
    permission_key,
    description,
    created_at
)
values
    (
        gen_random_uuid(),
        'dashboard',
        'view',
        'dashboard.view',
        'Can view the tenant dashboard.',
        now()
    ),

    (
        gen_random_uuid(),
        'companies',
        'view',
        'companies.view',
        'Can view companies.',
        now()
    ),
    (
        gen_random_uuid(),
        'companies',
        'create',
        'companies.create',
        'Can create companies.',
        now()
    ),
    (
        gen_random_uuid(),
        'companies',
        'edit',
        'companies.edit',
        'Can edit companies.',
        now()
    ),
    (
        gen_random_uuid(),
        'companies',
        'delete',
        'companies.delete',
        'Can delete companies.',
        now()
    ),

    (
        gen_random_uuid(),
        'users',
        'view',
        'users.view',
        'Can view tenant users.',
        now()
    ),
    (
        gen_random_uuid(),
        'users',
        'invite',
        'users.invite',
        'Can invite users to the tenant.',
        now()
    ),
    (
        gen_random_uuid(),
        'users',
        'edit',
        'users.edit',
        'Can edit tenant user access.',
        now()
    ),
    (
        gen_random_uuid(),
        'users',
        'remove',
        'users.remove',
        'Can remove users from the tenant.',
        now()
    ),

    (
        gen_random_uuid(),
        'roles',
        'view',
        'roles.view',
        'Can view available tenant roles.',
        now()
    ),

    (
        gen_random_uuid(),
        'settings',
        'view',
        'settings.view',
        'Can view tenant settings.',
        now()
    ),
    (
        gen_random_uuid(),
        'settings',
        'edit',
        'settings.edit',
        'Can edit tenant settings.',
        now()
    )
on conflict (permission_key) do nothing;


-- Tenant Admin gets all permissions.
insert into public.role_permissions (
    id,
    role_id,
    permission_id,
    created_at
)
select
    gen_random_uuid(),
    r.id,
    p.id,
    now()
from public.roles r
cross join public.permissions p
where r.name = 'Tenant Admin'
on conflict (role_id, permission_id) do nothing;


-- Manager gets operational permissions, but not delete,
-- user invite/edit/remove, or settings edit.
insert into public.role_permissions (
    id,
    role_id,
    permission_id,
    created_at
)
select
    gen_random_uuid(),
    r.id,
    p.id,
    now()
from public.roles r
join public.permissions p
    on p.permission_key in (
        'dashboard.view',
        'companies.view',
        'companies.create',
        'companies.edit',
        'users.view',
        'roles.view',
        'settings.view'
    )
where r.name = 'Manager'
on conflict (role_id, permission_id) do nothing;


-- Standard User gets basic view access.
insert into public.role_permissions (
    id,
    role_id,
    permission_id,
    created_at
)
select
    gen_random_uuid(),
    r.id,
    p.id,
    now()
from public.roles r
join public.permissions p
    on p.permission_key in (
        'dashboard.view',
        'companies.view'
    )
where r.name = 'User'
on conflict (role_id, permission_id) do nothing;


-- Read Only gets basic read-only access.
insert into public.role_permissions (
    id,
    role_id,
    permission_id,
    created_at
)
select
    gen_random_uuid(),
    r.id,
    p.id,
    now()
from public.roles r
join public.permissions p
    on p.permission_key in (
        'dashboard.view',
        'companies.view'
    )
where r.name = 'Read Only'
on conflict (role_id, permission_id) do nothing;


-- Helper function:
-- Checks whether the currently authenticated user has a specific permission
-- in a specific tenant.
create or replace function public.has_tenant_permission(
    target_tenant_id uuid,
    required_permission_key text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select
        -- Tenant must exist.
        exists (
            select 1
            from public.tenants t
            where t.id = target_tenant_id
        )
        and

        -- Permission key must exist.
        exists (
            select 1
            from public.permissions p
            where p.permission_key = required_permission_key
        )
        and
        (
            -- Platform admins are allowed for any valid tenant-level permission.
            public.is_platform_admin()

            or

            -- Tenant users must be active members of the target tenant
            -- and their role must include the required permission.
            exists (
                select 1
                from public.tenant_users tu
                join public.roles r
                    on r.id = tu.role_id
                join public.role_permissions rp
                    on rp.role_id = r.id
                join public.permissions p
                    on p.id = rp.permission_id
                where tu.user_id = auth.uid()
                  and tu.tenant_id = target_tenant_id
                  and tu.status = 'active'
                  and r.is_active = true
                  and p.permission_key = required_permission_key
            )
        );
$$;

commit;