"use client"

import { useCallback, useEffect, useState } from "react"
import { useAppShellLock } from "@/components/app-shell-lock-provider"
import { DualColumnMultiLevelListEditor } from "@/components/dualColumnMultiLevelListEditor"
import { PillList } from "@/components/pillList"
import { Popup } from "@/components/popup"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { popupDefinitions } from "@/lib/popupDefinitions"
import { fetchConfigHierarchy } from "@/services/configurableHierarchyService"
import {
    createConfig,
    createConfigOption,
    fetchConfigTypes,
    updateConfig,
    updateConfigOption
} from "@/services/configurableService"
import {
    createMapModelConfig,
    createMapModelConfigOption,
    createMapProdConfig,
    createMapProdLineConfig,
    deleteMapModelConfig,
    deleteMapModelConfigOption,
    deleteMapProdConfig,
    deleteMapProdLineConfig,
    fetchMapModelConfigs,
    fetchMapModelConfigOptions,
    fetchMapProdConfigs,
    fetchMapProdLineConfigs
} from "@/services/mapProdConfig"
import { fetchModels, fetchProductLines, fetchProducts } from "@/services/productService"
import { ConfigType, HierarchyEditorChild, HierarchyEditorParent, Model, Product, ProductLine } from "@/types"

type ConfigMgmtChild = HierarchyEditorChild & {
    configId: string
}

type ConfigMgmtParent = HierarchyEditorParent<ConfigMgmtChild> & {
    configTypeId: string
    configTypeName: string
}

const assignedProductLinesPopup = popupDefinitions.assignedProductLines
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

type AssignedProductsEditorProps = {
    configId: string
    products: Product[]
    productLinesByProductId: Record<string, ProductLine[]>
    modelsByProductLineId: Record<string, Model[]>
    loadingProductLineIds: string[]
    loadingModelProductLineIds: string[]
    loadProductLines: (productId: string) => Promise<void>
    loadModels: (productLineId: string) => Promise<void>
    selectedProductIds: string[]
    onToggleProduct: (configId: string, product: Product, isSelected: boolean) => Promise<void>
    selectedProductLineIds: string[]
    onToggleProductLine: (
        configId: string,
        productId: string,
        line: ProductLine,
        isSelected: boolean
    ) => Promise<void>
    selectedModelIds: string[]
    onToggleModel: (configId: string, model: Model, isSelected: boolean) => Promise<void>
    interactionLocked: boolean
    isPersisting: boolean
}

function AssignedProductsEditor({
    configId,
    products,
    productLinesByProductId,
    modelsByProductLineId,
    loadingProductLineIds,
    loadingModelProductLineIds,
    loadProductLines,
    loadModels,
    selectedProductIds,
    onToggleProduct,
    selectedProductLineIds,
    onToggleProductLine,
    selectedModelIds,
    onToggleModel,
    interactionLocked
    ,
    isPersisting
}: AssignedProductsEditorProps) {
    useEffect(() => {
        selectedProductIds.forEach((productId) => {
            if (productLinesByProductId[productId] || loadingProductLineIds.includes(productId)) {
                return
            }

            void loadProductLines(productId)
        })
    }, [loadProductLines, loadingProductLineIds, productLinesByProductId, selectedProductIds])

    useEffect(() => {
        selectedProductLineIds.forEach((productLineId) => {
            if (
                modelsByProductLineId[productLineId] ||
                loadingModelProductLineIds.includes(productLineId)
            ) {
                return
            }

            void loadModels(productLineId)
        })
    }, [loadModels, loadingModelProductLineIds, modelsByProductLineId, selectedProductLineIds])

    const handleProductToggle = useCallback(
        async (product: Product, isSelected: boolean) => {
            if (interactionLocked || isPersisting) {
                return
            }

            if (
                !isSelected &&
                !productLinesByProductId[product.id] &&
                !loadingProductLineIds.includes(product.id)
            ) {
                void loadProductLines(product.id)
            }

            await onToggleProduct(configId, product, isSelected)
        },
        [
            configId,
            interactionLocked,
            isPersisting,
            loadProductLines,
            loadingProductLineIds,
            onToggleProduct,
            productLinesByProductId
        ]
    )

    const handleProductLineToggle = useCallback(
        async (productId: string, line: ProductLine, isSelected: boolean) => {
            if (interactionLocked || isPersisting) {
                return
            }

            await onToggleProductLine(configId, productId, line, isSelected)
        },
        [
            configId,
            interactionLocked,
            isPersisting,
            onToggleProductLine,
        ]
    )

    const handleModelToggle = useCallback(
        async (model: Model, isSelected: boolean) => {
            if (interactionLocked || isPersisting) {
                return
            }

            await onToggleModel(configId, model, isSelected)
        },
        [configId, interactionLocked, isPersisting, onToggleModel]
    )

    const selectedProductLines = selectedProductIds
        .flatMap((productId) => productLinesByProductId[productId] ?? [])
        .filter((line) => selectedProductLineIds.includes(line.id))
        .sort((a, b) => {
            if (a.displayOrder !== b.displayOrder) {
                return a.displayOrder - b.displayOrder
            }

            return a.id.localeCompare(b.id)
        })

    const productLinesWithModels = selectedProductLines
        .map((productLine) => ({
            productLine,
            models: [...(modelsByProductLineId[productLine.id] ?? [])].sort((a, b) => {
                if (a.displayOrder !== b.displayOrder) {
                    return a.displayOrder - b.displayOrder
                }

                return a.id.localeCompare(b.id)
            })
        }))
        .filter(({ models }) => models.length > 0)

    const isLoadingAnyModels = selectedProductLineIds.some((productLineId) =>
        loadingModelProductLineIds.includes(productLineId)
    )

    return (
        <div className="space-y-4">
            <div className="px-1 py-1">
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Products
                </p>
                <PillList
                    items={products}
                    selectedIds={selectedProductIds}
                    getItemLabel={(product) => product.name}
                    onToggle={(product, isSelected) => {
                        void handleProductToggle(product, isSelected)
                    }}
                    disabled={interactionLocked}
                    emptyMessage="No products found."
                />
            </div>

            {selectedProductIds.length > 0 ? (
                <div className="px-1 py-1">
                    <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                        Product Lines
                    </p>
                    <div className="space-y-2">
                        {selectedProductIds.map((productId, index) => {
                            const product = products.find((item) => item.id === productId)
                            const productLines = productLinesByProductId[productId] ?? []
                            const isLoadingLines = loadingProductLineIds.includes(productId)

                            if (!product) {
                                return null
                            }

                            return (
                                <div
                                    key={productId}
                                    className={index === 0 ? undefined : "pt-2"}
                                >
                                    {isLoadingLines ? (
                                        <div className="flex flex-wrap gap-2">
                                            <Skeleton className="h-6 w-24 rounded-full" />
                                            <Skeleton className="h-6 w-32 rounded-full" />
                                            <Skeleton className="h-6 w-20 rounded-full" />
                                        </div>
                                    ) : (
                                        <PillList
                                            items={productLines}
                                            selectedIds={productLines
                                                .filter((line) => selectedProductLineIds.includes(line.id))
                                                .map((line) => line.id)}
                                            getItemLabel={(line) => line.name}
                                            onToggle={(line, isSelected) => {
                                                void handleProductLineToggle(productId, line, isSelected)
                                            }}
                                            disabled={interactionLocked}
                                            emptyMessage="No product lines found."
                                        />
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            ) : null}

            {selectedProductLineIds.length > 0 ? (
                <div className="px-1 py-1">
                    <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                        Models
                    </p>
                    {isLoadingAnyModels ? (
                        <div className="flex flex-wrap gap-2">
                            <Skeleton className="h-6 w-20 rounded-full" />
                            <Skeleton className="h-6 w-28 rounded-full" />
                            <Skeleton className="h-6 w-24 rounded-full" />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {productLinesWithModels.map(({ productLine, models }, index) => {
                                return (
                                    <div
                                        key={productLine.id}
                                        className={index === 0 ? undefined : "pt-2"}
                                    >
                                        <PillList
                                            items={models}
                                            selectedIds={selectedModelIds}
                                            getItemLabel={(model) => model.name}
                                            onToggle={(model, isSelected) => {
                                                void handleModelToggle(model, isSelected)
                                            }}
                                            disabled={interactionLocked}
                                        />
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            ) : null}
        </div>
    )
}

export default function ConfigurationManagementPage() {
    const CONFIG_EDITOR_KEY = "config-hierarchy"
    const [configLines, setConfigLines] = useState<ConfigMgmtParent[]>([])
    const [configTypes, setConfigTypes] = useState<ConfigType[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [assignedProductIdsByConfigId, setAssignedProductIdsByConfigId] = useState<
        Record<string, string[]>
    >({})
    const [assignedProductLineIdsByConfigId, setAssignedProductLineIdsByConfigId] = useState<
        Record<string, string[]>
    >({})
    const [assignedModelIdsByConfigId, setAssignedModelIdsByConfigId] = useState<
        Record<string, string[]>
    >({})
    const [assignedModelIdsByConfigOptionId, setAssignedModelIdsByConfigOptionId] = useState<
        Record<string, string[]>
    >({})
    const [productLinesByProductId, setProductLinesByProductId] = useState<Record<string, ProductLine[]>>({})
    const [modelsByProductLineId, setModelsByProductLineId] = useState<Record<string, Model[]>>({})
    const [loadingProductLineIds, setLoadingProductLineIds] = useState<string[]>([])
    const [loadingModelProductLineIds, setLoadingModelProductLineIds] = useState<string[]>([])
    const [persistingConfigIds, setPersistingConfigIds] = useState<string[]>([])
    const [defaultConfigTypeId, setDefaultConfigTypeId] = useState("")
    const [isLoading, setIsLoading] = useState(true)
    const [activeEditorKey, setActiveEditorKey] = useState<string | null>(null)
    const [errorMessage, setErrorMessage] = useState("")
    const [popupMessage, setPopupMessage] = useState("")
    const [isPopupOpen, setIsPopupOpen] = useState(false)
    const { setNavigationLocked } = useAppShellLock()

    const loadProductLines = useCallback(async (productId: string) => {
        setLoadingProductLineIds((current) =>
            current.includes(productId) ? current : [...current, productId]
        )

        try {
            const lines = await fetchProductLines(productId)
            setProductLinesByProductId((current) => ({
                ...current,
                [productId]: lines
            }))
        } catch (error) {
            console.error(`Failed to load product lines for product ${productId}:`, error)
            setProductLinesByProductId((current) => ({
                ...current,
                [productId]: []
            }))
        } finally {
            setLoadingProductLineIds((current) => current.filter((id) => id !== productId))
        }
    }, [])

    const loadModels = useCallback(async (productLineId: string) => {
        setLoadingModelProductLineIds((current) =>
            current.includes(productLineId) ? current : [...current, productLineId]
        )

        try {
            const models = await fetchModels(productLineId)
            setModelsByProductLineId((current) => ({
                ...current,
                [productLineId]: models
            }))
        } catch (error) {
            console.error(`Failed to load models for product line ${productLineId}:`, error)
            setModelsByProductLineId((current) => ({
                ...current,
                [productLineId]: []
            }))
        } finally {
            setLoadingModelProductLineIds((current) => current.filter((id) => id !== productLineId))
        }
    }, [])

    useEffect(() => {
        const loadData = async () => {
            setErrorMessage("")
            setIsLoading(true)

            try {
                const [
                    products,
                    configTypesResult,
                    hierarchyResult,
                    prodConfigMappings,
                    prodLineConfigMappings,
                    modelConfigMappings,
                    modelConfigOptionMappings
                ] = await Promise.all([
                    fetchProducts(),
                    fetchConfigTypes(),
                    fetchConfigHierarchy(),
                    fetchMapProdConfigs(),
                    fetchMapProdLineConfigs(),
                    fetchMapModelConfigs(),
                    fetchMapModelConfigOptions()
                ])

                const configTypeNameById = new Map(
                    configTypesResult.map((configType) => [configType.id, configType.name])
                )
                const nextAssignedProductIdsByConfigId = prodConfigMappings.reduce<Record<string, string[]>>(
                    (accumulator, mapping) => {
                        const currentProductIds = accumulator[mapping.configId] ?? []
                        accumulator[mapping.configId] = [...currentProductIds, mapping.prodId]
                        return accumulator
                    },
                    {}
                )
                const nextAssignedProductLineIdsByConfigId = prodLineConfigMappings.reduce<Record<string, string[]>>(
                    (accumulator, mapping) => {
                        const currentProductLineIds = accumulator[mapping.configId] ?? []
                        accumulator[mapping.configId] = [...currentProductLineIds, mapping.prodLineId]
                        return accumulator
                    },
                    {}
                )
                const nextAssignedModelIdsByConfigId = modelConfigMappings.reduce<Record<string, string[]>>(
                    (accumulator, mapping) => {
                        const currentModelIds = accumulator[mapping.configId] ?? []
                        accumulator[mapping.configId] = [...currentModelIds, mapping.modelId]
                        return accumulator
                    },
                    {}
                )
                const nextAssignedModelIdsByConfigOptionId = modelConfigOptionMappings.reduce<Record<string, string[]>>(
                    (accumulator, mapping) => {
                        const currentModelIds = accumulator[mapping.configOptionId] ?? []
                        accumulator[mapping.configOptionId] = [...currentModelIds, mapping.modelId]
                        return accumulator
                    },
                    {}
                )
                setProducts(products)
                setConfigLines(toEditorItems(hierarchyResult, configTypeNameById))
                setConfigTypes(configTypesResult)
                setAssignedProductIdsByConfigId(nextAssignedProductIdsByConfigId)
                setAssignedProductLineIdsByConfigId(nextAssignedProductLineIdsByConfigId)
                setAssignedModelIdsByConfigId(nextAssignedModelIdsByConfigId)
                setAssignedModelIdsByConfigOptionId(nextAssignedModelIdsByConfigOptionId)
                setDefaultConfigTypeId(configTypesResult[0]?.id ?? "")
            } catch (error) {
                console.error("Failed to load configuration hierarchy:", error)
                setErrorMessage("Could not load configurations, options, products, and mappings.")
            } finally {
                setIsLoading(false)
            }
        }

        loadData()
    }, [])

    useEffect(() => {
        const productIdsToLoad = new Set(
            Object.values(assignedProductIdsByConfigId).flat()
        )

        productIdsToLoad.forEach((productId) => {
            if (productLinesByProductId[productId] || loadingProductLineIds.includes(productId)) {
                return
            }

            void loadProductLines(productId)
        })
    }, [
        assignedProductIdsByConfigId,
        loadProductLines,
        loadingProductLineIds,
        productLinesByProductId
    ])

    useEffect(() => {
        const productLineIdsToLoad = new Set(
            Object.values(assignedProductLineIdsByConfigId).flat()
        )

        productLineIdsToLoad.forEach((productLineId) => {
            if (
                modelsByProductLineId[productLineId] ||
                loadingModelProductLineIds.includes(productLineId)
            ) {
                return
            }

            void loadModels(productLineId)
        })
    }, [
        assignedProductLineIdsByConfigId,
        loadModels,
        loadingModelProductLineIds,
        modelsByProductLineId
    ])

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

        const updated = await updateConfig(line.id, { configTypeId })
        const nextTypeName =
            configTypeOptions.find((option) => option.value === configTypeId)?.label ?? line.configTypeName

        setConfigLines((prev) =>
            prev.map((item) =>
                item.id === updated.id
                    ? {
                        ...item,
                        configTypeId: updated.configTypeId,
                        configTypeName: nextTypeName,
                        name: updated.name,
                        displayOrder: updated.displayOrder
                    }
                    : item
            )
        )
    }

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

    const handleAssignedProductToggle = useCallback(
        async (configId: string, product: Product, isSelected: boolean) => {
            setErrorMessage("")

            if (isSelected) {
                try {
                    const productLines = await fetchProductLines(product.id)
                    const productLineIdSet = new Set(productLines.map((line) => line.id))
                    const hasAssignedChildProductLines = (assignedProductLineIdsByConfigId[configId] ?? []).some(
                        (productLineId) => productLineIdSet.has(productLineId)
                    )

                    if (hasAssignedChildProductLines) {
                        setPopupMessage(
                            assignedProductLinesPopup.messageText.replace(
                                "{productName}",
                                product.name
                            )
                        )
                        setIsPopupOpen(true)
                        return
                    }
                } catch (error) {
                    console.error("Failed to validate product removal:", error)
                    setErrorMessage("Unable to validate assigned product lines.")
                    return
                }
            }

            setPersistingConfigIds((current) =>
                current.includes(configId) ? current : [...current, configId]
            )

            try {
                if (isSelected) {
                    await deleteMapProdConfig(product.id, configId)
                    setAssignedProductIdsByConfigId((current) => ({
                        ...current,
                        [configId]: (current[configId] ?? []).filter((id) => id !== product.id)
                    }))
                } else {
                    await createMapProdConfig(product.id, configId)
                    setAssignedProductIdsByConfigId((current) => ({
                        ...current,
                        [configId]: [...(current[configId] ?? []), product.id]
                    }))
                }
            } catch (error) {
                console.error("Failed to persist product-config mapping:", error)
                setErrorMessage("Unable to update assigned products.")
            } finally {
                setPersistingConfigIds((current) => current.filter((id) => id !== configId))
            }
        },
        [assignedProductLineIdsByConfigId]
    )

    const removeModelOptionAssignmentsForConfig = useCallback(
        async (configId: string, modelIds: string[]) => {
            if (modelIds.length === 0) {
                return
            }

            const configOptions = configLines.find((line) => line.id === configId)?.children ?? []
            const optionIds = configOptions.map((option) => option.id)

            if (optionIds.length === 0) {
                return
            }

            const deleteOperations: Promise<void>[] = []

            optionIds.forEach((optionId) => {
                const assignedModelIds = assignedModelIdsByConfigOptionId[optionId] ?? []

                assignedModelIds
                    .filter((modelId) => modelIds.includes(modelId))
                    .forEach((modelId) => {
                        deleteOperations.push(deleteMapModelConfigOption(modelId, optionId))
                    })
            })

            if (deleteOperations.length === 0) {
                return
            }

            await Promise.all(deleteOperations)

            setAssignedModelIdsByConfigOptionId((current) => {
                const next = { ...current }

                optionIds.forEach((optionId) => {
                    next[optionId] = (next[optionId] ?? []).filter((modelId) => !modelIds.includes(modelId))
                })

                return next
            })
        },
        [assignedModelIdsByConfigOptionId, configLines]
    )

    const addModelOptionAssignmentsForConfig = useCallback(
        async (configId: string, modelIds: string[]) => {
            if (modelIds.length === 0) {
                return
            }

            const configOptions = configLines.find((line) => line.id === configId)?.children ?? []
            const optionIds = configOptions.map((option) => option.id)

            if (optionIds.length === 0) {
                return
            }

            const createOperations: Promise<unknown>[] = []

            optionIds.forEach((optionId) => {
                const assignedModelIdSet = new Set(assignedModelIdsByConfigOptionId[optionId] ?? [])

                modelIds
                    .filter((modelId) => !assignedModelIdSet.has(modelId))
                    .forEach((modelId) => {
                        createOperations.push(createMapModelConfigOption(modelId, optionId))
                    })
            })

            if (createOperations.length === 0) {
                return
            }

            await Promise.all(createOperations)

            setAssignedModelIdsByConfigOptionId((current) => {
                const next = { ...current }

                optionIds.forEach((optionId) => {
                    const nextIds = new Set(next[optionId] ?? [])
                    modelIds.forEach((modelId) => nextIds.add(modelId))
                    next[optionId] = [...nextIds]
                })

                return next
            })
        },
        [assignedModelIdsByConfigOptionId, configLines]
    )

    const handleAssignedProductLineToggle = useCallback(
        async (configId: string, _productId: string, line: ProductLine, isSelected: boolean) => {
            setErrorMessage("")
            setPersistingConfigIds((current) =>
                current.includes(configId) ? current : [...current, configId]
            )

            try {
                const modelsForLine = await fetchModels(line.id)
                const modelIdsForLine = modelsForLine.map((model) => model.id)
                setModelsByProductLineId((current) => ({
                    ...current,
                    [line.id]: modelsForLine
                }))

                if (isSelected) {
                    await Promise.all([
                        deleteMapProdLineConfig(line.id, configId),
                        ...modelIdsForLine.map((modelId) => deleteMapModelConfig(modelId, configId))
                    ])
                    await removeModelOptionAssignmentsForConfig(configId, modelIdsForLine)

                    setAssignedProductLineIdsByConfigId((current) => ({
                        ...current,
                        [configId]: (current[configId] ?? []).filter((id) => id !== line.id)
                    }))
                    setAssignedModelIdsByConfigId((current) => ({
                        ...current,
                        [configId]: (current[configId] ?? []).filter((id) => !modelIdsForLine.includes(id))
                    }))
                } else {
                    await Promise.all([
                        createMapProdLineConfig(line.id, configId),
                        ...modelsForLine.map((model) => createMapModelConfig(model.id, configId))
                    ])
                    await addModelOptionAssignmentsForConfig(configId, modelIdsForLine)

                    setAssignedProductLineIdsByConfigId((current) => ({
                        ...current,
                        [configId]: [...(current[configId] ?? []), line.id]
                    }))
                    setAssignedModelIdsByConfigId((current) => {
                        const nextIds = new Set(current[configId] ?? [])
                        modelIdsForLine.forEach((modelId) => nextIds.add(modelId))

                        return {
                            ...current,
                            [configId]: [...nextIds]
                        }
                    })
                }
            } catch (error) {
                console.error("Failed to persist product-line-config mapping:", error)
                setErrorMessage("Unable to update assigned product lines.")
            } finally {
                setPersistingConfigIds((current) => current.filter((id) => id !== configId))
            }
        },
        [addModelOptionAssignmentsForConfig, removeModelOptionAssignmentsForConfig]
    )

    const handleAssignedModelToggle = useCallback(
        async (configId: string, model: Model, isSelected: boolean) => {
            setErrorMessage("")
            setPersistingConfigIds((current) =>
                current.includes(configId) ? current : [...current, configId]
            )

            try {
                if (isSelected) {
                    await deleteMapModelConfig(model.id, configId)
                    await removeModelOptionAssignmentsForConfig(configId, [model.id])
                    setAssignedModelIdsByConfigId((current) => ({
                        ...current,
                        [configId]: (current[configId] ?? []).filter((id) => id !== model.id)
                    }))
                } else {
                    await createMapModelConfig(model.id, configId)
                    await addModelOptionAssignmentsForConfig(configId, [model.id])
                    setAssignedModelIdsByConfigId((current) => ({
                        ...current,
                        [configId]: [...(current[configId] ?? []), model.id]
                    }))
                }
            } catch (error) {
                console.error("Failed to persist model-config mapping:", error)
                setErrorMessage("Unable to update assigned models.")
            } finally {
                setPersistingConfigIds((current) => current.filter((id) => id !== configId))
            }
        },
        [addModelOptionAssignmentsForConfig, removeModelOptionAssignmentsForConfig]
    )

    const handleAssignedModelOptionToggle = useCallback(
        async (configOptionId: string, model: Model, isSelected: boolean) => {
            setErrorMessage("")

            try {
                if (isSelected) {
                    await deleteMapModelConfigOption(model.id, configOptionId)
                    setAssignedModelIdsByConfigOptionId((current) => ({
                        ...current,
                        [configOptionId]: (current[configOptionId] ?? []).filter((id) => id !== model.id)
                    }))
                } else {
                    await createMapModelConfigOption(model.id, configOptionId)
                    setAssignedModelIdsByConfigOptionId((current) => ({
                        ...current,
                        [configOptionId]: [...(current[configOptionId] ?? []), model.id]
                    }))
                }
            } catch (error) {
                console.error("Failed to persist model-config option mapping:", error)
                setErrorMessage("Unable to update option model assignments.")
            }
        },
        []
    )

    const getAssignedModelGroupsForConfig = useCallback((configId: string) => {
        const assignedModelIdSet = new Set(assignedModelIdsByConfigId[configId] ?? [])
        const productLines = Object.values(productLinesByProductId)
            .flat()
            .sort((a, b) => {
                if (a.displayOrder !== b.displayOrder) {
                    return a.displayOrder - b.displayOrder
                }

                return a.id.localeCompare(b.id)
            })

        return productLines
            .map((productLine) => {
                const models = [...(modelsByProductLineId[productLine.id] ?? [])]
                    .filter((model) => assignedModelIdSet.has(model.id))
                    .sort((a, b) => {
                        if (a.displayOrder !== b.displayOrder) {
                            return a.displayOrder - b.displayOrder
                        }

                        return a.id.localeCompare(b.id)
                    })

                return {
                    productLine,
                    models
                }
            })
            .filter(({ models }) => models.length > 0)
    }, [assignedModelIdsByConfigId, modelsByProductLineId, productLinesByProductId])

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
                        showParentSupplement
                        parentSupplementLabel="Assigned Products"
                        childSectionLabel="Options"
                        childRowSupplementLabel="Attached Models"
                        renderChildRowSupplement={(parent, child) => {
                            const modelGroups = getAssignedModelGroupsForConfig(parent.id)

                            return (
                                modelGroups.length > 0 ? (
                                    <div className="space-y-2">
                                        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                                            Assigned Models
                                        </p>
                                        {modelGroups.map(({ productLine, models }, index) => (
                                            <div
                                                key={productLine.id}
                                                className={index === 0 ? undefined : "pt-2"}
                                            >
                                                <PillList
                                                    items={models}
                                                    selectedIds={assignedModelIdsByConfigOptionId[child.id] ?? []}
                                                    getItemLabel={(model) => model.name}
                                                    onToggle={(model, isSelected) => {
                                                        void handleAssignedModelOptionToggle(child.id, model, isSelected)
                                                    }}
                                                    disabled={activeEditorKey !== null}
                                                    emptyMessage="No models available."
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <PillList
                                        items={[]}
                                        emptyMessage="No models available."
                                    />
                                )
                            )
                        }}
                        renderParentSupplement={(parent) => (
                            <AssignedProductsEditor
                                configId={parent.id}
                                products={products}
                                productLinesByProductId={productLinesByProductId}
                                modelsByProductLineId={modelsByProductLineId}
                                loadingProductLineIds={loadingProductLineIds}
                                loadingModelProductLineIds={loadingModelProductLineIds}
                                loadProductLines={loadProductLines}
                                loadModels={loadModels}
                                selectedProductIds={assignedProductIdsByConfigId[parent.id] ?? []}
                                onToggleProduct={handleAssignedProductToggle}
                                selectedProductLineIds={assignedProductLineIdsByConfigId[parent.id] ?? []}
                                onToggleProductLine={handleAssignedProductLineToggle}
                                selectedModelIds={assignedModelIdsByConfigId[parent.id] ?? []}
                                onToggleModel={handleAssignedModelToggle}
                                interactionLocked={activeEditorKey !== null}
                                isPersisting={persistingConfigIds.includes(parent.id)}
                            />
                        )}
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

            <Popup
                open={isPopupOpen}
                title="Assigned Product Lines"
                message={popupMessage}
                okLabel={assignedProductLinesPopup.buttonLabels[0]}
                onOk={() => setIsPopupOpen(false)}
            />
        </div>
    )
}
