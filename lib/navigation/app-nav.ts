import {
    Building2,
    CircleUserRound,
    FileText,
    Layers3,
    Home,
    Users
} from "lucide-react"
import { LucideIcon } from "lucide-react"

export type AppNavItem = {
    label: string
    href: string
    icon: LucideIcon
}

export type AppNavSection = {
    label: string
    items: AppNavItem[]
}

const primaryNavItems: AppNavItem[] = [
    { label: "Home", href: "/", icon: Home },
    { label: "Companies", href: "/companies", icon: Building2 },
    { label: "Users", href: "/settings/users", icon: Users },
    { label: "User Info", href: "/dashboard", icon: CircleUserRound }
]

const platformAdminNavItems: AppNavItem[] = [
    { label: "Tenants", href: "/platform/tenants", icon: Layers3 },
    { label: "Documentation", href: "/platform/docs", icon: FileText }
]

export function getAppNavSections(
    isPlatformAdmin: boolean,
    options: { canViewUsers: boolean }
): AppNavSection[] {
    const workspaceItems = primaryNavItems.filter(
        (item) => item.href !== "/settings/users" || options.canViewUsers
    )

    const sections: AppNavSection[] = [
        {
            label: "Workspace",
            items: workspaceItems
        }
    ]

    if (isPlatformAdmin) {
        sections.push({
            label: "Platform Admin",
            items: platformAdminNavItems
        })
    }

    return sections
}
