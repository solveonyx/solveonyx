"use client"

import { ReactNode, useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, ChevronRight, GripVertical, Pencil, Plus, Save, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { emptyStateDefinitions } from "@/lib/emptyStateDefinitions"
import { uiTextDefinitions } from "@/lib/uiTextDefinitions"
import {
    EDITOR_ICON_BUTTON_CLASS,
    EDITOR_ICON_BUTTON_INTERACTIVE_CLASS,
    EDITOR_LOCKED_SUBTLE_DIMMED_CLASS,
    EDITOR_MUTED_TEXT_CLASS,
    isSiblingEditorLocked
} from "@/lib/editorInteractions"
import { useSortableList } from "@/hooks/useSortableList"
import { cn } from "@/lib/utils"

type EditableValue = string | number | null | undefined

type ListEditorProps<T extends { id: string }> = {
    items: T[]
    sortField: keyof T
    editableField: keyof T
    onSave?: (row: T, newValue: string) => Promise<void>
    onDelete?: (row: T) => Promise<void>
    onCreate?: (newValue: string) => Promise<void>
    interactionLocked?: boolean
    onActiveStateChange?: (isActive: boolean) => void
    addButtonLabel?: string
    emptyMessage?: string
    rowSupplementLabel?: string
    renderRowSupplement?: (row: T) => ReactNode
    reorder?: {
        onReorder: (items: T[]) => void
    }
}

function toSortable(value: EditableValue): string | number {
    if (value === null || value === undefined) {
        return Number.POSITIVE_INFINITY
    }
    return value
}

export function ListEditor<T extends { id: string }>({
    items,
    sortField,
    editableField,
    onSave,
    onDelete,
    onCreate,
    interactionLocked = false,
    onActiveStateChange,
    addButtonLabel = "Add",
    emptyMessage = emptyStateDefinitions.generic.listEditorNoRows,
    rowSupplementLabel = "Details",
    renderRowSupplement,
    reorder
}: ListEditorProps<T>) {
    const [editingId, setEditingId] = useState<string | null>(null)
    const [expandedSupplementRowId, setExpandedSupplementRowId] = useState<string | null>(null)
    const [draftValue, setDraftValue] = useState("")
    const [isAdding, setIsAdding] = useState(false)
    const [newDraftValue, setNewDraftValue] = useState("")
    const [isSaving, setIsSaving] = useState(false)
    const [errorMessage, setErrorMessage] = useState("")
    const newRowInputRef = useRef<HTMLInputElement | null>(null)
    const editRowInputRef = useRef<HTMLInputElement | null>(null)

    const sortedItems = useMemo(() => {
        const clone = [...items]
        clone.sort((a, b) => {
            const aValue = toSortable(a[sortField] as EditableValue)
            const bValue = toSortable(b[sortField] as EditableValue)

            if (aValue < bValue) return -1
            if (aValue > bValue) return 1
            return a.id.localeCompare(b.id)
        })
        return clone
    }, [items, sortField])

    const startEditing = (row: T) => {
        setEditingId(row.id)
        setDraftValue(String((row[editableField] as EditableValue) ?? ""))
        setIsAdding(false)
        setNewDraftValue("")
        setErrorMessage("")
    }

    const startAdding = () => {
        if (!onCreate) {
            return
        }

        setEditingId(null)
        setDraftValue("")
        setIsAdding(true)
        setNewDraftValue("")
        setErrorMessage("")
    }

    const saveRow = async (row: T) => {
        if (!onSave) {
            return
        }

        setErrorMessage("")
        setIsSaving(true)

        try {
            await onSave(row, draftValue)
            setEditingId(null)
            setDraftValue("")
        } catch (error) {
            console.error("ListEditor save error:", error)
            setErrorMessage(uiTextDefinitions.generic.componentFeedback.listSaveFailed)
        } finally {
            setIsSaving(false)
        }
    }

    const cancelEditing = () => {
        setEditingId(null)
        setDraftValue("")
        setErrorMessage("")
    }

    const saveNewRow = async () => {
        if (!onCreate) {
            return
        }

        setErrorMessage("")
        setIsSaving(true)

        try {
            await onCreate(newDraftValue)
            setIsAdding(false)
            setNewDraftValue("")
        } catch (error) {
            console.error("ListEditor create error:", error)
            setErrorMessage(uiTextDefinitions.generic.componentFeedback.listCreateFailed)
        } finally {
            setIsSaving(false)
        }
    }

    const cancelAdding = () => {
        setIsAdding(false)
        setNewDraftValue("")
        setErrorMessage("")
    }

    const canAdd = Boolean(onCreate)
    const canEdit = Boolean(onSave || onDelete)
    const reorderEnabled = Boolean(reorder?.onReorder)
    const hasLocalActiveEditor = editingId !== null || isAdding
    const canStartNewAction = !interactionLocked && !hasLocalActiveEditor
    const canSaveNewRow = newDraftValue.trim().length > 0
    const canSaveEditedRow = draftValue.trim().length > 0
    const canReorder = reorderEnabled && sortedItems.length > 1 && canStartNewAction && !isSaving
    const showReorderHandle = reorderEnabled && sortedItems.length > 1

    const sortable = useSortableList(sortedItems, reorder?.onReorder, canReorder)

    useEffect(() => {
        setExpandedSupplementRowId((current) => {
            if (!current) {
                return current
            }

            return sortedItems.some((row) => row.id === current) ? current : null
        })
    }, [sortedItems])

    useEffect(() => {
        if (!isAdding) {
            return
        }

        newRowInputRef.current?.focus()
    }, [isAdding])

    useEffect(() => {
        if (editingId === null) {
            return
        }

        editRowInputRef.current?.focus()
    }, [editingId])

    useEffect(() => {
        onActiveStateChange?.(hasLocalActiveEditor)
    }, [hasLocalActiveEditor, onActiveStateChange])

    if (sortedItems.length === 0 && !canAdd) {
        return (
            <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
                {emptyMessage}
            </div>
        )
    }

    const deleteRow = async (row: T) => {
        if (!onDelete) {
            return
        }

        setErrorMessage("")
        setIsSaving(true)

        try {
            await onDelete(row)
            setEditingId(null)
            setDraftValue("")
            setExpandedSupplementRowId((current) => (current === row.id ? null : current))
        } catch (error) {
            console.error("ListEditor delete error:", error)
            setErrorMessage(uiTextDefinitions.generic.componentFeedback.listDeleteFailed)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div
            className="space-y-2"
            ref={canReorder ? sortable.setContainerElement : undefined}
        >
            {sortedItems.map((row) => {
                const isEditing = editingId === row.id
                const isDraggingRow = canReorder && sortable.draggingId === row.id
                const rowSupplement = renderRowSupplement?.(row)
                const hasRowSupplement = Boolean(rowSupplement)
                const isSupplementExpanded = expandedSupplementRowId === row.id
                const rowInteractionLocked = isSiblingEditorLocked(
                    interactionLocked,
                    hasLocalActiveEditor,
                    isEditing
                )

                return (
                    <div key={row.id} className="space-y-2">
                        <div
                            ref={canReorder ? (node) => sortable.setItemElement(row.id, node) : undefined}
                            className={cn(
                                "rounded-lg border bg-card px-3 py-[11px] shadow-sm transition-[transform,box-shadow,background-color,opacity]",
                                isDraggingRow && "pointer-events-none relative z-20 bg-accent opacity-80 shadow-lg will-change-transform !transition-none"
                            )}
                        >
                            <div className="space-y-3">
                                <div className="grid grid-cols-[minmax(0,1fr)_112px] items-center gap-3">
                                    <div className={cn("min-w-0 flex-1", showReorderHandle && "flex items-center gap-3")}>
                                        {showReorderHandle && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                disabled={!canReorder}
                                                onMouseDown={
                                                    canReorder
                                                        ? (event) => sortable.handleMouseDown(row.id, event.nativeEvent)
                                                        : undefined
                                                }
                                                aria-label="Reorder row"
                                                className={cn(
                                                    EDITOR_MUTED_TEXT_CLASS,
                                                    canReorder
                                                        ? `cursor-grab ${EDITOR_ICON_BUTTON_INTERACTIVE_CLASS} active:cursor-grabbing`
                                                        : "cursor-not-allowed opacity-30"
                                                )}
                                            >
                                                <GripVertical />
                                            </Button>
                                        )}

                                        {hasRowSupplement && !isEditing ? (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setExpandedSupplementRowId((current) =>
                                                        current === row.id ? null : row.id
                                                    )
                                                }
                                                disabled={rowInteractionLocked}
                                                className={cn(
                                                    "flex min-w-0 flex-1 items-center gap-2 text-left",
                                                    rowInteractionLocked && EDITOR_LOCKED_SUBTLE_DIMMED_CLASS
                                                )}
                                                aria-label={
                                                    isSupplementExpanded
                                                        ? `Collapse ${rowSupplementLabel}`
                                                        : `Expand ${rowSupplementLabel}`
                                                }
                                            >
                                                <span
                                                    className={cn(
                                                        "flex size-4 shrink-0 items-center justify-center",
                                                        rowInteractionLocked && EDITOR_MUTED_TEXT_CLASS
                                                    )}
                                                    aria-hidden="true"
                                                >
                                                    {isSupplementExpanded ? (
                                                        <ChevronDown className={cn("size-4 shrink-0", EDITOR_MUTED_TEXT_CLASS)} />
                                                    ) : (
                                                        <ChevronRight className={cn("size-4 shrink-0", EDITOR_MUTED_TEXT_CLASS)} />
                                                    )}
                                                </span>
                                                <div
                                                    className={cn(
                                                        "flex h-8 min-w-0 flex-1 items-center rounded-lg border border-transparent px-2.5 py-1 text-sm font-medium",
                                                        rowInteractionLocked && EDITOR_MUTED_TEXT_CLASS
                                                    )}
                                                >
                                                    <span className="truncate">
                                                        {String((row[editableField] as EditableValue) ?? "")}
                                                    </span>
                                                </div>
                                            </button>
                                        ) : (
                                            <div className="flex min-w-0 flex-1 items-center gap-2">
                                                {hasRowSupplement ? (
                                                    <span
                                                        className="flex size-4 shrink-0 items-center justify-center"
                                                        aria-hidden="true"
                                                    >
                                                        <ChevronRight className={cn("invisible size-4 shrink-0", EDITOR_MUTED_TEXT_CLASS)} />
                                                    </span>
                                                ) : null}

                                                {isEditing ? (
                                                    <Input
                                                        ref={editRowInputRef}
                                                        type="text"
                                                        value={draftValue}
                                                        onChange={(event) => setDraftValue(event.target.value)}
                                                        className="w-full"
                                                    />
                                                ) : (
                                                    <div
                                                        className={cn(
                                                            "flex h-8 min-w-0 flex-1 items-center rounded-lg border border-transparent px-2.5 py-1 text-sm font-medium",
                                                            rowInteractionLocked && EDITOR_MUTED_TEXT_CLASS
                                                        )}
                                                    >
                                                        <span className="truncate">
                                                            {String((row[editableField] as EditableValue) ?? "")}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {isEditing ? (
                                        <div className="flex w-[112px] items-center justify-end gap-2">
                                            {onDelete ? (
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => void deleteRow(row)}
                                                    disabled={isSaving}
                                                    aria-label="Delete item"
                                                    className={`${EDITOR_ICON_BUTTON_CLASS} ${EDITOR_ICON_BUTTON_INTERACTIVE_CLASS} text-destructive/70 hover:bg-transparent hover:text-destructive`}
                                                >
                                                    <Trash2 />
                                                </Button>
                                            ) : null}
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => saveRow(row)}
                                                disabled={isSaving || !canSaveEditedRow}
                                                aria-label={isSaving ? "Saving" : "Save changes"}
                                                className={`${EDITOR_ICON_BUTTON_CLASS} ${EDITOR_ICON_BUTTON_INTERACTIVE_CLASS}`}
                                            >
                                                <Save />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={cancelEditing}
                                                disabled={isSaving}
                                                aria-label="Cancel editing"
                                                className={`${EDITOR_ICON_BUTTON_CLASS} ${EDITOR_ICON_BUTTON_INTERACTIVE_CLASS}`}
                                            >
                                                <X />
                                            </Button>
                                        </div>
                                    ) : canEdit ? (
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() => startEditing(row)}
                                            disabled={!canStartNewAction}
                                            aria-label={`Edit ${String((row[editableField] as EditableValue) ?? "")}`}
                                            className={`justify-self-end self-center ${EDITOR_ICON_BUTTON_CLASS} ${EDITOR_ICON_BUTTON_INTERACTIVE_CLASS}`}
                                        >
                                            <Pencil />
                                        </Button>
                                    ) : (
                                        <div className="w-[112px]" />
                                    )}
                                </div>

                                {hasRowSupplement && isSupplementExpanded && !isEditing ? (
                                    <div className="border-t pt-3">
                                        {rowSupplement}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                )
            })}

            {canAdd && isAdding && (
                <div className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3 shadow-sm">
                    <div className="min-w-0 flex-1">
                        <Input
                            ref={newRowInputRef}
                            type="text"
                            value={newDraftValue}
                            onChange={(event) => setNewDraftValue(event.target.value)}
                            className="w-full"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Button onClick={saveNewRow} disabled={isSaving || !canSaveNewRow}>
                            <Save />
                            {isSaving ? "Saving..." : "Save"}
                        </Button>
                        <Button variant="outline" onClick={cancelAdding} disabled={isSaving}>
                            <X />
                            Cancel
                        </Button>
                    </div>
                </div>
            )}

            {canAdd && !isAdding && (
                <Button
                    variant={sortedItems.length === 0 ? "default" : "outline"}
                    onClick={startAdding}
                    disabled={isSaving || !canStartNewAction}
                >
                    <Plus />
                    {addButtonLabel}
                </Button>
            )}

            {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
        </div>
    )
}
