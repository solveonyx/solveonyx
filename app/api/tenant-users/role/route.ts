import { NextResponse } from "next/server"
import { getCurrentUserContext } from "@/lib/auth"
import { hasPermission } from "@/lib/permissions"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type UpdateTenantUserRoleBody = {
    tenantUserId?: string
    roleId?: string
}

export async function PATCH(request: Request) {
    const context = await getCurrentUserContext()

    if (!hasPermission(context, "users.edit")) {
        return NextResponse.json({ error: "You do not have permission to edit users." }, { status: 403 })
    }

    const body = (await request.json().catch(() => null)) as UpdateTenantUserRoleBody | null
    const tenantUserId = body?.tenantUserId
    const roleId = body?.roleId

    if (!tenantUserId || !roleId) {
        return NextResponse.json({ error: "Missing tenantUserId or roleId." }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()

    const { error } = await supabase.rpc("update_tenant_user_role", {
        target_tenant_id: context.activeTenantId,
        target_tenant_user_id: tenantUserId,
        requested_role_id: roleId
    })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
}
