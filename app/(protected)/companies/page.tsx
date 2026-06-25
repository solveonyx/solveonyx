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

type CompanyRow = {
    id: string
    name: string
    account_number: string | null
    phone: string | null
    email: string | null
    status: string | null
}

export default async function CompaniesPage() {
    const context = await getCurrentUserContext()
    const canCreateCompanies = hasPermission(context, "companies.create")

    const supabase = await createSupabaseServerClient()
    const { data: companies, error } = await supabase
        .from("companies")
        .select("id, name, account_number, phone, email, status")
        .eq("tenant_id", context.activeTenantId)
        .order("name", { ascending: true })

    if (error) {
        throw new Error(error.message)
    }

    const rows = (companies ?? []) as CompanyRow[]

    return (
        <div className="flex min-h-screen justify-center p-6">
            <div className="w-full max-w-5xl space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight">Companies</h1>
                        <p className="text-sm text-muted-foreground">
                            Read-only company records for tenant {context.activeTenantName ?? context.activeTenantId}.
                        </p>
                    </div>
                    {canCreateCompanies ? (
                        <Button type="button" variant="outline">
                            Add Company
                        </Button>
                    ) : null}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Company Directory</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {rows.length === 0 ? (
                            <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-sm text-muted-foreground">
                                No companies found.
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Account Number</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rows.map((company) => (
                                        <TableRow key={company.id}>
                                            <TableCell className="font-medium">{company.name}</TableCell>
                                            <TableCell>{company.account_number ?? "N/A"}</TableCell>
                                            <TableCell>{company.phone ?? "N/A"}</TableCell>
                                            <TableCell>{company.email ?? "N/A"}</TableCell>
                                            <TableCell>{company.status ?? "N/A"}</TableCell>
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
