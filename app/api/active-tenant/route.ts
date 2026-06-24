import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import {
    ACTIVE_TENANT_COOKIE_NAME,
    getCurrentUserContext
} from "@/lib/auth"

export async function POST(request: Request) {
    const body = (await request.json().catch(() => null)) as { activeTenantId?: string } | null
    const activeTenantId = body?.activeTenantId

    if (!activeTenantId) {
        return NextResponse.json({ error: "Missing activeTenantId." }, { status: 400 })
    }

    const context = await getCurrentUserContext()
    const membership = context.tenantMemberships.find(
        (tenantMembership) => tenantMembership.tenantId === activeTenantId
    )

    if (!membership) {
        return NextResponse.json({ error: "Tenant access denied." }, { status: 403 })
    }

    const cookieStore = await cookies()
    cookieStore.set(ACTIVE_TENANT_COOKIE_NAME, membership.tenantId, {
        httpOnly: true,
        sameSite: "lax",
        path: "/"
    })

    return NextResponse.json({
        activeTenantId: membership.tenantId,
        activeTenantName: membership.tenantName
    })
}
