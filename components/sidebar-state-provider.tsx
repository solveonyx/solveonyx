"use client"

import {
    createContext,
    type ReactNode,
    useContext,
    useSyncExternalStore
} from "react"
import { cn } from "@/lib/utils"

const SIDEBAR_PINNED_STORAGE_KEY = "solveonyx.sidebarPinned"
const SIDEBAR_PINNED_STORAGE_EVENT = "solveonyx-sidebar-pinned-change"

type SidebarStateContextValue = {
    isPinned: boolean
    setIsPinned: (isPinned: boolean) => void
    togglePinned: () => void
}

const SidebarStateContext = createContext<SidebarStateContextValue | null>(null)

export function SidebarStateProvider({ children }: { children: ReactNode }) {
    const isPinned = useSyncExternalStore(
        subscribeToPinnedPreference,
        getPinnedPreferenceSnapshot,
        getPinnedPreferenceServerSnapshot
    )

    function setIsPinned(nextIsPinned: boolean) {
        window.localStorage.setItem(SIDEBAR_PINNED_STORAGE_KEY, String(nextIsPinned))
        window.dispatchEvent(new Event(SIDEBAR_PINNED_STORAGE_EVENT))
    }

    function togglePinned() {
        setIsPinned(!isPinned)
    }

    return (
        <SidebarStateContext.Provider value={{ isPinned, setIsPinned, togglePinned }}>
            {children}
        </SidebarStateContext.Provider>
    )
}

function subscribeToPinnedPreference(onStoreChange: () => void) {
    window.addEventListener("storage", onStoreChange)
    window.addEventListener(SIDEBAR_PINNED_STORAGE_EVENT, onStoreChange)

    return () => {
        window.removeEventListener("storage", onStoreChange)
        window.removeEventListener(SIDEBAR_PINNED_STORAGE_EVENT, onStoreChange)
    }
}

function getPinnedPreferenceSnapshot() {
    return window.localStorage.getItem(SIDEBAR_PINNED_STORAGE_KEY) === "true"
}

function getPinnedPreferenceServerSnapshot() {
    return false
}

export function useSidebarState() {
    const context = useContext(SidebarStateContext)

    if (!context) {
        throw new Error("useSidebarState must be used within a SidebarStateProvider.")
    }

    return context
}

export function SidebarMain({
    children,
    header
}: {
    children: ReactNode
    header?: ReactNode
}) {
    const { isPinned } = useSidebarState()

    return (
        <main
            className={cn(
                "min-h-screen pl-[4.5rem] transition-[padding] duration-200 ease-out",
                isPinned && "md:pl-64"
            )}
        >
            {header}
            {children}
        </main>
    )
}
