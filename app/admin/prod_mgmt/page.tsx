"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { PackageSearch } from "lucide-react"
import { useAppShellLock } from "@/components/app-shell-lock-provider"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { MultiLevelListEditor } from "@/components/multiLevelListEditor"
import { PillList } from "@/components/pillList"
import { SelectionGallery } from "@/components/selectionGallery"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { SINGLE_SELECT_CONFIG_TYPE_ID, YES_NO_CONFIG_TYPE_ID } from "@/lib/configTypeIds"
import { emptyStateDefinitions } from "@/lib/emptyStateDefinitions"
import { popupDefinitions } from "@/lib/popupDefinitions"
import { uiTextDefinitions } from "@/lib/uiTextDefinitions"
import { fetchConfigHierarchy } from "@/services/configurableHierarchyService"
import {
    assignProductConfigAssignment,
    assignProductLineConfigAssignment,
    createMapModelConfig,
    createMapModelConfigOption,
    createMapProdLineConfig,
    deleteMapModelConfig,
    deleteMapModelConfigOption,
    fetchMapModelConfigOptions,
    fetchMapModelConfigs,
    fetchMapProdConfigs,
    fetchMapProdLineConfigs,
    removeProductConfigAssignment,
    removeProductLineConfigAssignment
} from "@/services/mapProdConfig"
import { fetchProductHierarchy } from "@/services/productHierarchyService"
import {
    createProduct,
    createModel,
    createProductLine,
    deleteProduct,
    deleteModel,
    deleteProductLine,
    fetchProducts,
    updateProduct,
    updateModel,
    updateProductLine
} from "@/services/productService"
import { ConfigWithOptions, HierarchyEditorChild, HierarchyEditorParent, Product } from "@/types"
import { ProductLineWithModels } from "@/types/productHierarchy"

type ProductMgmtChild = HierarchyEditorChild & {
    productLineId: string
}

type ProductMgmtParent = HierarchyEditorParent<ProductMgmtChild> & {
    productId: string
}

function isSingleSelectConfig(config: ConfigWithOptions) {
    return config.configTypeId === SINGLE_SELECT_CONFIG_TYPE_ID
}

function isYesNoConfig(config: ConfigWithOptions) {
    return config.configTypeId === YES_NO_CONFIG_TYPE_ID
}

function toEditorItems(items: ProductLineWithModels[]): ProductMgmtParent[] {
    return items.map((line) => ({
        id: line.id,
        productId: line.productId,
        name: line.name,
        displayOrder: line.displayOrder,
        children: line.models.map((model) => ({
            id: model.id,
            productLineId: model.productLineId,
            name: model.name,
            displayOrder: model.displayOrder
        }))
    }))
}

export default function ProductManagementPage() {
    const GALLERY_EDITOR_KEY = "products-gallery"
    const HIERARCHY_EDITOR_KEY = "product-hierarchy"
    const [products, setProducts] = useState<Product[]>([])
    const [selectedProductId, setSelectedProductId] = useState("")
    const [productLines, setProductLines] = useState<ProductMgmtParent[]>([])
    const [configs, setConfigs] = useState<ConfigWithOptions[]>([])
    const [assignedConfigIdsByProductId, setAssignedConfigIdsByProductId] = useState<
        Record<string, string[]>
    >({})
    const [assignedConfigIdsByProductLineId, setAssignedConfigIdsByProductLineId] = useState<
        Record<string, string[]>
    >({})
    const [assignedConfigIdsByModelId, setAssignedConfigIdsByModelId] = useState<
        Record<string, string[]>
    >({})
    const [assignedConfigOptionIdsByModelId, setAssignedConfigOptionIdsByModelId] = useState<
        Record<string, string[]>
    >({})
    const [isPersistingSelectedProduct, setIsPersistingSelectedProduct] = useState(false)
    const [persistingProductLineIds, setPersistingProductLineIds] = useState<string[]>([])
    const [isLoadingProducts, setIsLoadingProducts] = useState(true)
    const [isLoadingHierarchy, setIsLoadingHierarchy] = useState(false)
    const [activeEditorKey, setActiveEditorKey] = useState<string | null>(null)
    const [errorMessage, setErrorMessage] = useState("")
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
        confirmLabel: "Remove",
        cancelLabel: "Cancel",
        onConfirm: null
    })
    const [isConfirmingRemoval, setIsConfirmingRemoval] = useState(false)
    const { setNavigationLocked } = useAppShellLock()

    useEffect(() => {
        const loadProducts = async () => {
            try {
                const data = await fetchProducts()
                setProducts(data)
                if (data.length > 0) {
                    setSelectedProductId(data[0].id)
                }
            } catch (error) {
                console.error("Failed to load products:", error)
                setErrorMessage(uiTextDefinitions.productManagement.errors.loadProductsFailed)
            } finally {
                setIsLoadingProducts(false)
            }
        }

        loadProducts()
    }, [])

    useEffect(() => {
        const loadConfigs = async () => {
            try {
                const [
                    configHierarchy,
                    prodConfigMappings,
                    prodLineConfigMappings,
                    modelConfigMappings,
                    modelConfigOptionMappings
                ] = await Promise.all([
                    fetchConfigHierarchy(),
                    fetchMapProdConfigs(),
                    fetchMapProdLineConfigs(),
                    fetchMapModelConfigs(),
                    fetchMapModelConfigOptions()
                ])

                const nextAssignedConfigIdsByProductId = prodConfigMappings.reduce<Record<string, string[]>>(
                    (accumulator, mapping) => {
                        const currentConfigIds = accumulator[mapping.prodId] ?? []
                        accumulator[mapping.prodId] = [...currentConfigIds, mapping.configId]
                        return accumulator
                    },
                    {}
                )
                const nextAssignedConfigIdsByProductLineId = prodLineConfigMappings.reduce<Record<string, string[]>>(
                    (accumulator, mapping) => {
                        const currentConfigIds = accumulator[mapping.prodLineId] ?? []
                        accumulator[mapping.prodLineId] = [...currentConfigIds, mapping.configId]
                        return accumulator
                    },
                    {}
                )
                const nextAssignedConfigIdsByModelId = modelConfigMappings.reduce<Record<string, string[]>>(
                    (accumulator, mapping) => {
                        const currentConfigIds = accumulator[mapping.modelId] ?? []
                        accumulator[mapping.modelId] = [...currentConfigIds, mapping.configId]
                        return accumulator
                    },
                    {}
                )
                const nextAssignedConfigOptionIdsByModelId =
                    modelConfigOptionMappings.reduce<Record<string, string[]>>((accumulator, mapping) => {
                        const currentOptionIds = accumulator[mapping.modelId] ?? []
                        accumulator[mapping.modelId] = [...currentOptionIds, mapping.configOptionId]
                        return accumulator
                    }, {})

                setConfigs(configHierarchy)
                setAssignedConfigIdsByProductId(nextAssignedConfigIdsByProductId)
                setAssignedConfigIdsByProductLineId(nextAssignedConfigIdsByProductLineId)
                setAssignedConfigIdsByModelId(nextAssignedConfigIdsByModelId)
                setAssignedConfigOptionIdsByModelId(nextAssignedConfigOptionIdsByModelId)
            } catch (error) {
                console.error("Failed to load configurables:", error)
                setErrorMessage(uiTextDefinitions.productManagement.errors.loadConfigurablesFailed)
            }
        }

        void loadConfigs()
    }, [])

    useEffect(() => {
        const loadHierarchy = async () => {
            if (!selectedProductId) {
                setProductLines([])
                return
            }

            setErrorMessage("")
            setIsLoadingHierarchy(true)

            try {
                const lines = await fetchProductHierarchy(selectedProductId)
                setProductLines(toEditorItems(lines))
            } catch (error) {
                console.error("Failed to load hierarchy:", error)
                setErrorMessage(uiTextDefinitions.productManagement.errors.loadHierarchyFailed)
            } finally {
                setIsLoadingHierarchy(false)
            }
        }

        loadHierarchy()
    }, [selectedProductId])

    const sortedConfigs = useMemo(
        () =>
            [...configs].sort((a, b) => {
                if (a.displayOrder !== b.displayOrder) {
                    return a.displayOrder - b.displayOrder
                }

                return a.id.localeCompare(b.id)
            }),
        [configs]
    )

    const productAssignedConfigs = useMemo(
        () => {
            const assignedConfigIdSet = new Set(assignedConfigIdsByProductId[selectedProductId] ?? [])
            return sortedConfigs.filter((config) => assignedConfigIdSet.has(config.id))
        },
        [assignedConfigIdsByProductId, selectedProductId, sortedConfigs]
    )

    const getConfigOptionIds = useCallback(
        (configId: string) => configs.find((config) => config.id === configId)?.options.map((option) => option.id) ?? [],
        [configs]
    )

    const removeConfigFromModelAssignmentState = useCallback((configId: string, modelIds: string[]) => {
        setAssignedConfigIdsByModelId((current) => {
            const next = { ...current }

            modelIds.forEach((modelId) => {
                next[modelId] = (next[modelId] ?? []).filter((id) => id !== configId)
            })

            return next
        })
    }, [])

    const removeConfigOptionsFromModelAssignmentState = useCallback(
        (configId: string, modelIds: string[]) => {
            const optionIds = new Set(getConfigOptionIds(configId))

            if (optionIds.size === 0) {
                return
            }

            setAssignedConfigOptionIdsByModelId((current) => {
                const next = { ...current }

                modelIds.forEach((modelId) => {
                    next[modelId] = (next[modelId] ?? []).filter((id) => !optionIds.has(id))
                })

                return next
            })
        },
        [getConfigOptionIds]
    )

    const removeModelsFromAssignmentState = useCallback((modelIds: string[]) => {
        if (modelIds.length === 0) {
            return
        }

        const modelIdSet = new Set(modelIds)

        setAssignedConfigIdsByModelId((current) => {
            const next = { ...current }
            modelIdSet.forEach((modelId) => {
                delete next[modelId]
            })
            return next
        })

        setAssignedConfigOptionIdsByModelId((current) => {
            const next = { ...current }
            modelIdSet.forEach((modelId) => {
                delete next[modelId]
            })
            return next
        })
    }, [])

    const removeProductLineFromAssignmentState = useCallback((productLineId: string, modelIds: string[]) => {
        setAssignedConfigIdsByProductLineId((current) => {
            const next = { ...current }
            delete next[productLineId]
            return next
        })

        removeModelsFromAssignmentState(modelIds)
    }, [removeModelsFromAssignmentState])

    const addModelAssignmentsForConfig = useCallback(
        async (configId: string, modelIds: string[]) => {
            if (modelIds.length === 0) {
                return
            }

            const optionIds = getConfigOptionIds(configId)
            const uniqueModelIds = Array.from(new Set(modelIds))
            const configCreateOperations = uniqueModelIds.map((modelId) =>
                createMapModelConfig(modelId, configId)
            )
            const optionCreateOperations = uniqueModelIds.flatMap((modelId) =>
                optionIds.map((optionId) => createMapModelConfigOption(modelId, optionId))
            )

            if (configCreateOperations.length === 0 && optionCreateOperations.length === 0) {
                return
            }

            if (configCreateOperations.length > 0) {
                await Promise.all(configCreateOperations)
            }

            if (optionCreateOperations.length > 0) {
                await Promise.all(optionCreateOperations)
            }

            setAssignedConfigIdsByModelId((current) => {
                const next = { ...current }
                uniqueModelIds.forEach((modelId) => {
                    const nextConfigIds = new Set(next[modelId] ?? [])
                    nextConfigIds.add(configId)
                    next[modelId] = [...nextConfigIds]
                })
                return next
            })

            setAssignedConfigOptionIdsByModelId((current) => {
                const next = { ...current }
                uniqueModelIds.forEach((modelId) => {
                    const nextOptionIds = new Set(next[modelId] ?? [])
                    optionIds.forEach((optionId) => nextOptionIds.add(optionId))
                    next[modelId] = [...nextOptionIds]
                })
                return next
            })
        },
        [getConfigOptionIds]
    )

    const handleGalleryActiveStateChange = useCallback((isActive: boolean) => {
        setActiveEditorKey((current) => {
            if (isActive) {
                return current ?? GALLERY_EDITOR_KEY
            }

            return current === GALLERY_EDITOR_KEY ? null : current
        })
    }, [])

    const handleHierarchyActiveStateChange = useCallback((isActive: boolean) => {
        setActiveEditorKey((current) => {
            if (isActive) {
                return current ?? HIERARCHY_EDITOR_KEY
            }

            return current === HIERARCHY_EDITOR_KEY ? null : current
        })
    }, [])

    const galleryInteractionLocked = activeEditorKey !== null && activeEditorKey !== GALLERY_EDITOR_KEY
    const hierarchyInteractionLocked =
        activeEditorKey !== null && activeEditorKey !== HIERARCHY_EDITOR_KEY

    useEffect(() => {
        setNavigationLocked(activeEditorKey !== null)

        return () => {
            setNavigationLocked(false)
        }
    }, [activeEditorKey, setNavigationLocked])

    const saveProductName = async (product: Product, newName: string) => {
        const trimmedName = newName.trim()
        if (!trimmedName) {
            throw new Error(uiTextDefinitions.productManagement.validation.productNameRequired)
        }

        const updated = await updateProduct(product.id, { name: trimmedName })
        setProducts((prev) =>
            prev.map((item) =>
                item.id === updated.id
                    ? {
                        ...item,
                        name: updated.name,
                        displayOrder: updated.displayOrder
                    }
                    : item
            )
        )
    }

    const createNewProduct = async (newName: string) => {
        const trimmedName = newName.trim()
        if (!trimmedName) {
            throw new Error(uiTextDefinitions.productManagement.validation.productNameRequired)
        }

        const created = await createProduct(trimmedName)
        setProducts((prev) => [...prev, created])
        setSelectedProductId(created.id)
    }

    const requestDeleteProduct = async (product: Product) => {
        const productLineIds = productLines.map((line) => line.id)
        const modelIds = productLines.flatMap((line) => line.children.map((model) => model.id))
        const dialogDefinition = popupDefinitions.productManagement.deleteProduct(product.name)

        setPendingRemovalDialog({
            open: true,
            title: dialogDefinition.title,
            message: dialogDefinition.message,
            confirmLabel: dialogDefinition.confirmLabel ?? "Delete",
            cancelLabel: dialogDefinition.cancelLabel ?? "Cancel",
            onConfirm: async () => {
                setErrorMessage("")
                setIsPersistingSelectedProduct(true)

                try {
                    await deleteProduct(product.id)

                    setAssignedConfigIdsByProductId((current) => {
                        const next = { ...current }
                        delete next[product.id]
                        return next
                    })
                    setAssignedConfigIdsByProductLineId((current) => {
                        const next = { ...current }
                        productLineIds.forEach((productLineId) => {
                            delete next[productLineId]
                        })
                        return next
                    })
                    removeModelsFromAssignmentState(modelIds)

                    let nextSelectedProductId = selectedProductId
                    setProducts((prev) => {
                        const remainingProducts = prev.filter((item) => item.id !== product.id)
                        if (selectedProductId === product.id) {
                            nextSelectedProductId = remainingProducts[0]?.id ?? ""
                        }
                        return remainingProducts
                    })
                    if (selectedProductId === product.id) {
                        setSelectedProductId(nextSelectedProductId)
                        setProductLines([])
                    }
                } finally {
                    setIsPersistingSelectedProduct(false)
                }
            }
        })
    }

    const saveProductLineName = async (line: ProductMgmtParent, newName: string) => {
        const trimmedName = newName.trim()
        if (!trimmedName) {
            throw new Error(uiTextDefinitions.productManagement.validation.productLineNameRequired)
        }

        const updated = await updateProductLine(line.id, { name: trimmedName })
        setProductLines((prev) =>
            prev.map((item) =>
                item.id === updated.id
                    ? {
                        ...item,
                        name: updated.name,
                        productId: updated.productId,
                        displayOrder: updated.displayOrder
                    }
                    : item
            )
        )
    }

    const saveModelName = async (
        line: ProductMgmtParent,
        model: ProductMgmtChild,
        newName: string
    ) => {
        const trimmedName = newName.trim()
        if (!trimmedName) {
            throw new Error(uiTextDefinitions.productManagement.validation.modelNameRequired)
        }

        const updated = await updateModel(model.id, { name: trimmedName })
        setProductLines((prev) =>
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
                                productLineId: updated.productLineId,
                                displayOrder: updated.displayOrder
                            }
                            : m
                    )
                }
            })
        )
    }

    const createModelForLine = async (line: ProductMgmtParent, newName: string) => {
        const trimmedName = newName.trim()
        if (!trimmedName) {
            throw new Error(uiTextDefinitions.productManagement.validation.modelNameRequired)
        }

        const created = await createModel(line.id, trimmedName)
        const assignedConfigIds = assignedConfigIdsByProductLineId[line.id] ?? []

        if (assignedConfigIds.length > 0) {
            await Promise.all(
                assignedConfigIds.map((configId) => addModelAssignmentsForConfig(configId, [created.id]))
            )
        }

        setProductLines((prev) =>
            prev.map((item) =>
                item.id === line.id
                    ? {
                        ...item,
                        children: [
                            ...item.children,
                            {
                                id: created.id,
                                productLineId: created.productLineId,
                                name: created.name,
                                displayOrder: created.displayOrder
                            }
                        ]
                    }
                    : item
            )
        )
    }

    const createProductLineForProduct = async (newName: string) => {
        const trimmedName = newName.trim()
        if (!trimmedName) {
            throw new Error(uiTextDefinitions.productManagement.validation.productLineNameRequired)
        }

        if (!selectedProductId) {
            throw new Error(uiTextDefinitions.productManagement.validation.productSelectionRequired)
        }

        const created = await createProductLine(selectedProductId, trimmedName)
        const assignedConfigIds = assignedConfigIdsByProductId[selectedProductId] ?? []

        if (assignedConfigIds.length > 0) {
            await Promise.all(
                assignedConfigIds.map((configId) => createMapProdLineConfig(created.id, configId))
            )

            setAssignedConfigIdsByProductLineId((current) => ({
                ...current,
                [created.id]: assignedConfigIds
            }))
        }

        setProductLines((prev) => [
            ...prev,
            {
                id: created.id,
                productId: created.productId,
                name: created.name,
                displayOrder: created.displayOrder,
                children: []
            }
        ])
    }

    const requestDeleteModel = async (line: ProductMgmtParent, model: ProductMgmtChild) => {
        const dialogDefinition = popupDefinitions.productManagement.deleteModel(model.name)
        setPendingRemovalDialog({
            open: true,
            title: dialogDefinition.title,
            message: dialogDefinition.message,
            confirmLabel: dialogDefinition.confirmLabel ?? "Delete",
            cancelLabel: dialogDefinition.cancelLabel ?? "Cancel",
            onConfirm: async () => {
                setErrorMessage("")
                setPersistingProductLineIds((current) =>
                    current.includes(line.id) ? current : [...current, line.id]
                )

                try {
                    await deleteModel(model.id)
                    removeModelsFromAssignmentState([model.id])
                    setProductLines((prev) =>
                        prev.map((item) =>
                            item.id === line.id
                                ? {
                                    ...item,
                                    children: item.children.filter((child) => child.id !== model.id)
                                }
                                : item
                        )
                    )
                } finally {
                    setPersistingProductLineIds((current) => current.filter((id) => id !== line.id))
                }
            }
        })
    }

    const requestDeleteProductLine = async (line: ProductMgmtParent) => {
        const modelIds = line.children.map((model) => model.id)
        const dialogDefinition = popupDefinitions.productManagement.deleteProductLine(line.name)

        setPendingRemovalDialog({
            open: true,
            title: dialogDefinition.title,
            message: dialogDefinition.message,
            confirmLabel: dialogDefinition.confirmLabel ?? "Delete",
            cancelLabel: dialogDefinition.cancelLabel ?? "Cancel",
            onConfirm: async () => {
                setErrorMessage("")
                setPersistingProductLineIds((current) =>
                    current.includes(line.id) ? current : [...current, line.id]
                )

                try {
                    await deleteProductLine(line.id)
                    removeProductLineFromAssignmentState(line.id, modelIds)
                    setProductLines((prev) => prev.filter((item) => item.id !== line.id))
                } finally {
                    setPersistingProductLineIds((current) => current.filter((id) => id !== line.id))
                }
            }
        })
    }

    const reorderProducts = async (reorderedItems: Product[]) => {
        const previous = products
        setProducts(reorderedItems)

        try {
            await Promise.all(
                reorderedItems.map((product) =>
                    updateProduct(product.id, { displayOrder: product.displayOrder })
                )
            )
        } catch (error) {
            console.error("Failed to reorder products:", error)
            setErrorMessage(uiTextDefinitions.productManagement.errors.saveProductOrderFailed)
            setProducts(previous)
        }
    }

    const reorderProductLines = async (reorderedItems: ProductMgmtParent[]) => {
        const previous = productLines
        setProductLines(reorderedItems)

        try {
            await Promise.all(
                reorderedItems.map((line) =>
                    updateProductLine(line.id, { displayOrder: line.displayOrder })
                )
            )
        } catch (error) {
            console.error("Failed to reorder product lines:", error)
            setErrorMessage(uiTextDefinitions.productManagement.errors.saveProductLineOrderFailed)
            setProductLines(previous)
        }
    }

    const reorderModelsForLine = async (
        line: ProductMgmtParent,
        reorderedModels: ProductMgmtChild[]
    ) => {
        const previous = productLines
        setProductLines((prev) =>
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
                    updateModel(model.id, { displayOrder: model.displayOrder })
                )
            )
        } catch (error) {
            console.error("Failed to reorder models:", error)
            setErrorMessage(uiTextDefinitions.productManagement.errors.saveModelOrderFailed)
            setProductLines(previous)
        }
    }

    const handleAssignedProductConfigToggle = useCallback(
        async (config: ConfigWithOptions, isSelected: boolean) => {
            if (!selectedProductId) {
                return
            }

            if (isSelected) {
                const childProductLineIds = productLines.map((line) => line.id)
                const modelIds = productLines.flatMap((line) => line.children.map((model) => model.id))
                const dialogDefinition = popupDefinitions.productManagement.removeProductConfigurable(config.name)

                setPendingRemovalDialog({
                    open: true,
                    title: dialogDefinition.title,
                    message: dialogDefinition.message,
                    confirmLabel: dialogDefinition.confirmLabel ?? "Remove",
                    cancelLabel: dialogDefinition.cancelLabel ?? "Cancel",
                    onConfirm: async () => {
                        setErrorMessage("")
                        setIsPersistingSelectedProduct(true)

                        try {
                            await removeProductConfigAssignment(selectedProductId, config.id)

                            setAssignedConfigIdsByProductId((current) => ({
                                ...current,
                                [selectedProductId]: (current[selectedProductId] ?? []).filter((id) => id !== config.id)
                            }))
                            setAssignedConfigIdsByProductLineId((current) => {
                                const next = { ...current }

                                childProductLineIds.forEach((productLineId) => {
                                    next[productLineId] = (next[productLineId] ?? []).filter((id) => id !== config.id)
                                })

                                return next
                            })
                            removeConfigFromModelAssignmentState(config.id, modelIds)
                            removeConfigOptionsFromModelAssignmentState(config.id, modelIds)
                        } catch (error) {
                            console.error("Failed to remove product-config mapping:", error)
                            setErrorMessage(uiTextDefinitions.productManagement.errors.updateSelectedProductConfigurablesFailed)
                            throw error
                        } finally {
                            setIsPersistingSelectedProduct(false)
                        }
                    }
                })

                return
            }

            setErrorMessage("")
            setIsPersistingSelectedProduct(true)

            try {
                const childProductLineIds = productLines.map((line) => line.id)
                const modelIds = productLines.flatMap((line) => line.children.map((model) => model.id))
                const optionIds = getConfigOptionIds(config.id)

                if (!isSelected) {
                    await assignProductConfigAssignment(selectedProductId, config.id)

                    setAssignedConfigIdsByProductId((current) => ({
                        ...current,
                        [selectedProductId]: Array.from(new Set([...(current[selectedProductId] ?? []), config.id]))
                    }))
                    setAssignedConfigIdsByProductLineId((current) => {
                        const next = { ...current }

                        childProductLineIds.forEach((productLineId) => {
                            next[productLineId] = Array.from(new Set([...(next[productLineId] ?? []), config.id]))
                        })

                        return next
                    })
                    setAssignedConfigIdsByModelId((current) => {
                        const next = { ...current }

                        modelIds.forEach((modelId) => {
                            next[modelId] = Array.from(new Set([...(next[modelId] ?? []), config.id]))
                        })

                        return next
                    })
                    if (optionIds.length > 0) {
                        setAssignedConfigOptionIdsByModelId((current) => {
                            const next = { ...current }

                            modelIds.forEach((modelId) => {
                                next[modelId] = Array.from(new Set([...(next[modelId] ?? []), ...optionIds]))
                            })

                            return next
                        })
                    }
                }
            } catch (error) {
                console.error("Failed to persist product-config mapping:", error)
                setErrorMessage(uiTextDefinitions.productManagement.errors.updateSelectedProductConfigurablesFailed)
            } finally {
                setIsPersistingSelectedProduct(false)
            }
        },
        [
            getConfigOptionIds,
            productLines,
            removeConfigFromModelAssignmentState,
            removeConfigOptionsFromModelAssignmentState,
            selectedProductId
        ]
    )

    const handleAssignedConfigToggle = useCallback(
        async (line: ProductMgmtParent, config: ConfigWithOptions, isSelected: boolean) => {
            const modelIds = line.children.map((model) => model.id)

            if (isSelected) {
                const dialogDefinition = popupDefinitions.productManagement.removeProductLineConfigurable(
                    config.name,
                    line.name
                )
                setPendingRemovalDialog({
                    open: true,
                    title: dialogDefinition.title,
                    message: dialogDefinition.message,
                    confirmLabel: dialogDefinition.confirmLabel ?? "Remove",
                    cancelLabel: dialogDefinition.cancelLabel ?? "Cancel",
                    onConfirm: async () => {
                        setErrorMessage("")
                        setPersistingProductLineIds((current) =>
                            current.includes(line.id) ? current : [...current, line.id]
                        )

                        try {
                            await removeProductLineConfigAssignment(line.id, config.id)
                            setAssignedConfigIdsByProductLineId((current) => ({
                                ...current,
                                [line.id]: (current[line.id] ?? []).filter((id) => id !== config.id)
                            }))
                            removeConfigFromModelAssignmentState(config.id, modelIds)
                            removeConfigOptionsFromModelAssignmentState(config.id, modelIds)
                        } catch (error) {
                            console.error("Failed to remove product-line-config mapping:", error)
                            setErrorMessage(uiTextDefinitions.productManagement.errors.updateAssignedConfigurablesFailed)
                            throw error
                        } finally {
                            setPersistingProductLineIds((current) => current.filter((id) => id !== line.id))
                        }
                    }
                })

                return
            }

            setErrorMessage("")
            setPersistingProductLineIds((current) =>
                current.includes(line.id) ? current : [...current, line.id]
            )

            try {
                const optionIds = getConfigOptionIds(config.id)

                if (!isSelected) {
                    await assignProductLineConfigAssignment(line.id, config.id)
                    setAssignedConfigIdsByProductLineId((current) => ({
                        ...current,
                        [line.id]: Array.from(new Set([...(current[line.id] ?? []), config.id]))
                    }))
                    setAssignedConfigIdsByModelId((current) => {
                        const next = { ...current }

                        modelIds.forEach((modelId) => {
                            next[modelId] = Array.from(new Set([...(next[modelId] ?? []), config.id]))
                        })

                        return next
                    })
                    if (optionIds.length > 0) {
                        setAssignedConfigOptionIdsByModelId((current) => {
                            const next = { ...current }

                            modelIds.forEach((modelId) => {
                                next[modelId] = Array.from(new Set([...(next[modelId] ?? []), ...optionIds]))
                            })

                            return next
                        })
                    }
                }
            } catch (error) {
                console.error("Failed to persist product-line-config mapping:", error)
                setErrorMessage(uiTextDefinitions.productManagement.errors.updateAssignedConfigurablesFailed)
            } finally {
                setPersistingProductLineIds((current) => current.filter((id) => id !== line.id))
            }
        },
        [getConfigOptionIds, removeConfigFromModelAssignmentState, removeConfigOptionsFromModelAssignmentState]
    )

    const closePendingRemovalDialog = useCallback(() => {
        if (isConfirmingRemoval) {
            return
        }

        setPendingRemovalDialog({
            open: false,
            title: "",
            message: "",
            confirmLabel: "Remove",
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
                confirmLabel: "Remove",
                cancelLabel: "Cancel",
                onConfirm: null
            })
        } catch (error) {
            console.error("Failed to remove product management item:", error)
            setErrorMessage(uiTextDefinitions.productManagement.errors.deleteFailed)
            return
        } finally {
            setIsConfirmingRemoval(false)
        }
    }, [pendingRemovalDialog])

    const handleAssignedModelOptionToggle = useCallback(
        async (
            line: ProductMgmtParent,
            model: ProductMgmtChild,
            config: ConfigWithOptions,
            optionId: string,
            isSelected: boolean
        ) => {
            setErrorMessage("")
            setPersistingProductLineIds((current) =>
                current.includes(line.id) ? current : [...current, line.id]
            )

            try {
                if (isSelected) {
                    const configOptionIds = getConfigOptionIds(config.id)
                    const remainingAssignedOptionIds = (assignedConfigOptionIdsByModelId[model.id] ?? [])
                        .filter((id) => id !== optionId && configOptionIds.includes(id))
                    const operations: Promise<unknown>[] = [
                        deleteMapModelConfigOption(model.id, optionId)
                    ]

                    if (remainingAssignedOptionIds.length === 0) {
                        operations.push(deleteMapModelConfig(model.id, config.id))
                    }

                    await Promise.all(operations)

                    setAssignedConfigOptionIdsByModelId((current) => ({
                        ...current,
                        [model.id]: (current[model.id] ?? []).filter((id) => id !== optionId)
                    }))

                    if (remainingAssignedOptionIds.length === 0) {
                        setAssignedConfigIdsByModelId((current) => ({
                            ...current,
                            [model.id]: (current[model.id] ?? []).filter((id) => id !== config.id)
                        }))
                    }
                } else {
                    const assignedConfigIdSet = new Set(assignedConfigIdsByModelId[model.id] ?? [])
                    const operations: Promise<unknown>[] = []

                    if (!assignedConfigIdSet.has(config.id)) {
                        operations.push(createMapModelConfig(model.id, config.id))
                    }

                    operations.push(createMapModelConfigOption(model.id, optionId))
                    await Promise.all(operations)

                    setAssignedConfigIdsByModelId((current) => {
                        const nextConfigIds = new Set(current[model.id] ?? [])
                        nextConfigIds.add(config.id)

                        return {
                            ...current,
                            [model.id]: [...nextConfigIds]
                        }
                    })
                    setAssignedConfigOptionIdsByModelId((current) => {
                        const nextOptionIds = new Set(current[model.id] ?? [])
                        nextOptionIds.add(optionId)

                        return {
                            ...current,
                            [model.id]: [...nextOptionIds]
                        }
                    })
                }
            } catch (error) {
                console.error("Failed to persist model-config option mapping:", error)
                setErrorMessage(uiTextDefinitions.productManagement.errors.updateModelConfigOptionsFailed)
            } finally {
                setPersistingProductLineIds((current) => current.filter((id) => id !== line.id))
            }
        },
        [assignedConfigIdsByModelId, assignedConfigOptionIdsByModelId, getConfigOptionIds]
    )

    const handleAssignedModelConfigToggle = useCallback(
        async (
            line: ProductMgmtParent,
            model: ProductMgmtChild,
            config: ConfigWithOptions,
            isSelected: boolean
        ) => {
            setErrorMessage("")
            setPersistingProductLineIds((current) =>
                current.includes(line.id) ? current : [...current, line.id]
            )

            try {
                if (isSelected) {
                    await deleteMapModelConfig(model.id, config.id)

                    setAssignedConfigIdsByModelId((current) => ({
                        ...current,
                        [model.id]: (current[model.id] ?? []).filter((id) => id !== config.id)
                    }))
                } else {
                    await createMapModelConfig(model.id, config.id)

                    setAssignedConfigIdsByModelId((current) => {
                        const nextConfigIds = new Set(current[model.id] ?? [])
                        nextConfigIds.add(config.id)

                        return {
                            ...current,
                            [model.id]: [...nextConfigIds]
                        }
                    })
                }
            } catch (error) {
                console.error("Failed to persist model-config mapping:", error)
                setErrorMessage(uiTextDefinitions.productManagement.errors.updateModelConfigFailed)
            } finally {
                setPersistingProductLineIds((current) => current.filter((id) => id !== line.id))
            }
        },
        []
    )

    return (
        <div className="admin-page-shell flex h-screen w-full flex-col gap-5 overflow-hidden p-6">
            <div className="admin-page-hero shrink-0">
                <div className="flex items-center gap-4">
                    <PackageSearch className="size-8 shrink-0 text-white" aria-hidden="true" />
                    <div>
                        <h1 className="admin-page-hero-title text-2xl font-semibold tracking-tight">Product Management</h1>
                        <p className="admin-page-hero-subtitle text-sm">
                            {uiTextDefinitions.productManagement.helperText.pageSubtitle}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-[250px_minmax(0,1fr)]">
                <div className="grid min-h-0 min-w-0 grid-rows-2 gap-5">
                    <div className="flex min-h-0 min-w-0 flex-col gap-2">
                        <div className="px-1">
                            <h2 className="text-base font-semibold tracking-tight text-[var(--solveonyx-blue)]">Products</h2>
                        </div>
                        <Card className="flex min-h-0 w-full flex-1 flex-col overflow-hidden py-0.5">
                            <CardContent className="min-h-0 flex-1 overflow-visible px-2 py-2">
                                {isLoadingProducts ? (
                                    <div className="h-full w-full max-w-60 space-y-2">
                                        <Skeleton className="h-11 w-full" />
                                        <Skeleton className="h-11 w-full" />
                                        <Skeleton className="h-14 w-full" />
                                    </div>
                                ) : (
                                    <SelectionGallery
                                        items={products}
                                        selectedId={selectedProductId}
                                        getItemLabel={(product) => product.name}
                                        onSelect={(product) => setSelectedProductId(product.id)}
                                        onSave={saveProductName}
                                        onDelete={requestDeleteProduct}
                                        onCreate={createNewProduct}
                                        onActiveStateChange={handleGalleryActiveStateChange}
                                        addButtonLabel="Add Product"
                                        reorder={{ onReorder: reorderProducts }}
                                        disabled={galleryInteractionLocked}
                                        className="h-full"
                                        emptyMessage={emptyStateDefinitions.productManagement.noProductsFound}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex min-h-0 min-w-0 flex-col gap-2">
                        <div className="px-1">
                            <h2 className="text-base font-semibold tracking-tight text-[var(--solveonyx-blue)]">Assigned Configurables</h2>
                        </div>
                        <Card className="flex min-h-0 w-full flex-1 flex-col overflow-hidden py-0.5">
                            <CardContent className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
                                <PillList
                                    items={sortedConfigs}
                                    selectedIds={assignedConfigIdsByProductId[selectedProductId] ?? []}
                                    getItemLabel={(config) => config.name}
                                    onToggle={(config, isSelected) => {
                                        void handleAssignedProductConfigToggle(config, isSelected)
                                    }}
                                    disabled={
                                        !selectedProductId ||
                                        galleryInteractionLocked ||
                                        isPersistingSelectedProduct
                                    }
                                    pillClassName="max-w-full"
                                    emptyMessage={emptyStateDefinitions.productManagement.noConfigurablesFound}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className="flex min-h-0 min-w-0 flex-col gap-2">
                    <div className="px-1">
                        <h2 className="text-base font-semibold tracking-tight text-[var(--solveonyx-blue)]">Product Lines</h2>
                    </div>
                    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
                        {isLoadingHierarchy ? (
                            <div className="space-y-3">
                                <Skeleton className="h-14 w-full" />
                                <Skeleton className="h-14 w-full" />
                                <Skeleton className="h-8 w-40" />
                            </div>
                        ) : (
                            <MultiLevelListEditor
                                items={productLines}
                                onSaveParent={saveProductLineName}
                                onDeleteParent={requestDeleteProductLine}
                                onCreateParent={createProductLineForProduct}
                                onCreateChild={createModelForLine}
                                onSaveChild={saveModelName}
                                onDeleteChild={requestDeleteModel}
                                onReorderParents={reorderProductLines}
                                onReorderChildren={reorderModelsForLine}
                                onActiveStateChange={handleHierarchyActiveStateChange}
                                interactionLocked={hierarchyInteractionLocked}
                                showParentSupplement
                                parentSupplementLabel="Assigned Configurables"
                                childSectionLabel="Models"
                                childRowSupplementLabel="Configurable Options"
                                renderParentSupplement={(parent) => (
                                    <PillList
                                        items={productAssignedConfigs}
                                        selectedIds={assignedConfigIdsByProductLineId[parent.id] ?? []}
                                        getItemLabel={(config) => config.name}
                                        onToggle={(config, isSelected) => {
                                            void handleAssignedConfigToggle(parent, config, isSelected)
                                        }}
                                        disabled={
                                            activeEditorKey !== null ||
                                            hierarchyInteractionLocked ||
                                            persistingProductLineIds.includes(parent.id)
                                        }
                                        pillClassName="max-w-full"
                                        emptyMessage={emptyStateDefinitions.productManagement.noConfigurablesAssignedToProduct}
                                    />
                                )}
                                renderChildRowSupplement={(parent, child) => {
                                    const lineAssignedConfigs = productAssignedConfigs.filter((config) =>
                                        (assignedConfigIdsByProductLineId[parent.id] ?? []).includes(config.id)
                                    )
                                    const assignedYesNoConfigs = lineAssignedConfigs.filter((config) =>
                                        isYesNoConfig(config)
                                    )
                                    const assignedSingleSelectConfigs = lineAssignedConfigs.filter((config) =>
                                        isSingleSelectConfig(config)
                                    )
                                    const hasAnyModelLevelConfigControls =
                                        assignedYesNoConfigs.length > 0 || assignedSingleSelectConfigs.length > 0

                                    if (!hasAnyModelLevelConfigControls) {
                                        return (
                                            <PillList
                                                items={[]}
                                                emptyMessage={emptyStateDefinitions.productManagement.noModelLevelConfigControlsForProductLine}
                                            />
                                        )
                                    }

                                    return (
                                        <div className="space-y-3">
                                            {assignedYesNoConfigs.length > 0 ? (
                                                <div className="space-y-2">
                                                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                                                        Yes/No Configurables
                                                    </p>
                                                    <PillList
                                                        items={assignedYesNoConfigs}
                                                        selectedIds={assignedConfigIdsByModelId[child.id] ?? []}
                                                        getItemLabel={(config) => config.name}
                                                        onToggle={(config, isSelected) => {
                                                            void handleAssignedModelConfigToggle(
                                                                parent,
                                                                child,
                                                                config,
                                                                isSelected
                                                            )
                                                        }}
                                                        disabled={
                                                            activeEditorKey !== null ||
                                                            hierarchyInteractionLocked ||
                                                            persistingProductLineIds.includes(parent.id)
                                                        }
                                                        pillClassName="max-w-full"
                                                        emptyMessage={emptyStateDefinitions.productManagement.noYesNoConfigurablesForProductLine}
                                                    />
                                                </div>
                                            ) : null}

                                            {assignedSingleSelectConfigs.map((config) => (
                                                <div key={config.id} className="space-y-2">
                                                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                                                        {config.name}
                                                    </p>
                                                    <PillList
                                                        items={config.options}
                                                        selectedIds={assignedConfigOptionIdsByModelId[child.id] ?? []}
                                                        getItemLabel={(option) => option.name}
                                                        onToggle={(option, isSelected) => {
                                                            void handleAssignedModelOptionToggle(
                                                                parent,
                                                                child,
                                                                config,
                                                                option.id,
                                                                isSelected
                                                            )
                                                        }}
                                                        disabled={
                                                            activeEditorKey !== null ||
                                                            hierarchyInteractionLocked ||
                                                            persistingProductLineIds.includes(parent.id)
                                                        }
                                                        pillClassName="max-w-full"
                                                        emptyMessage={emptyStateDefinitions.productManagement.noConfigurableOptionsFound}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )
                                }}
                                addParentLabel="Add Product Line"
                                addChildLabel="Add Model"
                                pinAddParentToBottom
                                emptyMessage={emptyStateDefinitions.productManagement.noProductLinesForProduct}
                            />
                        )}
                    </div>
                </div>
            </div>

            {errorMessage && (
                <Alert variant="destructive" className="shrink-0">
                    <AlertTitle>{uiTextDefinitions.productManagement.alerts.pageIssueTitle}</AlertTitle>
                    <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
            )}

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
