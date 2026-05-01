"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useAppShellLock } from "@/components/app-shell-lock-provider"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { appNavItems } from "@/lib/app-nav"
import { cn } from "@/lib/utils"

export function AppSidebar() {
    const sidebarTransitionClass = "duration-200 ease-out"
    const pathname = usePathname()
    const { isNavigationLocked } = useAppShellLock()
    const [isExpanded, setIsExpanded] = useState(false)
    const sidebarIsExpanded = isExpanded && !isNavigationLocked

    const toggleExpanded = () => {
        if (isNavigationLocked) {
            return
        }

        setIsExpanded((current) => !current)
    }

    const handleMouseLeave = () => {
        if (isNavigationLocked || !sidebarIsExpanded) {
            return
        }

        setIsExpanded(false)
    }

    return (
        <>
            <div
                className={cn(
                    `fixed inset-0 z-20 bg-black/20 opacity-0 transition-opacity ${sidebarTransitionClass}`,
                    sidebarIsExpanded ? "pointer-events-auto opacity-100" : "pointer-events-none"
                )}
                onClick={() => setIsExpanded(false)}
            />
            <aside
                className={cn(
                    `fixed inset-y-0 left-0 z-30 overflow-hidden border-r bg-card p-3 shadow-sm transition-[width] ${sidebarTransitionClass}`,
                    sidebarIsExpanded ? "w-64" : "w-[4.5rem]",
                    isNavigationLocked && "select-none"
                )}
                onMouseLeave={handleMouseLeave}
            >
                <div className="mb-4 space-y-3">
                    <Button
                        type="button"
                        variant="ghost"
                        className="flex h-10 w-full items-center justify-start rounded-lg px-2 hover:bg-transparent focus-visible:bg-transparent active:!translate-y-0"
                        onClick={toggleExpanded}
                        disabled={isNavigationLocked}
                        aria-label={sidebarIsExpanded ? "Collapse navigation" : "Expand navigation"}
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
                                sidebarIsExpanded && "opacity-100"
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
                    <Separator />
                </div>

                <nav className="space-y-1">
                    {appNavItems.map((item) => {
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
                                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                                    isNavigationLocked && "pointer-events-none opacity-50"
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
                                        sidebarIsExpanded && "opacity-100"
                                    )}
                                >
                                    {item.label}
                                </span>
                            </Link>
                        )
                    })}
                </nav>
            </aside>
        </>
    )
}
