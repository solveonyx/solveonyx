import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUserContext } from "@/lib/auth"

export default async function DashboardPage() {
    const context = await getCurrentUserContext()

    return (
        <div className="flex min-h-screen justify-center p-6">
            <div className="w-full max-w-3xl space-y-6">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">User Info</h1>
                    <p className="text-sm text-muted-foreground">
                        Authenticated user, profile, and tenant context.
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Authenticated Context</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <div>
                            <span className="font-medium">User email:</span> {context.email}
                        </div>
                        <div>
                            <span className="font-medium">First name:</span> {context.firstName ?? "N/A"}
                        </div>
                        <div>
                            <span className="font-medium">Last name:</span> {context.lastName ?? "N/A"}
                        </div>
                        <div>
                            <span className="font-medium">Tenant name:</span> {context.activeTenantName ?? "N/A"}
                        </div>
                        <div>
                            <span className="font-medium">Tenant ID:</span> {context.activeTenantId}
                        </div>
                        <div>
                            <span className="font-medium">Platform admin:</span> {context.isPlatformAdmin ? "Yes" : "No"}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Tenant Auth Diagnostics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div>
                            <span className="font-medium">Active Tenant:</span>{" "}
                            {context.activeTenantName ?? "N/A"}
                        </div>
                        <div>
                            <span className="font-medium">Active Tenant ID:</span>{" "}
                            {context.activeTenantId}
                        </div>
                        <div>
                            <span className="font-medium">Active Tenant Role:</span>{" "}
                            {context.activeTenantRoleName ?? "N/A"}
                        </div>
                        <div>
                            <span className="font-medium">Active Tenant Role ID:</span>{" "}
                            {context.activeTenantRoleId ?? "N/A"}
                        </div>
                        <div className="space-y-2">
                            <div className="font-medium">Active Tenant Permissions</div>
                            {context.activeTenantPermissions.length > 0 ? (
                                <ul className="list-disc space-y-1 pl-5 font-mono text-xs">
                                    {context.activeTenantPermissions.map((permissionKey) => (
                                        <li key={permissionKey}>{permissionKey}</li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="text-muted-foreground">No permissions found</div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
