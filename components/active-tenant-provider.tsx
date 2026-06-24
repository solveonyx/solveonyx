"use client"

import {
    createContext,
    type ReactNode,
    useContext,
    useEffect,
    useRef,
    useState,
    useTransition
} from "react"
import { useRouter } from "next/navigation"
import type { TenantMembership } from "@/lib/auth"

const ACTIVE_TENANT_STORAGE_KEY = "solveonyx.activeTenantId"

type ActiveTenantContextValue = {
    activeTenantId: string
    activeTenantName: string | null
    isPending: boolean
    tenantMemberships: TenantMembership[]
    setActiveTenantId: (tenantId: string) => void
}

const ActiveTenantContext = createContext<ActiveTenantContextValue | null>(null)

type ActiveTenantProviderProps = {
    children: ReactNode
    initialActiveTenantId: string
    initialActiveTenantName: string | null
    tenantMemberships: TenantMembership[]
}

function getMembershipByTenantId(
    tenantMemberships: TenantMembership[],
    tenantId: string
) {
    return tenantMemberships.find((membership) => membership.tenantId === tenantId) ?? null
}

async function persistActiveTenantId(tenantId: string) {
    await fetch("/api/active-tenant", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ activeTenantId: tenantId })
    })
}

export function ActiveTenantProvider({
    children,
    initialActiveTenantId,
    initialActiveTenantName,
    tenantMemberships
}: ActiveTenantProviderProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [activeTenantId, setActiveTenantIdState] = useState(initialActiveTenantId)
    const [activeTenantName, setActiveTenantName] = useState(initialActiveTenantName)
    const hasResolvedStoredTenant = useRef(false)

    useEffect(() => {
        setActiveTenantIdState(initialActiveTenantId)
        setActiveTenantName(initialActiveTenantName)
    }, [initialActiveTenantId, initialActiveTenantName])

    useEffect(() => {
        if (hasResolvedStoredTenant.current) {
            return
        }

        hasResolvedStoredTenant.current = true

        const savedTenantId = window.localStorage.getItem(ACTIVE_TENANT_STORAGE_KEY)

        if (!savedTenantId) {
            window.localStorage.setItem(ACTIVE_TENANT_STORAGE_KEY, initialActiveTenantId)
            return
        }

        const savedMembership = getMembershipByTenantId(tenantMemberships, savedTenantId)

        if (!savedMembership) {
            window.localStorage.setItem(ACTIVE_TENANT_STORAGE_KEY, initialActiveTenantId)
            return
        }

        if (savedTenantId === initialActiveTenantId) {
            return
        }

        setActiveTenantIdState(savedMembership.tenantId)
        setActiveTenantName(savedMembership.tenantName)

        void persistActiveTenantId(savedMembership.tenantId).finally(() => {
            startTransition(() => {
                router.refresh()
            })
        })
    }, [initialActiveTenantId, router, tenantMemberships])

    function setActiveTenantId(tenantId: string) {
        const membership = getMembershipByTenantId(tenantMemberships, tenantId)

        if (!membership) {
            return
        }

        if (membership.tenantId === activeTenantId) {
            window.localStorage.setItem(ACTIVE_TENANT_STORAGE_KEY, membership.tenantId)
            return
        }

        window.localStorage.setItem(ACTIVE_TENANT_STORAGE_KEY, membership.tenantId)
        setActiveTenantIdState(membership.tenantId)
        setActiveTenantName(membership.tenantName)

        void persistActiveTenantId(membership.tenantId).finally(() => {
            startTransition(() => {
                router.refresh()
            })
        })
    }

    return (
        <ActiveTenantContext.Provider
            value={{
                activeTenantId,
                activeTenantName,
                isPending,
                tenantMemberships,
                setActiveTenantId
            }}
        >
            {children}
        </ActiveTenantContext.Provider>
    )
}

export function useActiveTenant() {
    const context = useContext(ActiveTenantContext)

    if (!context) {
        throw new Error("useActiveTenant must be used within an ActiveTenantProvider.")
    }

    return context
}
