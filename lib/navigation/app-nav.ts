import {
    Building2,
    CircleUserRound,
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
    { label: "Tenant Users", href: "/settings/users", icon: Users },
    { label: "User Info", href: "/dashboard", icon: CircleUserRound }
]

const platformAdminNavItems: AppNavItem[] = [
    { label: "Tenants", href: "/platform/tenants", icon: Layers3 }
]

export function getAppNavSections(isPlatformAdmin: boolean): AppNavSection[] {
    const sections: AppNavSection[] = [
        {
            label: "Workspace",
            items: primaryNavItems
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
