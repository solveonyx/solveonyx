"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createSupabaseBrowserClient } from "@/lib/supabase/browser"
import { cn } from "@/lib/utils"

type LogoutButtonProps = {
    className?: string
    iconOnly?: boolean
    onLoggedOut?: () => void
    showLabel?: boolean
}

export function LogoutButton({
    className,
    iconOnly = false,
    onLoggedOut,
    showLabel = true
}: LogoutButtonProps) {
    const router = useRouter()
    const [isPending, setIsPending] = useState(false)

    return (
        <Button
            type="button"
            variant="ghost"
            onClick={async () => {
                setIsPending(true)

                try {
                    const supabase = createSupabaseBrowserClient()
                    await supabase.auth.signOut()
                    onLoggedOut?.()
                    router.push("/login")
                    router.refresh()
                } finally {
                    setIsPending(false)
                }
            }}
            disabled={isPending}
            aria-label={isPending ? "Signing out" : "Logout"}
            className={cn(className)}
        >
            <LogOut />
            {iconOnly || !showLabel ? null : isPending ? "Signing out..." : "Logout"}
        </Button>
    )
}
