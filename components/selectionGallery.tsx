"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Check, GripVertical, Pencil, Plus, X } from "lucide-react"
import { useSortableList } from "@/hooks/useSortableList"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type GalleryItem = {
    id: string
    label?: string
    name?: string
}

type SelectionGalleryProps<TItem extends GalleryItem> = {
    items: TItem[]
    selectedId?: string | null
    getItemId?: (item: TItem) => string
    getItemLabel?: (item: TItem) => string
    onSelect?: (item: TItem) => void
    onSave?: (item: TItem, newValue: string) => Promise<void>
    onCreate?: (newValue: string) => Promise<void>
    onActiveStateChange?: (isActive: boolean) => void
    disabled?: boolean
    className?: string
    itemClassName?: string
    selectedItemClassName?: string
    emptyMessage?: string
    addButtonLabel?: string
    reorder?: {
        onReorder: (items: TItem[]) => void
    }
}

function defaultItemId<TItem extends GalleryItem>(item: TItem) {
    return item.id
}

function defaultItemLabel<TItem extends GalleryItem>(item: TItem) {
    return item.label ?? item.name ?? item.id
}

export function SelectionGallery<TItem extends GalleryItem>({
    items,
    selectedId,
    getItemId = defaultItemId,
    getItemLabel = defaultItemLabel,
    onSelect,
    onSave,
    onCreate,
    onActiveStateChange,
    disabled = false,
    className,
    itemClassName,
    selectedItemClassName,
    emptyMessage = "No items available.",
    addButtonLabel = "Add",
    reorder
}: SelectionGalleryProps<TItem>) {
    const [hoveredItemId, setHoveredItemId] = useState<string | null>(null)
    const [revealedActionItemId, setRevealedActionItemId] = useState<string | null>(null)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [draftValue, setDraftValue] = useState("")
    const [isAdding, setIsAdding] = useState(false)
    const [newDraftValue, setNewDraftValue] = useState("")
    const [isSaving, setIsSaving] = useState(false)
    const [errorMessage, setErrorMessage] = useState("")
    const inputRef = useRef<HTMLInputElement | null>(null)
    const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const canEdit = Boolean(onSave)
    const canAdd = Boolean(onCreate)
    const canReorder =
        Boolean(reorder?.onReorder) &&
        items.length > 1 &&
        !disabled &&
        editingId === null &&
        !isAdding &&
        !isSaving
    const hasHoverActions = canEdit || Boolean(reorder?.onReorder)
    const trimmedDraftValue = draftValue.trim()
    const trimmedNewDraftValue = newDraftValue.trim()
    const canSaveEditedItem = trimmedDraftValue.length > 0
    const canSaveNewItem = trimmedNewDraftValue.length > 0
    const hasLocalActiveEditor = editingId !== null || isAdding
    const sortable = useSortableList(items, reorder?.onReorder, canReorder)

    const clearHoverTimer = useCallback(() => {
        if (!hoverTimerRef.current) {
            return
        }

        clearTimeout(hoverTimerRef.current)
        hoverTimerRef.current = null
    }, [])

    const queueEditReveal = useCallback((itemId: string) => {
        clearHoverTimer()
        hoverTimerRef.current = setTimeout(() => {
            setRevealedActionItemId(itemId)
            hoverTimerRef.current = null
        }, 500)
    }, [clearHoverTimer])

    const handleMouseLeave = (itemId: string) => {
        clearHoverTimer()
        setHoveredItemId((current) => (current === itemId ? null : current))
        setRevealedActionItemId((current) => (current === itemId ? null : current))
    }

    const startEditing = (item: TItem) => {
        const itemId = getItemId(item)
        clearHoverTimer()
        setEditingId(itemId)
        setDraftValue(getItemLabel(item))
        setIsAdding(false)
        setNewDraftValue("")
        setHoveredItemId(itemId)
        setRevealedActionItemId(null)
        setErrorMessage("")
    }

    const cancelEditing = () => {
        setEditingId(null)
        setDraftValue("")
        setErrorMessage("")
        setIsSaving(false)
    }

    const startAdding = () => {
        if (!onCreate || disabled || isSaving) {
            return
        }

        clearHoverTimer()
        setEditingId(null)
        setDraftValue("")
        setIsAdding(true)
        setNewDraftValue("")
        setHoveredItemId(null)
        setRevealedActionItemId(null)
        setErrorMessage("")
    }

    const cancelAdding = () => {
        setIsAdding(false)
        setNewDraftValue("")
        setErrorMessage("")
        setIsSaving(false)
    }

    const saveItem = async (item: TItem) => {
        if (!onSave || !canSaveEditedItem) {
            return
        }

        setErrorMessage("")
        setIsSaving(true)

        try {
            await onSave(item, draftValue)
            setEditingId(null)
            setDraftValue("")
            setRevealedActionItemId(null)
        } catch (error) {
            console.error("SelectionGallery save error:", error)
            setErrorMessage("Unable to save changes. Please try again.")
        } finally {
            setIsSaving(false)
        }
    }

    const saveNewItem = async () => {
        if (!onCreate || !canSaveNewItem) {
            return
        }

        setErrorMessage("")
        setIsSaving(true)

        try {
            await onCreate(newDraftValue)
            setIsAdding(false)
            setNewDraftValue("")
        } catch (error) {
            console.error("SelectionGallery create error:", error)
            setErrorMessage("Unable to add item. Please try again.")
        } finally {
            setIsSaving(false)
        }
    }

    useEffect(() => {
        return () => {
            clearHoverTimer()
        }
    }, [clearHoverTimer])

    useEffect(() => {
        if (editingId === null && !isAdding) {
            return
        }

        inputRef.current?.focus()
        inputRef.current?.select()
    }, [editingId, isAdding])

    useEffect(() => {
        onActiveStateChange?.(hasLocalActiveEditor)
    }, [hasLocalActiveEditor, onActiveStateChange])

    useEffect(() => {
        if (!selectedId) {
            clearHoverTimer()
            setHoveredItemId(null)
            setRevealedActionItemId(null)
            if (editingId !== null) {
                cancelEditing()
            }
            if (isAdding) {
                cancelAdding()
            }
            return
        }

        if (disabled || !hasHoverActions) {
            clearHoverTimer()
            setHoveredItemId(null)
            setRevealedActionItemId(null)
        }

        if (editingId !== null && selectedId !== editingId) {
            cancelEditing()
        }
    }, [clearHoverTimer, disabled, editingId, hasHoverActions, isAdding, selectedId])

    useEffect(() => {
        if (!hasHoverActions || disabled || editingId !== null || isAdding) {
            clearHoverTimer()
            setRevealedActionItemId(null)
            return
        }

        if (hoveredItemId && hoveredItemId === selectedId) {
            queueEditReveal(hoveredItemId)
            return
        }

        clearHoverTimer()
        setRevealedActionItemId(null)
    }, [clearHoverTimer, disabled, editingId, hasHoverActions, hoveredItemId, isAdding, queueEditReveal, selectedId])

    if (items.length === 0 && !canAdd) {
        return (
            <div className="flex h-full min-h-0 flex-col gap-2">
                <div
                    className={cn(
                        "flex min-h-0 flex-1 w-full rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground",
                        className
                    )}
                >
                    {emptyMessage}
                </div>
                {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
            </div>
        )
    }

    return (
        <div className="flex h-full min-h-0 flex-col gap-2">
            <div
                className={cn("flex min-h-0 flex-1 w-full flex-col overflow-visible", className)}
            >
                <div
                    ref={canReorder ? sortable.setContainerElement : undefined}
                    className="selection-gallery-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-1 py-1"
                >
                    {items.map((item) => {
                    const itemId = getItemId(item)
                    const isSelected = selectedId === itemId
                    const isEditing = editingId === itemId
                    const isDraggingRow = canReorder && sortable.draggingId === itemId
                    const showHoverActions =
                        hasHoverActions &&
                        isSelected &&
                        hoveredItemId === itemId &&
                        revealedActionItemId === itemId &&
                        !isEditing
                    const itemSelectionDisabled = disabled || (editingId !== null && !isEditing)
                    const showLeftActionGutter = Boolean(reorder?.onReorder)

                        return (
                            <div
                                key={itemId}
                                ref={canReorder ? (node) => sortable.setItemElement(itemId, node) : undefined}
                                className={cn(
                                    "relative transition-[transform,box-shadow,background-color,opacity]",
                                    isDraggingRow && "pointer-events-none z-20 will-change-transform !transition-none"
                                )}
                                onMouseEnter={() => {
                                    setHoveredItemId(itemId)

                                    if (!hasHoverActions || disabled || editingId !== null || isAdding || !isSelected) {
                                        setRevealedActionItemId(null)
                                        clearHoverTimer()
                                        return
                                    }

                                    queueEditReveal(itemId)
                                }}
                                onMouseLeave={() => handleMouseLeave(itemId)}
                            >
                                {isEditing ? (
                                    <Input
                                        ref={inputRef}
                                        type="text"
                                        value={draftValue}
                                        onChange={(event) => setDraftValue(event.target.value)}
                                        disabled={isSaving}
                                        className={cn(
                                            "h-10 w-full rounded-lg pr-[3.75rem] pl-3 text-sm",
                                            selectedItemClassName
                                        )}
                                    />
                                ) : (
                                    <button
                                        type="button"
                                        disabled={itemSelectionDisabled}
                                        aria-pressed={isSelected}
                                        onClick={() => onSelect?.(item)}
                                        className={cn(
                                            "w-full rounded-lg py-2.5 text-left text-sm leading-snug transition-colors",
                                            showLeftActionGutter ? "pl-[1.875rem]" : "pl-3",
                                            hasHoverActions ? "pr-[2.25rem]" : "pr-3",
                                            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                                            "disabled:pointer-events-none disabled:opacity-50",
                                            isSelected
                                                ? "bg-primary text-primary-foreground shadow-sm"
                                                : "bg-card text-card-foreground hover:bg-muted/60",
                                            itemClassName,
                                            isSelected && selectedItemClassName
                                        )}
                                    >
                                        <span className="block whitespace-normal break-words">{getItemLabel(item)}</span>
                                    </button>
                                )}

                                {showHoverActions && Boolean(reorder?.onReorder) ? (
                                    <div className="absolute top-1/2 left-1.5 z-10 -translate-y-1/2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-xs"
                                            disabled={!canReorder}
                                            aria-label="Reorder item"
                                            onMouseDown={
                                                canReorder
                                                    ? (event) => sortable.handleMouseDown(itemId, event.nativeEvent)
                                                    : undefined
                                            }
                                            className={cn(
                                                "h-5 w-5 rounded-none bg-transparent p-0 shadow-none ring-0 active:not-aria-[haspopup]:translate-y-px",
                                                "text-primary-foreground hover:bg-transparent hover:text-primary-foreground",
                                                "focus-visible:bg-transparent focus-visible:ring-0",
                                                canReorder
                                                    ? "cursor-grab active:cursor-grabbing"
                                                    : "cursor-not-allowed opacity-40"
                                            )}
                                        >
                                            <GripVertical />
                                        </Button>
                                    </div>
                                ) : null}

                                {isEditing ? (
                                    <div className="absolute top-1/2 right-2 z-10 flex -translate-y-1/2 items-center gap-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-xs"
                                            onClick={() => saveItem(item)}
                                            disabled={isSaving || !canSaveEditedItem}
                                            aria-label="Save item"
                                            className={cn(
                                                "h-5 w-5 rounded-none bg-transparent p-0 shadow-none ring-0 active:not-aria-[haspopup]:translate-y-px",
                                                "text-foreground hover:bg-transparent hover:text-foreground",
                                                "focus-visible:bg-transparent focus-visible:ring-0",
                                                "disabled:text-foreground/40"
                                            )}
                                        >
                                            <Check />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-xs"
                                            onClick={cancelEditing}
                                            disabled={isSaving}
                                            aria-label="Cancel editing"
                                            className={cn(
                                                "h-5 w-5 rounded-none bg-transparent p-0 shadow-none ring-0 active:not-aria-[haspopup]:translate-y-px",
                                                "text-foreground hover:bg-transparent hover:text-foreground",
                                                "focus-visible:bg-transparent focus-visible:ring-0",
                                                "disabled:text-foreground/40"
                                            )}
                                        >
                                            <X />
                                        </Button>
                                    </div>
                                ) : showHoverActions ? (
                                    <div className="absolute top-1/2 right-2 z-10 -translate-y-1/2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-xs"
                                            onClick={() => startEditing(item)}
                                            disabled={disabled}
                                            aria-label="Edit item"
                                            className={cn(
                                                "h-5 w-5 rounded-none bg-transparent p-0 shadow-none ring-0 active:not-aria-[haspopup]:translate-y-px",
                                                "text-primary-foreground hover:bg-transparent hover:text-primary-foreground",
                                                "focus-visible:bg-transparent focus-visible:ring-0",
                                                "disabled:text-primary-foreground/40"
                                            )}
                                        >
                                            <Pencil />
                                        </Button>
                                    </div>
                                ) : null}
                            </div>
                        )
                    })}

                    {isAdding && (
                        <div className="relative">
                            <Input
                                ref={inputRef}
                                type="text"
                                value={newDraftValue}
                                onChange={(event) => setNewDraftValue(event.target.value)}
                                disabled={isSaving}
                                className="h-10 w-full rounded-lg pr-[3.75rem] pl-3 text-sm"
                            />
                            <div className="absolute top-1/2 right-2 z-10 flex -translate-y-1/2 items-center gap-1">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    onClick={saveNewItem}
                                    disabled={isSaving || !canSaveNewItem}
                                    aria-label="Save new item"
                                    className={cn(
                                        "h-5 w-5 rounded-none bg-transparent p-0 shadow-none ring-0 active:not-aria-[haspopup]:translate-y-px",
                                        "text-foreground hover:bg-transparent hover:text-foreground",
                                        "focus-visible:bg-transparent focus-visible:ring-0",
                                        "disabled:text-foreground/40"
                                    )}
                                >
                                    <Check />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    onClick={cancelAdding}
                                    disabled={isSaving}
                                    aria-label="Cancel adding item"
                                    className={cn(
                                        "h-5 w-5 rounded-none bg-transparent p-0 shadow-none ring-0 active:not-aria-[haspopup]:translate-y-px",
                                        "text-foreground hover:bg-transparent hover:text-foreground",
                                        "focus-visible:bg-transparent focus-visible:ring-0",
                                        "disabled:text-foreground/40"
                                    )}
                                >
                                    <X />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {canAdd && (
                    <div className="shrink-0 px-1 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-start"
                            onClick={startAdding}
                            disabled={disabled || isSaving || editingId !== null || isAdding}
                        >
                            <Plus />
                            {addButtonLabel}
                        </Button>
                    </div>
                )}
                </div>
            {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
        </div>
    )
}
