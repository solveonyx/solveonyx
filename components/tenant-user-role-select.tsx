"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"

export type TenantUserRoleOption = {
    id: string
    name: string
}

type TenantUserRoleSelectProps = {
    tenantUserId: string
    currentRoleId: string | null
    roles: TenantUserRoleOption[]
}

export function TenantUserRoleSelect({
    tenantUserId,
    currentRoleId,
    roles
}: TenantUserRoleSelectProps) {
    const router = useRouter()
    const [selectedRoleId, setSelectedRoleId] = useState(currentRoleId ?? "")
    const [errorMessage, setErrorMessage] = useState("")
    const [isPending, startTransition] = useTransition()

    async function updateRole(roleId: string) {
        setSelectedRoleId(roleId)
        setErrorMessage("")

        const response = await fetch("/api/tenant-users/role", {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                tenantUserId,
                roleId
            })
        })

        const responseBody = (await response.json().catch(() => null)) as { error?: string } | null

        if (!response.ok) {
            setSelectedRoleId(currentRoleId ?? "")
            setErrorMessage(responseBody?.error ?? "Unable to update role.")
            return
        }

        startTransition(() => {
            router.refresh()
        })
    }

    return (
        <div className="space-y-1">
            <Select value={selectedRoleId} onValueChange={updateRole} disabled={isPending}>
                <SelectTrigger className="h-8 min-w-36">
                    <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                    {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                            {role.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {errorMessage ? <p className="max-w-56 text-xs text-destructive">{errorMessage}</p> : null}
        </div>
    )
}
