import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getCurrentUserContext } from "@/lib/auth"

type TenantUserRow = {
    id: string
    email: string | null
    first_name: string | null
    last_name: string | null
    status: string | null
    role_id: string | null
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
    const supabase = await createSupabaseServerClient()

    const { data: users, error } = await supabase
        .from("user_profiles")
        .select("id, email, first_name, last_name, status, role_id, created_at")
        .order("created_at", { ascending: false })

    if (error) {
        throw new Error(error.message)
    }

    const rows = (users ?? []) as TenantUserRow[]

    return (
        <div className="flex min-h-screen justify-center p-6">
            <div className="w-full max-w-6xl space-y-6">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">Tenant Users</h1>
                    <p className="text-sm text-muted-foreground">
                        Read-only users visible for tenant {context.activeTenantName ?? context.activeTenantId}.
                    </p>
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
                                        <TableHead>Role ID</TableHead>
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
                                            <TableCell>{user.role_id ?? "N/A"}</TableCell>
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
