import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type UserProfileRow = {
    id: string
    email: string | null
    first_name: string | null
    last_name: string | null
    status: string | null
}

type PlatformAdminRow = {
    id: string
}

type TenantRow = {
    id: string
    name: string | null
    legal_name: string | null
    status: string | null
    created_at?: string | null
}

type TenantMembershipRow = {
    id: string
    user_id: string
    tenant_id: string
    role_id: string | null
    status: string
    is_default: boolean | null
}

export type TenantMembership = {
    id: string
    userId: string
    tenantId: string
    roleId: string | null
    status: string
    isDefault: boolean
    tenantName: string | null
    tenant: TenantRow | null
}

export type CurrentUserContext = {
    userId: string
    email: string
    firstName: string | null
    lastName: string | null
    isPlatformAdmin: boolean
    activeTenantId: string
    activeTenantName: string | null
    tenantMemberships: TenantMembership[]
    profile: UserProfileRow
}

export const ACTIVE_TENANT_COOKIE_NAME = "solveonyx-active-tenant"

export async function getAuthenticatedUser() {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.getUser()

    if (error) {
        if (error.message === "Auth session missing!") {
            return null
        }

        throw new Error(error.message)
    }

    return data.user
}

export async function requireAuthenticatedUser() {
    const user = await getAuthenticatedUser()

    if (!user) {
        redirect("/login")
    }

    return user
}

export async function getCurrentUserContext(): Promise<CurrentUserContext> {
    const user = await requireAuthenticatedUser()
    const supabase = await createSupabaseServerClient()
    const cookieStore = await cookies()

    const { data: profileRow, error: profileError } = await supabase
        .from("user_profiles")
        .select("id, email, first_name, last_name, status")
        .eq("id", user.id)
        .maybeSingle()

    if (profileError) {
        throw new Error(profileError.message)
    }

    if (!profileRow) {
        redirect("/auth/error?reason=missing-profile")
    }

    const { data: platformAdminRow, error: platformAdminError } = await supabase
        .from("platform_admins")
        .select("id")
        .eq("id", user.id)
        .maybeSingle()

    if (platformAdminError) {
        throw new Error(platformAdminError.message)
    }

    const { data: membershipRows, error: membershipError } = await supabase
        .from("tenant_users")
        .select("id, tenant_id, user_id, role_id, status, is_default")
        .eq("user_id", user.id)
        .eq("status", "active")

    if (membershipError) {
        throw new Error(membershipError.message)
    }

    const activeMembershipRows = (membershipRows ?? []) as TenantMembershipRow[]

    if (activeMembershipRows.length === 0) {
        redirect("/auth/error?reason=missing-tenant")
    }

    const tenantIds = Array.from(new Set(activeMembershipRows.map((membership) => membership.tenant_id)))

    const { data: tenantRows, error: tenantError } = await supabase
        .from("tenants")
        .select("id, name, legal_name, status")
        .in("id", tenantIds)

    if (tenantError) {
        throw new Error(tenantError.message)
    }

    const tenantsById = new Map(
        ((tenantRows ?? []) as TenantRow[]).map((tenant) => [tenant.id, tenant])
    )

    const tenantMemberships: TenantMembership[] = activeMembershipRows.map((membership) => ({
        id: membership.id,
        userId: membership.user_id,
        tenantId: membership.tenant_id,
        roleId: membership.role_id,
        status: membership.status,
        isDefault: Boolean(membership.is_default),
        tenantName: tenantsById.get(membership.tenant_id)?.name ?? null,
        tenant: tenantsById.get(membership.tenant_id) ?? null
    }))

    const requestedActiveTenantId = cookieStore.get(ACTIVE_TENANT_COOKIE_NAME)?.value ?? null

    const activeMembership =
        tenantMemberships.find((membership) => membership.tenantId === requestedActiveTenantId) ??
        tenantMemberships.find((membership) => membership.isDefault) ??
        tenantMemberships[0] ??
        null

    if (!activeMembership?.tenant) {
        redirect("/auth/error?reason=missing-tenant")
    }

    return {
        userId: user.id,
        email: user.email ?? profileRow.email ?? "",
        firstName: profileRow.first_name ?? null,
        lastName: profileRow.last_name ?? null,
        isPlatformAdmin: Boolean(platformAdminRow as PlatformAdminRow | null),
        activeTenantId: activeMembership.tenantId,
        activeTenantName: activeMembership.tenantName,
        tenantMemberships,
        profile: profileRow as UserProfileRow
    }
}

export async function getDashboardContext() {
    return getCurrentUserContext()
}

export async function requirePlatformAdminContext(): Promise<CurrentUserContext> {
    const context = await getCurrentUserContext()

    if (!context.isPlatformAdmin) {
        redirect("/auth/error?reason=unauthorized-platform")
    }

    return context
}
