"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useActiveTenant } from "@/components/active-tenant-provider"
import { useSidebarState } from "@/components/sidebar-state-provider"
import { Button } from "@/components/ui/button"
import { LogoutButton } from "@/components/logout-button"
import { Separator } from "@/components/ui/separator"
import { Pin, PinOff } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { getAppNavSections } from "@/lib/navigation/app-nav"
import { cn } from "@/lib/utils"

type AppSidebarProps = {
    isPlatformAdmin: boolean
    canViewUsers: boolean
}

export function AppSidebar({ isPlatformAdmin, canViewUsers }: AppSidebarProps) {
    const sidebarTransitionClass = "duration-200 ease-out"
    const pathname = usePathname()
    const [isExpanded, setIsExpanded] = useState(false)
    const { isPinned, togglePinned } = useSidebarState()
    const isSidebarOpen = isPinned || isExpanded
    const navSections = getAppNavSections(isPlatformAdmin, { canViewUsers })
    const {
        activeTenantId,
        isPending,
        tenantMemberships,
        setActiveTenantId
    } = useActiveTenant()
    const tenantSwitcher = (
        <div className={cn("px-2 pt-1", !isSidebarOpen && "hidden")}>
            <Select
                value={activeTenantId}
                onValueChange={setActiveTenantId}
                disabled={tenantMemberships.length <= 1 || isPending}
            >
                <SelectTrigger className="h-8 w-full text-left">
                    <SelectValue placeholder="Select a tenant" />
                </SelectTrigger>
                <SelectContent>
                    {tenantMemberships.map((membership) => (
                        <SelectItem key={membership.id} value={membership.tenantId}>
                            {membership.tenantName ?? membership.tenantId}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )

    return (
        <>
            <div
                className={cn(
                    `fixed inset-0 z-20 bg-black/20 opacity-0 transition-opacity ${sidebarTransitionClass}`,
                    isSidebarOpen && !isPinned ? "pointer-events-auto opacity-100" : "pointer-events-none"
                )}
                onClick={() => setIsExpanded(false)}
            />
            <aside
                className={cn(
                    `fixed inset-y-0 left-0 z-30 flex flex-col overflow-hidden border-r bg-card p-3 shadow-sm transition-[width] ${sidebarTransitionClass}`,
                    isSidebarOpen ? "w-64" : "w-[4.5rem]"
                )}
                onMouseLeave={() => {
                    if (!isPinned) {
                        setIsExpanded(false)
                    }
                }}
            >
                <div className="mb-4 shrink-0 space-y-3">
                    <div className="relative">
                        <Button
                            type="button"
                            variant="ghost"
                            className="flex h-10 w-full items-center justify-start rounded-lg px-2 hover:bg-transparent focus-visible:bg-transparent active:!translate-y-0"
                            onClick={() => {
                                if (!isPinned) {
                                    setIsExpanded((current) => !current)
                                }
                            }}
                            aria-label={isSidebarOpen ? "Collapse navigation" : "Expand navigation"}
                        >
                            <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg transition-transform group-active/button:translate-y-px">
                                <Image
                                    src="/assets/logos/solveonyx_cube.png"
                                    alt="SolveOnyx"
                                    width={32}
                                    height={32}
                                    className="size-8 object-contain"
                                    priority
                                />
                            </div>
                            <div
                                className={cn(
                                    "ml-3 min-w-0 opacity-0 transition-opacity duration-150",
                                    isSidebarOpen && "opacity-100"
                                )}
                            >
                                <Image
                                    src="/assets/logos/solveonyx_logo_text.png"
                                    alt="SolveOnyx"
                                    width={152}
                                    height={24}
                                    className="h-6 w-auto object-contain"
                                    priority
                                />
                            </div>
                        </Button>
                        {isSidebarOpen ? (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 size-8 text-muted-foreground hover:text-foreground"
                                onClick={togglePinned}
                                aria-label={isPinned ? "Unpin sidebar" : "Pin sidebar"}
                                title={isPinned ? "Unpin sidebar" : "Pin sidebar"}
                            >
                                {isPinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
                            </Button>
                        ) : null}
                    </div>
                    <Separator />
                </div>

                <div className="flex min-h-0 flex-1 flex-col">
                    <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto">
                        {navSections.map((section) => (
                            <div key={section.label} className="space-y-1">
                                {isSidebarOpen ? (
                                    <p className="px-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">
                                        {section.label}
                                    </p>
                                ) : null}
                                {section.items.map((item) => {
                                    const Icon = item.icon
                                    const isActive =
                                        pathname === item.href ||
                                        (item.href !== "/" && pathname.startsWith(`${item.href}/`))

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={cn(
                                                "flex h-10 items-center rounded-lg px-2 text-sm transition-colors",
                                                isActive
                                                    ? "bg-primary text-primary-foreground shadow-sm"
                                                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                                            )}
                                            title={item.label}
                                            onClick={() => {
                                                if (!isPinned) {
                                                    setIsExpanded(false)
                                                }
                                            }}
                                        >
                                            <span className="flex size-8 shrink-0 items-center justify-center">
                                                <Icon className="size-4" aria-hidden="true" />
                                            </span>
                                            <span
                                                className={cn(
                                                    "ml-2 min-w-0 truncate opacity-0 transition-opacity duration-150",
                                                    isSidebarOpen && "opacity-100"
                                                )}
                                            >
                                                {item.label}
                                            </span>
                                        </Link>
                                    )
                                })}
                                {isPlatformAdmin && section.label === "Platform Admin" ? tenantSwitcher : null}
                            </div>
                        ))}
                    </nav>

                    <div className="shrink-0 pt-3">
                        <Separator />
                        <div className="pt-3">
                            <LogoutButton
                                iconOnly={false}
                                showLabel={isSidebarOpen}
                                onLoggedOut={() => setIsExpanded(false)}
                                className={cn(
                                    "flex h-10 w-full cursor-pointer items-center rounded-lg px-2 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground active:bg-primary active:text-primary-foreground",
                                    isSidebarOpen ? "justify-start" : "justify-center px-0"
                                )}
                            />
                        </div>
                    </div>
                </div>
            </aside>
        </>
    )
}
