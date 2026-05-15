"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Settings2 } from "lucide-react"
import { useAppShellLock } from "@/components/app-shell-lock-provider"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { DualColumnMultiLevelListEditor } from "@/components/dualColumnMultiLevelListEditor"
import { SINGLE_SELECT_CONFIG_TYPE_ID } from "@/lib/configTypeIds"
import { emptyStateDefinitions } from "@/lib/emptyStateDefinitions"
import { popupDefinitions } from "@/lib/popupDefinitions"
import { uiTextDefinitions } from "@/lib/uiTextDefinitions"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchConfigHierarchy } from "@/services/configurableHierarchyService"
import {
    createConfig,
    createConfigOption,
    deleteConfig,
    deleteConfigOption,
    fetchConfigTypes,
    updateConfig,
    updateConfigTypeWithCleanup,
    updateConfigOption
} from "@/services/configurableService"
import { ConfigType, HierarchyEditorChild, HierarchyEditorParent } from "@/types"

type ConfigMgmtChild = HierarchyEditorChild & {
    configId: string
}

type ConfigMgmtParent = HierarchyEditorParent<ConfigMgmtChild> & {
    configTypeId: string
    configTypeName: string
}

function isSingleSelectConfig(line: ConfigMgmtParent): boolean {
    return line.configTypeId === SINGLE_SELECT_CONFIG_TYPE_ID
}

function toEditorItems(
    configHierarchy: Awaited<ReturnType<typeof fetchConfigHierarchy>>,
    configTypeNameById: Map<string, string>
): ConfigMgmtParent[] {
    return configHierarchy.map((config) => ({
        id: config.id,
        configTypeId: config.configTypeId,
        configTypeName: config.configTypeName ?? configTypeNameById.get(config.configTypeId) ?? "",
        name: config.name,
        displayOrder: config.displayOrder,
        children: config.options.map((option) => ({
            id: option.id,
            configId: option.configId,
            name: option.name,
            displayOrder: option.displayOrder
        }))
    }))
}

export default function ConfigurationManagementPage() {
    const CONFIG_EDITOR_KEY = "config-hierarchy"
    const [configLines, setConfigLines] = useState<ConfigMgmtParent[]>([])
    const [configTypes, setConfigTypes] = useState<ConfigType[]>([])
    const [defaultConfigTypeId, setDefaultConfigTypeId] = useState("")
    const [isLoading, setIsLoading] = useState(true)
    const [activeEditorKey, setActiveEditorKey] = useState<string | null>(null)
    const [errorMessage, setErrorMessage] = useState("")
    const [typeChangeDialog, setTypeChangeDialog] = useState<{
        open: boolean
        title: string
        message: string
        cancelLabel: string
    }>({
        open: false,
        title: "",
        message: "",
        cancelLabel: "Cancel"
    })
    const [pendingRemovalDialog, setPendingRemovalDialog] = useState<{
        open: boolean
        title: string
        message: string
        confirmLabel: string
        cancelLabel: string
        onConfirm: (() => Promise<void>) | null
    }>({
        open: false,
        title: "",
        message: "",
        confirmLabel: "Delete",
        cancelLabel: "Cancel",
        onConfirm: null
    })
    const [isConfirmingRemoval, setIsConfirmingRemoval] = useState(false)
    const pendingTypeChangeConfirmationRef = useRef<((confirmed: boolean) => void) | null>(null)
    const { setNavigationLocked } = useAppShellLock()

    useEffect(() => {
        const loadData = async () => {
            setErrorMessage("")
            setIsLoading(true)

            try {
                const [configTypesResult, hierarchyResult] = await Promise.all([
                    fetchConfigTypes(),
                    fetchConfigHierarchy()
                ])

                const configTypeNameById = new Map(
                    configTypesResult.map((configType) => [configType.id, configType.name])
                )
                setConfigLines(toEditorItems(hierarchyResult, configTypeNameById))
                setConfigTypes(configTypesResult)
                setDefaultConfigTypeId(configTypesResult[0]?.id ?? "")
            } catch (error) {
                console.error("Failed to load configuration hierarchy:", error)
                setErrorMessage(uiTextDefinitions.configurationManagement.errors.loadFailed)
            } finally {
                setIsLoading(false)
            }
        }

        loadData()
    }, [])

    const saveConfigName = async (line: ConfigMgmtParent, newName: string) => {
        const trimmedName = newName.trim()
        if (!trimmedName) {
            throw new Error(uiTextDefinitions.configurationManagement.validation.configNameRequired)
        }

        const updated = await updateConfig(line.id, { name: trimmedName })
        setConfigLines((prev) =>
            prev.map((item) =>
                item.id === updated.id
                    ? {
                        ...item,
                        name: updated.name,
                        configTypeId: updated.configTypeId,
                        configTypeName: item.configTypeName,
                        displayOrder: updated.displayOrder
                    }
                    : item
            )
        )
    }

    const saveConfigType = async (line: ConfigMgmtParent, configTypeId: string) => {
        if (!configTypeId) {
            throw new Error(uiTextDefinitions.configurationManagement.validation.configTypeRequired)
        }

        const nextTypeName =
            configTypeOptions.find((option) => option.value === configTypeId)?.label ?? line.configTypeName
        const requiresConfirmation = isSingleSelectConfig(line) && configTypeId !== SINGLE_SELECT_CONFIG_TYPE_ID

        if (requiresConfirmation) {
            const dialogDefinition = popupDefinitions.configuration.changeConfigType(line.name, nextTypeName)
            const confirmed = await new Promise<boolean>((resolve) => {
                pendingTypeChangeConfirmationRef.current = resolve
                setTypeChangeDialog({
                    open: true,
                    title: dialogDefinition.title,
                    message: dialogDefinition.message,
                    cancelLabel: dialogDefinition.cancelLabel ?? "Cancel"
                })
            })

            if (!confirmed) {
                return
            }
        }

        const result = await updateConfigTypeWithCleanup(line.id, configTypeId)
        const updated = result.config

        setConfigLines((prev) =>
            prev.map((item) =>
                item.id === updated.id
                    ? {
                        ...item,
                        configTypeId: updated.configTypeId,
                        configTypeName: nextTypeName,
                        name: updated.name,
                        displayOrder: updated.displayOrder,
                        children: result.clearedSingleSelectOptions ? [] : item.children
                    }
                    : item
            )
        )
    }

    const closeTypeChangeDialog = useCallback((confirmed: boolean) => {
        pendingTypeChangeConfirmationRef.current?.(confirmed)
        pendingTypeChangeConfirmationRef.current = null
        setTypeChangeDialog({
            open: false,
            title: "",
            message: "",
            cancelLabel: "Cancel"
        })
    }, [])

    const closePendingRemovalDialog = useCallback(() => {
        if (isConfirmingRemoval) {
            return
        }

        setPendingRemovalDialog({
            open: false,
            title: "",
            message: "",
            confirmLabel: "Delete",
            cancelLabel: "Cancel",
            onConfirm: null
        })
    }, [isConfirmingRemoval])

    const confirmPendingRemoval = useCallback(async () => {
        if (!pendingRemovalDialog.onConfirm) {
            return
        }

        setIsConfirmingRemoval(true)

        try {
            await pendingRemovalDialog.onConfirm()
            setPendingRemovalDialog({
                open: false,
                title: "",
                message: "",
                confirmLabel: "Delete",
                cancelLabel: "Cancel",
                onConfirm: null
            })
        } catch (error) {
            console.error("Failed to remove configurable item:", error)
            setErrorMessage(uiTextDefinitions.configurationManagement.errors.deleteFailed)
        } finally {
            setIsConfirmingRemoval(false)
        }
    }, [pendingRemovalDialog])

    const saveConfigOptionName = async (
        line: ConfigMgmtParent,
        model: ConfigMgmtChild,
        newName: string
    ) => {
        const trimmedName = newName.trim()
        if (!trimmedName) {
            throw new Error(uiTextDefinitions.configurationManagement.validation.optionNameRequired)
        }

        const updated = await updateConfigOption(model.id, { name: trimmedName })
        setConfigLines((prev) =>
            prev.map((item) => {
                if (item.id !== line.id) {
                    return item
                }

                return {
                    ...item,
                    children: item.children.map((m) =>
                        m.id === updated.id
                            ? {
                                ...m,
                                name: updated.name,
                                configId: updated.configId,
                                displayOrder: updated.displayOrder
                            }
                            : m
                    )
                }
            })
        )
    }

    const createOptionForConfig = async (line: ConfigMgmtParent, newName: string) => {
        if (!isSingleSelectConfig(line)) {
            throw new Error(uiTextDefinitions.configurationManagement.validation.optionsRequireSingleSelect)
        }

        const trimmedName = newName.trim()
        if (!trimmedName) {
            throw new Error(uiTextDefinitions.configurationManagement.validation.optionNameRequired)
        }

        const created = await createConfigOption(line.id, trimmedName)
        setConfigLines((prev) =>
            prev.map((item) =>
                item.id === line.id
                    ? {
                        ...item,
                        children: [
                            ...item.children,
                            {
                                id: created.id,
                                configId: created.configId,
                                name: created.name,
                                displayOrder: created.displayOrder
                            }
                        ]
                    }
                    : item
            )
        )
    }

    const createConfigItem = async (newName: string) => {
        const trimmedName = newName.trim()
        if (!trimmedName) {
            throw new Error(uiTextDefinitions.configurationManagement.validation.configNameRequired)
        }

        if (!defaultConfigTypeId) {
            throw new Error(uiTextDefinitions.configurationManagement.validation.noConfigTypeFound)
        }

        const created = await createConfig(defaultConfigTypeId, trimmedName)
        setConfigLines((prev) => [
            ...prev,
            {
                id: created.id,
                configTypeId: created.configTypeId,
                configTypeName:
                    configTypeOptions.find((option) => option.value === created.configTypeId)?.label ?? "",
                name: created.name,
                displayOrder: created.displayOrder,
                children: []
            }
        ])
    }

    const requestDeleteConfig = async (line: ConfigMgmtParent) => {
        const dialogDefinition = popupDefinitions.configuration.deleteConfig(line.name)
        setPendingRemovalDialog({
            open: true,
            title: dialogDefinition.title,
            message: dialogDefinition.message,
            confirmLabel: dialogDefinition.confirmLabel ?? "Delete",
            cancelLabel: dialogDefinition.cancelLabel ?? "Cancel",
            onConfirm: async () => {
                setErrorMessage("")
                await deleteConfig(line.id)
                setConfigLines((prev) => prev.filter((item) => item.id !== line.id))
            }
        })
    }

    const requestDeleteConfigOption = async (
        line: ConfigMgmtParent,
        option: ConfigMgmtChild
    ) => {
        const dialogDefinition = popupDefinitions.configuration.deleteConfigOption(option.name)
        setPendingRemovalDialog({
            open: true,
            title: dialogDefinition.title,
            message: dialogDefinition.message,
            confirmLabel: dialogDefinition.confirmLabel ?? "Delete",
            cancelLabel: dialogDefinition.cancelLabel ?? "Cancel",
            onConfirm: async () => {
                setErrorMessage("")
                await deleteConfigOption(option.id)
                setConfigLines((prev) =>
                    prev.map((item) =>
                        item.id === line.id
                            ? {
                                ...item,
                                children: item.children.filter((child) => child.id !== option.id)
                            }
                            : item
                    )
                )
            }
        })
    }

    const configTypeOptions = configTypes.map((configType) => ({
        value: configType.id,
        label: configType.name
    }))

    const reorderConfigs = async (reorderedItems: ConfigMgmtParent[]) => {
        const previous = configLines
        setConfigLines(reorderedItems)

        try {
            await Promise.all(
                reorderedItems.map((line) =>
                    updateConfig(line.id, { displayOrder: line.displayOrder })
                )
            )
        } catch (error) {
            console.error("Failed to reorder configs:", error)
            setErrorMessage(uiTextDefinitions.configurationManagement.errors.saveConfigOrderFailed)
            setConfigLines(previous)
        }
    }

    const reorderOptionsForConfig = async (
        line: ConfigMgmtParent,
        reorderedModels: ConfigMgmtChild[]
    ) => {
        const previous = configLines
        setConfigLines((prev) =>
            prev.map((item) =>
                item.id === line.id
                    ? {
                        ...item,
                        children: reorderedModels
                    }
                    : item
            )
        )

        try {
            await Promise.all(
                reorderedModels.map((model) =>
                    updateConfigOption(model.id, { displayOrder: model.displayOrder })
                )
            )
        } catch (error) {
            console.error("Failed to reorder config options:", error)
            setErrorMessage(uiTextDefinitions.configurationManagement.errors.saveOptionOrderFailed)
            setConfigLines(previous)
        }
    }

    const handleConfigEditorActiveStateChange = useCallback((isActive: boolean) => {
        setActiveEditorKey((current) => {
            if (isActive) {
                return current ?? CONFIG_EDITOR_KEY
            }

            return current === CONFIG_EDITOR_KEY ? null : current
        })
    }, [])

    const configEditorInteractionLocked =
        activeEditorKey !== null && activeEditorKey !== CONFIG_EDITOR_KEY

    useEffect(() => {
        setNavigationLocked(activeEditorKey !== null)

        return () => {
            setNavigationLocked(false)
        }
    }, [activeEditorKey, setNavigationLocked])

    return (
        <div className="admin-page-shell flex h-screen w-full flex-col gap-5 overflow-hidden p-6">
            <div className="admin-page-hero shrink-0">
                <div className="flex items-center gap-4">
                    <Settings2 className="size-8 shrink-0 text-white" aria-hidden="true" />
                    <div>
                        <h1 className="admin-page-hero-title text-2xl font-semibold tracking-tight">Configuration Management</h1>
                        <p className="admin-page-hero-subtitle text-sm">
                            {uiTextDefinitions.configurationManagement.helperText.pageSubtitle}
                        </p>
                    </div>
                </div>
            </div>

            <div className="min-h-0 flex-1">
                {isLoading ? (
                    <div className="space-y-3">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-8 w-32" />
                    </div>
                ) : (
                    <DualColumnMultiLevelListEditor
                        items={configLines}
                        secondaryColumn={{
                            label: "Config Type",
                            inputType: "select",
                            getValue: (parent) => parent.configTypeId,
                            getDisplayValue: (parent) => parent.configTypeName,
                            options: configTypeOptions,
                            onSave: saveConfigType
                        }}
                        onSaveParent={saveConfigName}
                        onDeleteParent={requestDeleteConfig}
                        onCreateParent={createConfigItem}
                        onCreateChild={createOptionForConfig}
                        onSaveChild={saveConfigOptionName}
                        onDeleteChild={requestDeleteConfigOption}
                        onReorderParents={reorderConfigs}
                        onReorderChildren={reorderOptionsForConfig}
                        canExpandParent={isSingleSelectConfig}
                        childSectionLabel="Options"
                        onActiveStateChange={handleConfigEditorActiveStateChange}
                        interactionLocked={configEditorInteractionLocked}
                        addParentLabel="Add Configurable"
                        addChildLabel="Add Option"
                        pinAddParentToBottom
                        emptyMessage={emptyStateDefinitions.configurationManagement.noConfigsFound}
                    />
                )}
            </div>

            {errorMessage && (
                <Alert variant="destructive" className="shrink-0">
                    <AlertTitle>{uiTextDefinitions.configurationManagement.alerts.pageIssueTitle}</AlertTitle>
                    <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
            )}

            <ConfirmDialog
                open={typeChangeDialog.open}
                title={typeChangeDialog.title}
                message={typeChangeDialog.message}
                confirmLabel="Change Type"
                cancelLabel={typeChangeDialog.cancelLabel}
                onConfirm={() => closeTypeChangeDialog(true)}
                onCancel={() => closeTypeChangeDialog(false)}
            />
            <ConfirmDialog
                open={pendingRemovalDialog.open}
                title={pendingRemovalDialog.title}
                message={pendingRemovalDialog.message}
                confirmLabel={pendingRemovalDialog.confirmLabel}
                cancelLabel={pendingRemovalDialog.cancelLabel}
                isConfirming={isConfirmingRemoval}
                onConfirm={() => {
                    void confirmPendingRemoval()
                }}
                onCancel={closePendingRemovalDialog}
            />
        </div>
    )
}
