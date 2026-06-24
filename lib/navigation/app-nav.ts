import {
    Home
} from "lucide-react"
import { LucideIcon } from "lucide-react"

export type AppNavItem = {
    label: string
    href: string
    icon: LucideIcon
}

export const appNavItems: AppNavItem[] = [
    { label: "Home", href: "/", icon: Home }
]
