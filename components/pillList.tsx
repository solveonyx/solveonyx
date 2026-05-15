"use client"

import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { emptyStateDefinitions } from "@/lib/emptyStateDefinitions"
import { EDITOR_LOCKED_SUBTLE_DIMMED_CLASS, EDITOR_MUTED_TEXT_CLASS } from "@/lib/editorInteractions"
import { cn } from "@/lib/utils"

type PillListItem = {
    id: string
    label?: string
    name?: string
}

type PillListProps<TItem extends PillListItem, TSelected = TItem> = {
    items: TItem[]
    selectedIds?: string[]
    selectedItems?: TSelected[]
    getItemId?: (item: TItem) => string
    getItemLabel?: (item: TItem) => string
    getSelectedItemId?: (item: TSelected) => string
    onToggle?: (item: TItem, isSelected: boolean) => void
    disabled?: boolean
    className?: string
    pillClassName?: string
    activePillClassName?: string
    inactivePillClassName?: string
    emptyMessage?: string
}

function defaultItemId<TItem extends PillListItem>(item: TItem) {
    return item.id
}

function defaultItemLabel<TItem extends PillListItem>(item: TItem) {
    return item.label ?? item.name ?? item.id
}

function defaultSelectedItemId<TSelected>(item: TSelected) {
    if (typeof item === "object" && item !== null && "id" in item && typeof item.id === "string") {
        return item.id
    }

    return ""
}

export function PillList<TItem extends PillListItem, TSelected = TItem>({
    items,
    selectedIds,
    selectedItems,
    getItemId = defaultItemId,
    getItemLabel = defaultItemLabel,
    getSelectedItemId = defaultSelectedItemId,
    onToggle,
    disabled = false,
    className,
    pillClassName,
    activePillClassName,
    inactivePillClassName,
    emptyMessage = emptyStateDefinitions.generic.pillListNoOptions
}: PillListProps<TItem, TSelected>) {
    const selectedIdSet = new Set([
        ...(selectedIds ?? []),
        ...(selectedItems ?? []).map(getSelectedItemId).filter(Boolean)
    ])

    if (items.length === 0) {
        return <p className="text-sm text-muted-foreground">{emptyMessage}</p>
    }

    return (
        <div className={cn("flex flex-wrap items-center gap-2", className)}>
            {items.map((item) => {
                const itemId = getItemId(item)
                const isSelected = selectedIdSet.has(itemId)
                const label = getItemLabel(item)
                const Icon = isSelected ? X : Plus

                return (
                    <Button
                        key={itemId}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        size="xs"
                        disabled={disabled}
                        onClick={() => onToggle?.(item, isSelected)}
                        aria-pressed={isSelected}
                        className={cn(
                            "w-auto max-w-full justify-start rounded-full px-2.5 active:not-aria-[haspopup]:translate-y-0",
                            disabled
                                ? isSelected
                                    ? EDITOR_LOCKED_SUBTLE_DIMMED_CLASS + " bg-black text-white"
                                    : `${EDITOR_LOCKED_SUBTLE_DIMMED_CLASS} bg-muted/30 ${EDITOR_MUTED_TEXT_CLASS}`
                                : isSelected
                                    ? "bg-black text-white hover:bg-black/90"
                                    : `bg-muted/30 ${EDITOR_MUTED_TEXT_CLASS} hover:bg-muted hover:text-foreground`,
                            pillClassName,
                            isSelected ? activePillClassName : inactivePillClassName
                        )}
                    >
                        <Icon data-icon="inline-start" />
                        <span className="min-w-0 truncate whitespace-nowrap">{label}</span>
                    </Button>
                )
            })}
        </div>
    )
}
