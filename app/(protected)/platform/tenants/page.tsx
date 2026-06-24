import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { requirePlatformAdminContext } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type TenantListRow = {
    id: string
    name: string | null
    legal_name: string | null
    status: string | null
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

export default async function PlatformTenantsPage() {
    await requirePlatformAdminContext()

    const supabase = await createSupabaseServerClient()
    const { data: tenants, error } = await supabase
        .from("tenants")
        .select("id, name, legal_name, status, created_at")
        .order("name", { ascending: true })

    if (error) {
        throw new Error(error.message)
    }

    const rows = (tenants ?? []) as TenantListRow[]

    return (
        <div className="flex min-h-screen justify-center p-6">
            <div className="w-full max-w-6xl space-y-6">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">Platform Tenants</h1>
                    <p className="text-sm text-muted-foreground">
                        Read-only tenant visibility for platform administrators using the authenticated session.
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Tenant Directory</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {rows.length === 0 ? (
                            <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-sm text-muted-foreground">
                                No tenants were returned for this account. If you expected tenant records here, a
                                platform-admin RLS read policy may still be needed.
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Legal Name</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Created At</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rows.map((tenant) => (
                                        <TableRow key={tenant.id}>
                                            <TableCell className="font-medium">{tenant.name ?? "N/A"}</TableCell>
                                            <TableCell>{tenant.legal_name ?? "N/A"}</TableCell>
                                            <TableCell>{tenant.status ?? "N/A"}</TableCell>
                                            <TableCell>{formatDate(tenant.created_at)}</TableCell>
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
