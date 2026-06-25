import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getCurrentUserContext } from "@/lib/auth"
import { hasPermission } from "@/lib/permissions"

type TenantUserRow = {
    id: string
    userId: string
    email: string | null
    first_name: string | null
    last_name: string | null
    status: string | null
    role_name: string | null
    created_at: string | null
}

function formatDate(value: string | null) {
    if (!value) {
        return "N/A"
    }

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
        return value
    }

    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
    })
}

export default async function TenantUsersPage() {
    const context = await getCurrentUserContext()
    const canInviteUsers = hasPermission(context, "users.invite")
    const supabase = await createSupabaseServerClient()

    const { data: tenantUsers, error: tenantUsersError } = await supabase
        .from("tenant_users")
        .select("id, user_id, status, role_id, created_at")
        .eq("tenant_id", context.activeTenantId)
        .order("created_at", { ascending: false })

    if (tenantUsersError) {
        throw new Error(tenantUsersError.message)
    }

    const memberships = (tenantUsers ?? []) as Array<{
        id: string
        user_id: string
        status: string | null
        role_id: string | null
        created_at: string | null
    }>

    const userIds = memberships.map((membership) => membership.user_id)
    const roleIds = Array.from(
        new Set(
            memberships
                .map((membership) => membership.role_id)
                .filter((roleId): roleId is string => Boolean(roleId))
        )
    )

    const { data: profiles, error: profileError } = userIds.length
        ? await supabase
              .from("user_profiles")
              .select("id, email, first_name, last_name")
              .in("id", userIds)
        : { data: [], error: null }

    if (profileError) {
        throw new Error(profileError.message)
    }

    const { data: roles, error: roleError } = roleIds.length
        ? await supabase
              .from("roles")
              .select("id, name")
              .in("id", roleIds)
        : { data: [], error: null }

    if (roleError) {
        throw new Error(roleError.message)
    }

    const profilesById = new Map(
        ((profiles ?? []) as Array<{
            id: string
            email: string | null
            first_name: string | null
            last_name: string | null
        }>).map((profile) => [profile.id, profile])
    )

    const rolesById = new Map(
        ((roles ?? []) as Array<{
            id: string
            name: string | null
        }>).map((role) => [role.id, role])
    )

    const rows: TenantUserRow[] = memberships.map((membership) => {
        const profile = profilesById.get(membership.user_id)
        const role = membership.role_id ? rolesById.get(membership.role_id) : null

        return {
            id: membership.id,
            userId: membership.user_id,
            email: profile?.email ?? null,
            first_name: profile?.first_name ?? null,
            last_name: profile?.last_name ?? null,
            status: membership.status,
            role_name: role?.name ?? null,
            created_at: membership.created_at
        }
    })

    return (
        <div className="flex min-h-screen justify-center p-6">
            <div className="w-full max-w-6xl space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight">Tenant Users</h1>
                        <p className="text-sm text-muted-foreground">
                            Read-only users visible for tenant {context.activeTenantName ?? context.activeTenantId}.
                        </p>
                    </div>
                    {canInviteUsers ? (
                        <Button type="button" variant="outline">
                            Invite User
                        </Button>
                    ) : null}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>User Directory</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {rows.length === 0 ? (
                            <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-sm text-muted-foreground">
                                No tenant users found.
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Email</TableHead>
                                        <TableHead>First Name</TableHead>
                                        <TableHead>Last Name</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Created At</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rows.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium">{user.email ?? "N/A"}</TableCell>
                                            <TableCell>{user.first_name ?? "N/A"}</TableCell>
                                            <TableCell>{user.last_name ?? "N/A"}</TableCell>
                                            <TableCell>{user.status ?? "N/A"}</TableCell>
                                            <TableCell>{user.role_name ?? "N/A"}</TableCell>
                                            <TableCell>{formatDate(user.created_at)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
