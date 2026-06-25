import type { CurrentUserContext } from "@/lib/auth"

export function hasPermission(context: CurrentUserContext, permissionKey: string) {
    return context.activeTenantPermissions.includes(permissionKey)
}
