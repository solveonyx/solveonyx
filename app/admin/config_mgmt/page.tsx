"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useAppShellLock } from "@/components/app-shell-lock-provider"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { DualColumnMultiLevelListEditor } from "@/components/dualColumnMultiLevelListEditor"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchConfigHierarchy } from "@/services/configurableHierarchyService"
import {
    createConfig,
    createConfigOption,
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
    return line.configTypeName.trim().toLowerCase() === "single select"
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
        configName: string
        nextTypeName: string
    }>({
        open: false,
        configName: "",
        nextTypeName: ""
    })
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
                setErrorMessage("Could not load configurations and options.")
            } finally {
                setIsLoading(false)
            }
        }

        loadData()
    }, [])

    const saveConfigName = async (line: ConfigMgmtParent, newName: string) => {
        const trimmedName = newName.trim()
        if (!trimmedName) {
            throw new Error("Config name cannot be empty.")
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
            throw new Error("Config type is required.")
        }

        const nextTypeName =
            configTypeOptions.find((option) => option.value === configTypeId)?.label ?? line.configTypeName
        const requiresConfirmation =
            isSingleSelectConfig(line) && nextTypeName.trim().toLowerCase() !== "single select"

        if (requiresConfirmation) {
            const confirmed = await new Promise<boolean>((resolve) => {
                pendingTypeChangeConfirmationRef.current = resolve
                setTypeChangeDialog({
                    open: true,
                    configName: line.name,
                    nextTypeName
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
            configName: "",
            nextTypeName: ""
        })
    }, [])

    const saveConfigOptionName = async (
        line: ConfigMgmtParent,
        model: ConfigMgmtChild,
        newName: string
    ) => {
        const trimmedName = newName.trim()
        if (!trimmedName) {
            throw new Error("Option name cannot be empty.")
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
            throw new Error("Options are only available for Single Select configs.")
        }

        const trimmedName = newName.trim()
        if (!trimmedName) {
            throw new Error("Option name cannot be empty.")
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
            throw new Error("Config name cannot be empty.")
        }

        if (!defaultConfigTypeId) {
            throw new Error("No config type found. Create at least one config type first.")
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
            setErrorMessage("Unable to save config order.")
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
            setErrorMessage("Unable to save option order.")
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
        <div className="flex h-screen w-full flex-col gap-5 overflow-hidden p-6">
            <div className="shrink-0">
                <h1 className="text-2xl font-semibold tracking-tight">Configuration Management</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Edit configs and nested config options inline.
                </p>
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
                        onCreateParent={createConfigItem}
                        onCreateChild={createOptionForConfig}
                        onSaveChild={saveConfigOptionName}
                        onReorderParents={reorderConfigs}
                        onReorderChildren={reorderOptionsForConfig}
                        canExpandParent={isSingleSelectConfig}
                        childSectionLabel="Options"
                        onActiveStateChange={handleConfigEditorActiveStateChange}
                        interactionLocked={configEditorInteractionLocked}
                        addParentLabel="Add Configurable"
                        addChildLabel="Add Option"
                        pinAddParentToBottom
                        emptyMessage="No configs found."
                    />
                )}
            </div>

            {errorMessage && (
                <Alert variant="destructive" className="shrink-0">
                    <AlertTitle>Configuration issue</AlertTitle>
                    <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
            )}

            <ConfirmDialog
                open={typeChangeDialog.open}
                title="Change Config Type?"
                message={`Changing "${typeChangeDialog.configName}" to ${typeChangeDialog.nextTypeName} will remove all of its options and any model-option assignments tied to those options.`}
                confirmLabel="Change Type"
                onConfirm={() => closeTypeChangeDialog(true)}
                onCancel={() => closeTypeChangeDialog(false)}
            />
        </div>
    )
}
