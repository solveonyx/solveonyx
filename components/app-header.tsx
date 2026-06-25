import { Badge } from "@/components/ui/badge"
import type { CurrentUserContext } from "@/lib/auth"

type AppHeaderProps = {
    context: CurrentUserContext
}

function getDisplayName(context: CurrentUserContext) {
    const name = [context.firstName, context.lastName].filter(Boolean).join(" ").trim()

    return name || context.email || "Unknown user"
}

export function AppHeader({ context }: AppHeaderProps) {
    const displayName = getDisplayName(context)

    return (
        <header className="sticky top-0 z-10 border-b bg-background/95 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div className="flex min-h-10 flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold">
                        {context.activeTenantName ?? "No tenant selected"}
                    </h2>
                </div>

                <div className="flex min-w-0 items-center gap-3 text-right">
                    {context.isPlatformAdmin ? (
                        <Badge variant="outline" className="hidden sm:inline-flex">
                            Platform Admin
                        </Badge>
                    ) : null}
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{displayName}</p>
                        {context.email ? (
                            <p className="hidden truncate text-xs text-muted-foreground sm:block">{context.email}</p>
                        ) : null}
                    </div>
                </div>
            </div>
        </header>
    )
}
