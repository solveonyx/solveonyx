import { redirect } from "next/navigation"
import { LoginForm } from "@/components/login-form"
import { getAuthenticatedUser } from "@/lib/auth"

export default async function LoginPage() {
    const user = await getAuthenticatedUser()

    if (user) {
        redirect("/dashboard")
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-6">
            <LoginForm />
        </div>
    )
}
