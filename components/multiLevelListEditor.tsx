"use client"

import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, ChevronRight, GripVertical, Pencil, Plus, Save, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ListEditor } from "@/components/listEditor"
import { useSortableList } from "@/hooks/useSortableList"
import {
    EDITOR_ICON_BUTTON_CLASS,
    EDITOR_ICON_BUTTON_INTERACTIVE_CLASS,
    EDITOR_LOCKED_DIMMED_CLASS,
    EDITOR_MUTED_TEXT_CLASS,
    hasActiveEditor,
    isExpansionLocked,
    isLockedByOtherEditor
} from "@/lib/editorInteractions"
import { emptyStateDefinitions } from "@/lib/emptyStateDefinitions"
import { uiTextDefinitions } from "@/lib/uiTextDefinitions"
import { cn } from "@/lib/utils"
import { HierarchyEditorChild, HierarchyEditorParent } from "@/types"

type MultiLevelListEditorProps<
    TChild extends HierarchyEditorChild,
    TParent extends HierarchyEditorParent<TChild>
> = {
    items: TParent[]
    onSaveParent?: (parent: TParent, newName: string) => Promise<void>
    onDeleteParent?: (parent: TParent) => Promise<void>
    onCreateParent?: (newName: string) => Promise<void>
    onSaveChild?: (parent: TParent, child: TChild, newName: string) => Promise<void>
    onDeleteChild?: (parent: TParent, child: TChild) => Promise<void>
    onCreateChild?: (parent: TParent, newName: string) => Promise<void>
    addParentLabel?: string
    addChildLabel?: string
    visibleChildParentId?: string | null
    onActiveStateChange?: (isActive: boolean) => void
    interactionLocked?: boolean
    emptyMessage?: string
    onReorderParents?: (items: TParent[]) => void
    onReorderChildren?: (parent: TParent, items: TChild[]) => void
    canExpandParent?: (parent: TParent) => boolean
    showParentSupplement?: boolean
    parentSupplementLabel?: string
    renderParentSupplement?: (parent: TParent) => ReactNode
    childSectionLabel?: string
    childRowSupplementLabel?: string
    renderChildRowSupplement?: (parent: TParent, child: TChild) => ReactNode
    pinAddParentToBottom?: boolean
}

function sortableDisplayOrder(value: number | null | undefined): number {
    return typeof value === "number" ? value : Number.POSITIVE_INFINITY
}

function getFadeMaskStyle(showTopFade: boolean, showBottomFade: boolean) {
    let maskImage = "none"

    if (showTopFade && showBottomFade) {
        maskImage = "linear-gradient(to bottom, transparent 0, black 75px, black calc(100% - 75px), transparent 100%)"
    } else if (showTopFade) {
        maskImage = "linear-gradient(to bottom, transparent 0, black 75px, black 100%)"
    } else if (showBottomFade) {
        maskImage = "linear-gradient(to bottom, black 0, black calc(100% - 75px), transparent 100%)"
    }

    return {
        WebkitMaskImage: maskImage,
        maskImage
    }
}

export function MultiLevelListEditor<
    TChild extends HierarchyEditorChild,
    TParent extends HierarchyEditorParent<TChild>
>({
    items,
    onSaveParent,
    onDeleteParent,
    onCreateParent,
    onCreateChild,
    onSaveChild,
    onDeleteChild,
    addParentLabel = "Add Parent",
    addChildLabel = "Add Child",
    visibleChildParentId,
    onActiveStateChange,
    interactionLocked = false,
    emptyMessage = emptyStateDefinitions.generic.multiLevelEditorNoParents,
    onReorderParents,
    onReorderChildren,
    canExpandParent,
    showParentSupplement = false,
    parentSupplementLabel = "Details",
    renderParentSupplement,
    childSectionLabel = "Items",
    childRowSupplementLabel = "Details",
    renderChildRowSupplement,
    pinAddParentToBottom = false
}: MultiLevelListEditorProps<TChild, TParent>) {
    const PARENT_LOCK_KEY = "parent"
    const [expandedSection, setExpandedSection] = useState<{
        parentId: string
        type: "child" | "supplement"
    } | null>(null)
    const [editingParentId, setEditingParentId] = useState<string | null>(null)
    const [parentDraftName, setParentDraftName] = useState("")
    const [isSavingParent, setIsSavingParent] = useState(false)
    const [isAddingParent, setIsAddingParent] = useState(false)
    const [newParentName, setNewParentName] = useState("")
    const [isCreatingParent, setIsCreatingParent] = useState(false)
    const [errorMessage, setErrorMessage] = useState("")
    const [activeEditorKey, setActiveEditorKey] = useState<string | null>(null)
    const newParentInputRef = useRef<HTMLInputElement | null>(null)
    const editParentInputRef = useRef<HTMLInputElement | null>(null)
    const scrollContainerRef = useRef<HTMLDivElement | null>(null)
    const [showTopFade, setShowTopFade] = useState(false)
    const [showBottomFade, setShowBottomFade] = useState(false)

    const sortedParents = useMemo(() => {
        const clone = [...items]
        clone.sort((a, b) => {
            const orderA = sortableDisplayOrder(a.displayOrder)
            const orderB = sortableDisplayOrder(b.displayOrder)

            if (orderA !== orderB) {
                return orderA - orderB
            }

            return a.id.localeCompare(b.id)
        })

        return clone.map((parent) => ({
            ...parent,
            children: [...parent.children].sort((a, b) => {
                const orderA = sortableDisplayOrder(a.displayOrder)
                const orderB = sortableDisplayOrder(b.displayOrder)

                if (orderA !== orderB) {
                    return orderA - orderB
                }

                return a.id.localeCompare(b.id)
            })
        })) as TParent[]
    }, [items])

    const isParentExpandable = useCallback((parent: TParent) => {
        return canExpandParent?.(parent) ?? true
    }, [canExpandParent])

    useEffect(() => {
        if (!visibleChildParentId) {
            return
        }

        const visibleParent = sortedParents.find((parent) => parent.id === visibleChildParentId)
        if (!visibleParent || !isParentExpandable(visibleParent)) {
            return
        }

        setExpandedSection({
            parentId: visibleChildParentId,
            type: "child"
        })
    }, [isParentExpandable, sortedParents, visibleChildParentId])

    useEffect(() => {
        setExpandedSection((current) => {
            if (!current) {
                return current
            }

            if (current.type !== "child") {
                return sortedParents.some((parent) => parent.id === current.parentId) ? current : null
            }

            const expandedParent = sortedParents.find((parent) => parent.id === current.parentId)
            if (!expandedParent || !isParentExpandable(expandedParent)) {
                return null
            }

            return current
        })
    }, [isParentExpandable, sortedParents])

    const toggleChildExpanded = (parent: TParent) => {
        if (isExpansionLocked(interactionLocked, activeEditorKey)) {
            return
        }

        if (!isParentExpandable(parent)) {
            return
        }

        setExpandedSection((current) => {
            if (current?.parentId === parent.id && current.type === "child") {
                return null
            }

            return {
                parentId: parent.id,
                type: "child"
            }
        })
    }

    const toggleSupplementExpanded = (parentId: string) => {
        if (isExpansionLocked(interactionLocked, activeEditorKey)) {
            return
        }

        setExpandedSection((current) => {
            if (current?.parentId === parentId && current.type === "supplement") {
                return null
            }

            return {
                parentId,
                type: "supplement"
            }
        })
    }

    const startEditingParent = (parent: TParent) => {
        if (!onSaveParent) {
            return
        }
        if (activeEditorKey && activeEditorKey !== PARENT_LOCK_KEY) {
            return
        }
        if (editingParentId !== null || isAddingParent) {
            return
        }

        setActiveEditorKey(PARENT_LOCK_KEY)
        setEditingParentId(parent.id)
        setParentDraftName(parent.name)
        setIsAddingParent(false)
        setNewParentName("")
        setErrorMessage("")
    }

    const saveParent = async (parent: TParent) => {
        if (!onSaveParent) {
            return
        }

        setErrorMessage("")
        setIsSavingParent(true)

        try {
            await onSaveParent(parent, parentDraftName)
            setEditingParentId(null)
            setParentDraftName("")
            setActiveEditorKey(null)
        } catch (error) {
            console.error("MultiLevelListEditor parent save error:", error)
            setErrorMessage(uiTextDefinitions.generic.componentFeedback.hierarchySaveFailed)
        } finally {
            setIsSavingParent(false)
        }
    }

    const cancelEditingParent = () => {
        setEditingParentId(null)
        setParentDraftName("")
        setActiveEditorKey(null)
        setErrorMessage("")
    }

    const deleteParent = async (parent: TParent) => {
        if (!onDeleteParent) {
            return
        }

        setErrorMessage("")
        setIsSavingParent(true)

        try {
            await onDeleteParent(parent)
            setEditingParentId(null)
            setParentDraftName("")
            setExpandedSection((current) => (current?.parentId === parent.id ? null : current))
            setActiveEditorKey(null)
        } catch (error) {
            console.error("MultiLevelListEditor parent delete error:", error)
            setErrorMessage(uiTextDefinitions.generic.componentFeedback.hierarchyDeleteFailed)
        } finally {
            setIsSavingParent(false)
        }
    }

    const startAddingParent = () => {
        if (!onCreateParent) {
            return
        }
        if (activeEditorKey && activeEditorKey !== PARENT_LOCK_KEY) {
            return
        }
        if (editingParentId !== null || isAddingParent) {
            return
        }

        setActiveEditorKey(PARENT_LOCK_KEY)
        setEditingParentId(null)
        setParentDraftName("")
        setIsAddingParent(true)
        setNewParentName("")
        setErrorMessage("")
    }

    const saveNewParent = async () => {
        if (!onCreateParent) {
            return
        }

        setErrorMessage("")
        setIsCreatingParent(true)

        try {
            await onCreateParent(newParentName)
            setIsAddingParent(false)
            setNewParentName("")
            setActiveEditorKey(null)
        } catch (error) {
            console.error("MultiLevelListEditor parent create error:", error)
            setErrorMessage(uiTextDefinitions.generic.componentFeedback.hierarchyCreateFailed)
        } finally {
            setIsCreatingParent(false)
        }
    }

    const cancelAddingParent = () => {
        setIsAddingParent(false)
        setNewParentName("")
        setActiveEditorKey(null)
        setErrorMessage("")
    }

    const canEditParent = Boolean(onSaveParent || onDeleteParent)
    const canAddParent = Boolean(onCreateParent)
    const hasLocalParentActiveEditor = editingParentId !== null || isAddingParent
    const expansionIsLocked = isExpansionLocked(interactionLocked, activeEditorKey)
    const parentIsLocked = isLockedByOtherEditor(interactionLocked, activeEditorKey, PARENT_LOCK_KEY)
    const canStartParentAction = !parentIsLocked && !hasLocalParentActiveEditor
    const canSaveNewParent = newParentName.trim().length > 0
    const canSaveEditedParent = parentDraftName.trim().length > 0
    const allParentsCollapsed = expandedSection === null
    const canReorderParents =
        Boolean(onReorderParents) &&
        sortedParents.length > 1 &&
        allParentsCollapsed &&
        !interactionLocked &&
        !hasActiveEditor(activeEditorKey) &&
        !isSavingParent &&
        !isCreatingParent
    const showParentReorderHandle =
        Boolean(onReorderParents) && sortedParents.length > 1 && allParentsCollapsed

    const parentSortable = useSortableList(
        sortedParents,
        canReorderParents ? onReorderParents : undefined,
        canReorderParents
    )

    useEffect(() => {
        onActiveStateChange?.(hasActiveEditor(activeEditorKey))
    }, [activeEditorKey, onActiveStateChange])

    const handleChildActiveStateChange = (childKey: string, isActive: boolean) => {
        setActiveEditorKey((current) => {
            if (isActive) {
                if (current && current !== childKey) {
                    return current
                }
                return childKey
            }

            return current === childKey ? null : current
        })
    }

    useEffect(() => {
        if (!isAddingParent) {
            return
        }

        newParentInputRef.current?.focus()
    }, [isAddingParent])

    useEffect(() => {
        if (editingParentId === null) {
            return
        }

        editParentInputRef.current?.focus()
    }, [editingParentId])

    useEffect(() => {
        if (!pinAddParentToBottom) {
            return
        }

        const node = scrollContainerRef.current
        if (!node) {
            return
        }

        const updateFadeState = () => {
            const { scrollTop, clientHeight, scrollHeight } = node
            const maxScrollTop = Math.max(0, scrollHeight - clientHeight)
            setShowTopFade(scrollTop > 1)
            setShowBottomFade(scrollTop < maxScrollTop - 1)
        }

        updateFadeState()
        node.addEventListener("scroll", updateFadeState, { passive: true })
        window.addEventListener("resize", updateFadeState)
        const resizeObserver = new ResizeObserver(() => {
            updateFadeState()
        })
        resizeObserver.observe(node)

        return () => {
            node.removeEventListener("scroll", updateFadeState)
            window.removeEventListener("resize", updateFadeState)
            resizeObserver.disconnect()
        }
    }, [items, pinAddParentToBottom])

    if (sortedParents.length === 0 && !canAddParent) {
        return (
            <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
                {emptyMessage}
            </div>
        )
    }

    return (
        <div className={cn("w-full max-w-[800px] space-y-3", pinAddParentToBottom && "flex h-full min-h-0 flex-col")}>
            <div
                className={cn(
                    "space-y-3",
                    pinAddParentToBottom && "min-h-0 flex-1 overflow-y-auto pr-1"
                )}
                style={pinAddParentToBottom ? getFadeMaskStyle(showTopFade, showBottomFade) : undefined}
                ref={(node) => {
                    if (pinAddParentToBottom) {
                        scrollContainerRef.current = node
                    }
                    if (canReorderParents) {
                        parentSortable.setContainerElement(node)
                    }
                }}
            >
                {sortedParents.map((parent) => {
                    const canExpand = isParentExpandable(parent)
                    const isChildExpanded =
                        canExpand &&
                        expandedSection?.parentId === parent.id &&
                        expandedSection.type === "child"
                    const isEditing = editingParentId === parent.id
                    const showChildren = canExpand && (!visibleChildParentId || visibleChildParentId === parent.id)
                    const parentReorderIsAvailable = canReorderParents
                    const isDraggingRow = parentReorderIsAvailable && parentSortable.draggingId === parent.id
                    const parentSupplement = showParentSupplement
                        ? renderParentSupplement?.(parent)
                        : null
                    const hasSupplementSection = Boolean(showParentSupplement && parentSupplement)
                    const isSupplementExpanded =
                        hasSupplementSection &&
                        expandedSection?.parentId === parent.id &&
                        expandedSection.type === "supplement"
                    const toggleButtonClass =
                        "flex w-full items-center gap-1.5 rounded-sm py-1 text-left text-muted-foreground transition-colors"

                    return (
                        <div key={parent.id} className="space-y-2">
                            <div
                                ref={
                                    parentReorderIsAvailable
                                        ? (node) => parentSortable.setItemElement(parent.id, node)
                                        : undefined
                                }
                            className={cn(
                                "rounded-lg border bg-card p-3 shadow-sm transition-[transform,box-shadow,background-color,opacity]",
                                isDraggingRow && "pointer-events-none relative z-20 bg-accent opacity-80 shadow-lg will-change-transform !transition-none"
                            )}
                        >
                                <div className="flex items-start gap-3">
                                    {Boolean(onReorderParents) && sortedParents.length > 1 ? (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-sm"
                                            disabled={!parentReorderIsAvailable}
                                            onMouseDown={
                                                parentReorderIsAvailable
                                                    ? (event) =>
                                                        parentSortable.handleMouseDown(parent.id, event.nativeEvent)
                                                    : undefined
                                            }
                                            aria-label={showParentReorderHandle ? "Reorder row" : undefined}
                                            aria-hidden={!showParentReorderHandle}
                                            tabIndex={showParentReorderHandle ? 0 : -1}
                                            className={cn(
                                                `self-center ${EDITOR_ICON_BUTTON_CLASS}`,
                                                parentReorderIsAvailable
                                                    ? `cursor-grab ${EDITOR_ICON_BUTTON_INTERACTIVE_CLASS} active:cursor-grabbing`
                                                    : "cursor-not-allowed opacity-30",
                                                !showParentReorderHandle && "pointer-events-none invisible"
                                            )}
                                        >
                                            <GripVertical className="size-[1.3em]" />
                                        </Button>
                                    ) : (
                                        <span className="self-center w-7 shrink-0" aria-hidden="true" />
                                    )}

                                    <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_112px] gap-x-2 gap-y-3">
                                        <div className="min-w-0 min-h-[44px]">
                                            <div className="flex min-h-[44px] min-w-0 items-center gap-2">
                                                <div className="min-w-0 flex-1">
                                                    {isEditing ? (
                                                        <Input
                                                            ref={editParentInputRef}
                                                            type="text"
                                                            value={parentDraftName}
                                                            onChange={(event) => setParentDraftName(event.target.value)}
                                                            className="w-full"
                                                        />
                                                    ) : (
                                                        <div
                                                            className={cn(
                                                                "flex h-8 items-center rounded-lg border border-transparent px-2.5 py-1 text-sm",
                                                                expansionIsLocked && EDITOR_MUTED_TEXT_CLASS
                                                            )}
                                                        >
                                                            <span className="truncate font-medium">{parent.name}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {isEditing ? (
                                            <div className="flex items-center gap-2 self-center justify-self-end">
                                                {onDeleteParent ? (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        onClick={() => void deleteParent(parent)}
                                                        disabled={isSavingParent}
                                                        aria-label="Delete item"
                                                        className={`${EDITOR_ICON_BUTTON_CLASS} ${EDITOR_ICON_BUTTON_INTERACTIVE_CLASS} text-destructive/70 hover:bg-transparent hover:text-destructive`}
                                                    >
                                                        <Trash2 />
                                                    </Button>
                                                ) : null}
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => saveParent(parent)}
                                                    disabled={isSavingParent || !canSaveEditedParent}
                                                    aria-label={isSavingParent ? "Saving" : "Save changes"}
                                                    className={`${EDITOR_ICON_BUTTON_CLASS} ${EDITOR_ICON_BUTTON_INTERACTIVE_CLASS}`}
                                                >
                                                    <Save />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={cancelEditingParent}
                                                    disabled={isSavingParent}
                                                    aria-label="Cancel editing"
                                                    className={`${EDITOR_ICON_BUTTON_CLASS} ${EDITOR_ICON_BUTTON_INTERACTIVE_CLASS}`}
                                                >
                                                    <X />
                                                </Button>
                                            </div>
                                        ) : canEditParent ? (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => startEditingParent(parent)}
                                                disabled={!canStartParentAction || isCreatingParent}
                                                aria-label={`Edit ${parent.name}`}
                                                className={`self-center justify-self-end ${EDITOR_ICON_BUTTON_CLASS} ${EDITOR_ICON_BUTTON_INTERACTIVE_CLASS}`}
                                            >
                                                <Pencil />
                                            </Button>
                                        ) : (
                                            <div className="w-[112px]" />
                                        )}

                                        <div className="col-span-2 flex min-w-0 flex-col gap-1">
                                            <div
                                                className={cn(
                                                    "space-y-2 rounded-md border border-border/60 px-2 py-1",
                                                    isChildExpanded && "bg-muted/10"
                                                )}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => toggleChildExpanded(parent)}
                                                    disabled={expansionIsLocked || !canExpand}
                                                    className={cn(
                                                        toggleButtonClass,
                                                        canExpand && !expansionIsLocked
                                                            ? EDITOR_ICON_BUTTON_INTERACTIVE_CLASS
                                                            : EDITOR_LOCKED_DIMMED_CLASS
                                                    )}
                                                    aria-label={
                                                        isChildExpanded
                                                            ? `Collapse ${childSectionLabel}`
                                                            : `Expand ${childSectionLabel}`
                                                    }
                                                >
                                                    {isChildExpanded ? <ChevronDown /> : <ChevronRight />}
                                                    <span className="text-xs font-medium uppercase tracking-[0.14em]">
                                                        {childSectionLabel}
                                                    </span>
                                                </button>

                                                {isChildExpanded && showChildren && !isDraggingRow ? (
                                                    <div className="pl-4">
                                                        <ListEditor<TChild>
                                                            items={parent.children}
                                                            sortField="displayOrder"
                                                            editableField="name"
                                                            rowSupplementLabel={childRowSupplementLabel}
                                                            renderRowSupplement={
                                                                renderChildRowSupplement
                                                                    ? (child) => renderChildRowSupplement(parent, child)
                                                                    : undefined
                                                            }
                                                            interactionLocked={
                                                                isLockedByOtherEditor(
                                                                    interactionLocked,
                                                                    activeEditorKey,
                                                                    `child:${parent.id}`
                                                                )
                                                            }
                                                            onActiveStateChange={(isActive) =>
                                                                handleChildActiveStateChange(`child:${parent.id}`, isActive)
                                                            }
                                                            onSave={
                                                                onSaveChild
                                                                    ? (child, newValue) => onSaveChild(parent, child, newValue)
                                                                    : undefined
                                                            }
                                                            onDelete={
                                                                onDeleteChild
                                                                    ? (child) => onDeleteChild(parent, child)
                                                                    : undefined
                                                            }
                                                            onCreate={
                                                                onCreateChild
                                                                    ? (newValue) => onCreateChild(parent, newValue)
                                                                    : undefined
                                                            }
                                                            reorder={
                                                                onReorderChildren
                                                                    ? {
                                                                        onReorder: (children) =>
                                                                            onReorderChildren(parent, children)
                                                                    }
                                                                    : undefined
                                                            }
                                                            addButtonLabel={addChildLabel}
                                                            emptyMessage={emptyStateDefinitions.generic.nestedEditorNoChildren}
                                                        />
                                                    </div>
                                                ) : null}
                                            </div>

                                            {hasSupplementSection ? (
                                                <div
                                                    className={cn(
                                                        "space-y-2 rounded-md border border-border/60 px-2 py-1",
                                                        isSupplementExpanded && "bg-muted/10"
                                                    )}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleSupplementExpanded(parent.id)}
                                                        disabled={expansionIsLocked}
                                                        className={cn(
                                                            toggleButtonClass,
                                                            expansionIsLocked
                                                                ? EDITOR_LOCKED_DIMMED_CLASS
                                                                : EDITOR_ICON_BUTTON_INTERACTIVE_CLASS
                                                        )}
                                                        aria-label={
                                                            isSupplementExpanded
                                                                ? `Collapse ${parentSupplementLabel}`
                                                                : `Expand ${parentSupplementLabel}`
                                                        }
                                                    >
                                                        {isSupplementExpanded ? <ChevronDown /> : <ChevronRight />}
                                                        <span className="text-xs font-medium uppercase tracking-[0.14em]">
                                                            {parentSupplementLabel}
                                                        </span>
                                                    </button>

                                                    {isSupplementExpanded ? (
                                                        <div className="border-t pt-3">
                                                            {parentSupplement}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {canAddParent && isAddingParent && (
                <div className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3 shadow-sm">
                    <div className="min-w-0 flex-1">
                        <Input
                            ref={newParentInputRef}
                            type="text"
                            value={newParentName}
                            onChange={(event) => setNewParentName(event.target.value)}
                            className="w-full"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Button onClick={saveNewParent} disabled={isCreatingParent || !canSaveNewParent}>
                            <Save />
                            {isCreatingParent ? "Saving..." : "Save"}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={cancelAddingParent}
                            disabled={isCreatingParent}
                        >
                            <X />
                            Cancel
                        </Button>
                    </div>
                </div>
            )}

            {canAddParent && !isAddingParent && (
                <div className={cn(pinAddParentToBottom && "shrink-0")}>
                    <Button
                        variant={sortedParents.length === 0 ? "default" : "outline"}
                        onClick={startAddingParent}
                        disabled={isCreatingParent || !canStartParentAction}
                    >
                        <Plus />
                        {addParentLabel}
                    </Button>
                </div>
            )}

            {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
        </div>
    )
}
