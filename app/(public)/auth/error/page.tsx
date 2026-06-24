import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type AuthErrorPageProps = {
    searchParams?: Promise<{
        reason?: string
    }>
}

function getErrorCopy(reason?: string) {
    switch (reason) {
        case "missing-profile":
            return {
                title: "User profile setup required",
                message:
                    "This account is authenticated, but no matching row was found in public.user_profiles for the signed-in user."
            }
        case "missing-tenant":
            return {
                title: "Tenant setup required",
                message:
                    "A user profile was found, but no active tenant membership or visible tenant record could be resolved for this account. Check tenant_users, tenants, and RLS visibility."
            }
        case "unauthorized-platform":
            return {
                title: "Platform admin access required",
                message:
                    "This area is only available to users with a matching row in public.platform_admins."
            }
        default:
            return {
                title: "Authentication setup error",
                message:
                    "Something went wrong while resolving the authentication or tenant context. Check the server logs and verify your Supabase auth and profile setup."
            }
    }
}

export default async function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
    const params = searchParams ? await searchParams : undefined
    const copy = getErrorCopy(params?.reason)

    return (
        <div className="flex min-h-screen items-center justify-center p-6">
            <Alert variant="destructive" className="max-w-xl">
                <AlertTitle>{copy.title}</AlertTitle>
                <AlertDescription>{copy.message}</AlertDescription>
            </Alert>
        </div>
    )
}
