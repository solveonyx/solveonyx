"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useActiveTenant } from "@/components/active-tenant-provider"
import { Button } from "@/components/ui/button"
import { LogoutButton } from "@/components/logout-button"
import { Separator } from "@/components/ui/separator"
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
}

export function AppSidebar({ isPlatformAdmin }: AppSidebarProps) {
    const sidebarTransitionClass = "duration-200 ease-out"
    const pathname = usePathname()
    const [isExpanded, setIsExpanded] = useState(false)
    const navSections = getAppNavSections(isPlatformAdmin)
    const {
        activeTenantId,
        activeTenantName,
        isPending,
        tenantMemberships,
        setActiveTenantId
    } = useActiveTenant()

    return (
        <>
            <div
                className={cn(
                    `fixed inset-0 z-20 bg-black/20 opacity-0 transition-opacity ${sidebarTransitionClass}`,
                    isExpanded ? "pointer-events-auto opacity-100" : "pointer-events-none"
                )}
                onClick={() => setIsExpanded(false)}
            />
            <aside
                className={cn(
                    `fixed inset-y-0 left-0 z-30 overflow-hidden border-r bg-card p-3 shadow-sm transition-[width] ${sidebarTransitionClass}`,
                    isExpanded ? "w-64" : "w-[4.5rem]"
                )}
                onMouseLeave={() => setIsExpanded(false)}
            >
                <div className="mb-4 space-y-3">
                    <Button
                        type="button"
                        variant="ghost"
                        className="flex h-10 w-full items-center justify-start rounded-lg px-2 hover:bg-transparent focus-visible:bg-transparent active:!translate-y-0"
                        onClick={() => setIsExpanded((current) => !current)}
                        aria-label={isExpanded ? "Collapse navigation" : "Expand navigation"}
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
                                isExpanded && "opacity-100"
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
                    <div
                        className={cn(
                            "px-2 text-left opacity-0 transition-opacity duration-150",
                            isExpanded && "opacity-100"
                        )}
                    >
                        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">
                            Active Tenant
                        </p>
                        <div className="mt-1 space-y-2">
                            <p className="truncate text-sm font-medium text-foreground">
                                {activeTenantName ?? "No tenant selected"}
                            </p>
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
                    </div>
                    <Separator />
                </div>

                <div className="flex h-[calc(100%-4.25rem)] flex-col">
                    <nav className="space-y-4">
                        {navSections.map((section) => (
                            <div key={section.label} className="space-y-1">
                                {isExpanded ? (
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
                                            onClick={() => setIsExpanded(false)}
                                        >
                                            <span className="flex size-8 shrink-0 items-center justify-center">
                                                <Icon className="size-4" aria-hidden="true" />
                                            </span>
                                            <span
                                                className={cn(
                                                    "ml-2 min-w-0 truncate opacity-0 transition-opacity duration-150",
                                                    isExpanded && "opacity-100"
                                                )}
                                            >
                                                {item.label}
                                            </span>
                                        </Link>
                                    )
                                })}
                            </div>
                        ))}
                    </nav>

                    <div className="mt-auto pt-3">
                        <Separator />
                        <div className="pt-3">
                            <LogoutButton
                                iconOnly={false}
                                showLabel={isExpanded}
                                onLoggedOut={() => setIsExpanded(false)}
                                className={cn(
                                    "flex h-10 w-full cursor-pointer items-center rounded-lg px-2 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground active:bg-primary active:text-primary-foreground",
                                    isExpanded ? "justify-start" : "justify-center px-0"
                                )}
                            />
                        </div>
                    </div>
                </div>
            </aside>
        </>
    )
}
