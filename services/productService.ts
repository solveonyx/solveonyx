import { supabase } from "@/lib/supabase"
import { normalizeDisplayOrders } from "@/lib/displayOrder"
import { Model, Product, ProductLine } from "@/types"

// GET ALL PRODUCTS
export async function fetchProducts(): Promise<Product[]> {
    const { data, error } = await supabase
        .from("prod")
        .select("id, prod_name, display_order")
        .order("display_order")

    if (error) {
        console.error("fetchProducts error:", error)
        throw error
    }

    return (data ?? []).map((p) => ({
        id: p.id,
        name: p.prod_name,
        displayOrder: p.display_order
    }))
}

// CREATE PRODUCT
export async function createProduct(name: string): Promise<Product> {
    const { data, error } = await supabase
        .from("prod")
        .insert([{ prod_name: name }])
        .select("id, prod_name, display_order")
        .single()

    if (error) {
        console.error("createProduct error:", error)
        throw error
    }

    return {
        id: data.id,
        name: data.prod_name,
        displayOrder: data.display_order
    }
}

export type UpdateProductInput = {
    name?: string
    displayOrder?: number | null
}

export type DeleteProductResult = {
    removedProductConfigMappingCount: number
    removedProductLineConfigMappingCount: number
    removedModelConfigMappingCount: number
    removedModelConfigOptionMappingCount: number
    removedProductLineCount: number
    removedModelCount: number
}

// UPDATE PRODUCT
export async function updateProduct(
    productId: string,
    updates: UpdateProductInput
): Promise<Product> {
    const payload: {
        prod_name?: string
        display_order?: number | null
    } = {}

    if (updates.name !== undefined) {
        payload.prod_name = updates.name
    }

    if (updates.displayOrder !== undefined) {
        payload.display_order = updates.displayOrder
    }

    if (Object.keys(payload).length === 0) {
        throw new Error("updateProduct requires at least one field to update.")
    }

    const { data, error } = await supabase
        .from("prod")
        .update(payload)
        .eq("id", productId)
        .select("id, prod_name, display_order")
        .single()

    if (error) {
        console.error("updateProduct error:", error)
        throw error
    }

    return {
        id: data.id,
        name: data.prod_name,
        displayOrder: data.display_order
    }
}

export async function deleteProduct(productId: string): Promise<DeleteProductResult> {
    const { data: productLineRows, error: productLineLookupError } = await supabase
        .from("prod_line")
        .select("id")
        .eq("prod_id", productId)

    if (productLineLookupError) {
        console.error("deleteProduct product line lookup error:", productLineLookupError)
        throw productLineLookupError
    }

    const productLineIds = (productLineRows ?? []).map((row) => row.id as string)

    const { data: modelRows, error: modelLookupError } = productLineIds.length > 0
        ? await supabase.from("model").select("id").in("prod_line_id", productLineIds)
        : { data: [], error: null }

    if (modelLookupError) {
        console.error("deleteProduct model lookup error:", modelLookupError)
        throw modelLookupError
    }

    const modelIds = (modelRows ?? []).map((row) => row.id as string)

    const [
        productConfigCountResult,
        productLineConfigCountResult,
        modelConfigCountResult,
        modelConfigOptionCountResult
    ] = await Promise.all([
        supabase.from("map_prod-config").select("config_id", { count: "exact", head: true }).eq("prod_id", productId),
        productLineIds.length > 0
            ? supabase.from("map_prod_line-config").select("config_id", { count: "exact", head: true }).in("prod_line_id", productLineIds)
            : Promise.resolve({ count: 0, error: null }),
        modelIds.length > 0
            ? supabase.from("map_model-config").select("config_id", { count: "exact", head: true }).in("model_id", modelIds)
            : Promise.resolve({ count: 0, error: null }),
        modelIds.length > 0
            ? supabase.from("map_model-config_option").select("config_option_id", { count: "exact", head: true }).in("model_id", modelIds)
            : Promise.resolve({ count: 0, error: null })
    ])

    if (productConfigCountResult.error) {
        console.error("deleteProduct product mapping count error:", productConfigCountResult.error)
        throw productConfigCountResult.error
    }
    if (productLineConfigCountResult.error) {
        console.error("deleteProduct product line mapping count error:", productLineConfigCountResult.error)
        throw productLineConfigCountResult.error
    }
    if (modelConfigCountResult.error) {
        console.error("deleteProduct model mapping count error:", modelConfigCountResult.error)
        throw modelConfigCountResult.error
    }
    if (modelConfigOptionCountResult.error) {
        console.error("deleteProduct model option mapping count error:", modelConfigOptionCountResult.error)
        throw modelConfigOptionCountResult.error
    }

    if (modelIds.length > 0) {
        const modelCleanupResults = await Promise.all([
            supabase.from("map_model-config_option").delete().in("model_id", modelIds),
            supabase.from("map_model-config").delete().in("model_id", modelIds),
            supabase.from("model").delete().in("id", modelIds)
        ])

        const failedModelCleanup = modelCleanupResults.find((result) => result.error)
        if (failedModelCleanup?.error) {
            console.error("deleteProduct model cleanup error:", failedModelCleanup.error)
            throw failedModelCleanup.error
        }
    }

    if (productLineIds.length > 0) {
        const productLineCleanupResults = await Promise.all([
            supabase.from("map_prod_line-config").delete().in("prod_line_id", productLineIds),
            supabase.from("prod_line").delete().in("id", productLineIds)
        ])

        const failedProductLineCleanup = productLineCleanupResults.find((result) => result.error)
        if (failedProductLineCleanup?.error) {
            console.error("deleteProduct product line cleanup error:", failedProductLineCleanup.error)
            throw failedProductLineCleanup.error
        }
    }

    const cleanupResults = await Promise.all([
        supabase.from("map_prod-config").delete().eq("prod_id", productId),
        supabase.from("prod").delete().eq("id", productId)
    ])

    const failedCleanup = cleanupResults.find((result) => result.error)
    if (failedCleanup?.error) {
        console.error("deleteProduct cleanup error:", failedCleanup.error)
        throw failedCleanup.error
    }

    await reestablishProductDisplayOrder()

    return {
        removedProductConfigMappingCount: productConfigCountResult.count ?? 0,
        removedProductLineConfigMappingCount: productLineConfigCountResult.count ?? 0,
        removedModelConfigMappingCount: modelConfigCountResult.count ?? 0,
        removedModelConfigOptionMappingCount: modelConfigOptionCountResult.count ?? 0,
        removedProductLineCount: productLineIds.length,
        removedModelCount: modelIds.length
    }
}

// GET PRODUCT LINES BY PRODUCT
export async function fetchProductLines(productId: string): Promise<ProductLine[]> {
    const { data, error } = await supabase
        .from("prod_line")
        .select("id, prod_id, prod_line_name, display_order")
        .eq("prod_id", productId)
        .order("display_order")

    if (error) {
        console.error("fetchProductLines error:", error)
        throw error
    }

    return (data ?? []).map((pl) => ({
        id: pl.id,
        productId: pl.prod_id,
        name: pl.prod_line_name,
        displayOrder: pl.display_order
    }))
}

// CREATE PRODUCT LINE
export async function createProductLine(
    productId: string,
    name: string
): Promise<ProductLine> {
    const { count, error: countError } = await supabase
        .from("prod_line")
        .select("id", { count: "exact", head: true })
        .eq("prod_id", productId)

    if (countError) {
        console.error("createProductLine count error:", countError)
        throw countError
    }

    const nextDisplayOrder = (count ?? 0) + 1

    const { data, error } = await supabase
        .from("prod_line")
        .insert([{
            prod_id: productId,
            prod_line_name: name,
            display_order: nextDisplayOrder
        }])
        .select("id, prod_id, prod_line_name, display_order")
        .single()

    if (error) {
        console.error("createProductLine error:", error)
        throw error
    }

    return {
        id: data.id,
        productId: data.prod_id,
        name: data.prod_line_name,
        displayOrder: data.display_order
    }
}

export type UpdateProductLineInput = {
    productId?: string
    name?: string
    displayOrder?: number | null
}

export type DeleteProductLineResult = {
    removedProductLineConfigMappingCount: number
    removedModelConfigMappingCount: number
    removedModelConfigOptionMappingCount: number
    removedModelCount: number
}

// UPDATE PRODUCT LINE
export async function updateProductLine(
    productLineId: string,
    updates: UpdateProductLineInput
): Promise<ProductLine> {
    const payload: {
        prod_id?: string
        prod_line_name?: string
        display_order?: number | null
    } = {}

    if (updates.productId !== undefined) {
        payload.prod_id = updates.productId
    }

    if (updates.name !== undefined) {
        payload.prod_line_name = updates.name
    }

    if (updates.displayOrder !== undefined) {
        payload.display_order = updates.displayOrder
    }

    if (Object.keys(payload).length === 0) {
        throw new Error("updateProductLine requires at least one field to update.")
    }

    const { data, error } = await supabase
        .from("prod_line")
        .update(payload)
        .eq("id", productLineId)
        .select("id, prod_id, prod_line_name, display_order")
        .single()

    if (error) {
        console.error("updateProductLine error:", error)
        throw error
    }

    return {
        id: data.id,
        productId: data.prod_id,
        name: data.prod_line_name,
        displayOrder: data.display_order
    }
}

export async function deleteProductLine(productLineId: string): Promise<DeleteProductLineResult> {
    const { data: productLineRow, error: productLineLookupError } = await supabase
        .from("prod_line")
        .select("id, prod_id")
        .eq("id", productLineId)
        .single()

    if (productLineLookupError) {
        console.error("deleteProductLine lookup error:", productLineLookupError)
        throw productLineLookupError
    }

    const { data: modelRows, error: modelLookupError } = await supabase
        .from("model")
        .select("id")
        .eq("prod_line_id", productLineId)

    if (modelLookupError) {
        console.error("deleteProductLine model lookup error:", modelLookupError)
        throw modelLookupError
    }

    const modelIds = (modelRows ?? []).map((row) => row.id as string)

    const [
        productLineConfigCountResult,
        modelConfigCountResult,
        modelConfigOptionCountResult
    ] = await Promise.all([
        supabase.from("map_prod_line-config").select("config_id", { count: "exact", head: true }).eq("prod_line_id", productLineId),
        modelIds.length > 0
            ? supabase.from("map_model-config").select("config_id", { count: "exact", head: true }).in("model_id", modelIds)
            : Promise.resolve({ count: 0, error: null }),
        modelIds.length > 0
            ? supabase.from("map_model-config_option").select("config_option_id", { count: "exact", head: true }).in("model_id", modelIds)
            : Promise.resolve({ count: 0, error: null })
    ])

    if (productLineConfigCountResult.error) {
        console.error("deleteProductLine product line mapping count error:", productLineConfigCountResult.error)
        throw productLineConfigCountResult.error
    }
    if (modelConfigCountResult.error) {
        console.error("deleteProductLine model mapping count error:", modelConfigCountResult.error)
        throw modelConfigCountResult.error
    }
    if (modelConfigOptionCountResult.error) {
        console.error("deleteProductLine model option mapping count error:", modelConfigOptionCountResult.error)
        throw modelConfigOptionCountResult.error
    }

    if (modelIds.length > 0) {
        const cleanupModelResults = await Promise.all([
            supabase.from("map_model-config_option").delete().in("model_id", modelIds),
            supabase.from("map_model-config").delete().in("model_id", modelIds),
            supabase.from("model").delete().in("id", modelIds)
        ])

        const failedModelCleanup = cleanupModelResults.find((result) => result.error)
        if (failedModelCleanup?.error) {
            console.error("deleteProductLine model cleanup error:", failedModelCleanup.error)
            throw failedModelCleanup.error
        }
    }

    const cleanupResults = await Promise.all([
        supabase.from("map_prod_line-config").delete().eq("prod_line_id", productLineId),
        supabase.from("prod_line").delete().eq("id", productLineId)
    ])

    const failedCleanup = cleanupResults.find((result) => result.error)
    if (failedCleanup?.error) {
        console.error("deleteProductLine cleanup error:", failedCleanup.error)
        throw failedCleanup.error
    }

    await reestablishProductLineDisplayOrder(productLineRow.prod_id)

    return {
        removedProductLineConfigMappingCount: productLineConfigCountResult.count ?? 0,
        removedModelConfigMappingCount: modelConfigCountResult.count ?? 0,
        removedModelConfigOptionMappingCount: modelConfigOptionCountResult.count ?? 0,
        removedModelCount: modelIds.length
    }
}


// GET MODELS BY PRODUCT LINE
export async function fetchModels(
    productLineId: string
): Promise<Model[]> {
    const { data, error } = await supabase
        .from("model")
        .select("id, prod_line_id, model_name, display_order")
        .eq("prod_line_id", productLineId)
        .order("display_order")

    if (error) {
        console.error("fetchModels error:", error)
        throw error
    }

    return (data ?? []).map((m) => ({
        id: m.id,
        productLineId: m.prod_line_id,
        name: m.model_name,
        displayOrder: m.display_order
    }))
}

// CREATE MODEL
export async function createModel(
    productLineId: string,
    name: string
): Promise<Model> {
    const { count, error: countError } = await supabase
        .from("model")
        .select("id", { count: "exact", head: true })
        .eq("prod_line_id", productLineId)

    if (countError) {
        console.error("createModel count error:", countError)
        throw countError
    }

    const nextDisplayOrder = (count ?? 0) + 1

    const { data, error } = await supabase
        .from("model")
        .insert([{
            prod_line_id: productLineId,
            model_name: name,
            display_order: nextDisplayOrder
        }])
        .select("id, prod_line_id, model_name, display_order")
        .single()

    if (error) {
        console.error("createModel error:", error)
        throw error
    }

    return {
        id: data.id,
        productLineId: data.prod_line_id,
        name: data.model_name,
        displayOrder: data.display_order
    }
}

export type UpdateModelInput = {
    productLineId?: string
    name?: string
    displayOrder?: number | null
}

export type DeleteModelResult = {
    removedModelConfigMappingCount: number
    removedModelConfigOptionMappingCount: number
}

// UPDATE MODEL
export async function updateModel(
    modelId: string,
    updates: UpdateModelInput
): Promise<Model> {
    const payload: {
        prod_line_id?: string
        model_name?: string
        display_order?: number | null
    } = {}

    if (updates.productLineId !== undefined) {
        payload.prod_line_id = updates.productLineId
    }

    if (updates.name !== undefined) {
        payload.model_name = updates.name
    }

    if (updates.displayOrder !== undefined) {
        payload.display_order = updates.displayOrder
    }

    if (Object.keys(payload).length === 0) {
        throw new Error("updateModel requires at least one field to update.")
    }

    const { data, error } = await supabase
        .from("model")
        .update(payload)
        .eq("id", modelId)
        .select("id, prod_line_id, model_name, display_order")
        .single()

    if (error) {
        console.error("updateModel error:", error)
        throw error
    }

    return {
        id: data.id,
        productLineId: data.prod_line_id,
        name: data.model_name,
        displayOrder: data.display_order
    }
}

export async function deleteModel(modelId: string): Promise<DeleteModelResult> {
    const { data: modelRow, error: modelLookupError } = await supabase
        .from("model")
        .select("id, prod_line_id")
        .eq("id", modelId)
        .single()

    if (modelLookupError) {
        console.error("deleteModel lookup error:", modelLookupError)
        throw modelLookupError
    }

    const [modelConfigCountResult, modelConfigOptionCountResult] = await Promise.all([
        supabase.from("map_model-config").select("config_id", { count: "exact", head: true }).eq("model_id", modelId),
        supabase.from("map_model-config_option").select("config_option_id", { count: "exact", head: true }).eq("model_id", modelId)
    ])

    if (modelConfigCountResult.error) {
        console.error("deleteModel model mapping count error:", modelConfigCountResult.error)
        throw modelConfigCountResult.error
    }
    if (modelConfigOptionCountResult.error) {
        console.error("deleteModel model option mapping count error:", modelConfigOptionCountResult.error)
        throw modelConfigOptionCountResult.error
    }

    const cleanupResults = await Promise.all([
        supabase.from("map_model-config_option").delete().eq("model_id", modelId),
        supabase.from("map_model-config").delete().eq("model_id", modelId),
        supabase.from("model").delete().eq("id", modelId)
    ])

    const failedCleanup = cleanupResults.find((result) => result.error)
    if (failedCleanup?.error) {
        console.error("deleteModel cleanup error:", failedCleanup.error)
        throw failedCleanup.error
    }

    await reestablishModelDisplayOrder(modelRow.prod_line_id)

    return {
        removedModelConfigMappingCount: modelConfigCountResult.count ?? 0,
        removedModelConfigOptionMappingCount: modelConfigOptionCountResult.count ?? 0
    }
}

type DisplayOrderEntity = "prod" | "prod_line" | "model"

export type DisplayOrderRepairSummary = {
    entity: DisplayOrderEntity
    scanned: number
    updated: number
}

async function applyDisplayOrderUpdates(
    entity: DisplayOrderEntity,
    updates: Array<{ id: string; nextDisplayOrder: number }>
): Promise<number> {
    if (updates.length === 0) {
        return 0
    }

    const updateResults = await Promise.all(
        updates.map((update) =>
            supabase
                .from(entity)
                .update({ display_order: update.nextDisplayOrder })
                .eq("id", update.id)
        )
    )

    const failed = updateResults.find((result) => result.error)
    if (failed?.error) {
        console.error(`applyDisplayOrderUpdates (${entity}) error:`, failed.error)
        throw failed.error
    }

    return updates.length
}

export async function reestablishProductDisplayOrder(): Promise<DisplayOrderRepairSummary> {
    const { data, error } = await supabase
        .from("prod")
        .select("id, display_order")

    if (error) {
        console.error("reestablishProductDisplayOrder error:", error)
        throw error
    }

    const rows = (data ?? []) as Array<{
        id: string
        display_order: number | null
    }>

    const normalized = normalizeDisplayOrders(rows, {
        getId: (row) => row.id,
        getDisplayOrder: (row) => row.display_order
    })

    const changed = normalized
        .filter((row) => row.changed)
        .map((row) => ({ id: row.id, nextDisplayOrder: row.nextDisplayOrder }))

    const updated = await applyDisplayOrderUpdates("prod", changed)

    return {
        entity: "prod",
        scanned: rows.length,
        updated
    }
}

export async function reestablishProductLineDisplayOrder(
    productId?: string
): Promise<DisplayOrderRepairSummary> {
    let query = supabase
        .from("prod_line")
        .select("id, prod_id, display_order")

    if (productId) {
        query = query.eq("prod_id", productId)
    }

    const { data, error } = await query

    if (error) {
        console.error("reestablishProductLineDisplayOrder error:", error)
        throw error
    }

    const rows = (data ?? []) as Array<{
        id: string
        prod_id: string
        display_order: number | null
    }>

    const normalized = normalizeDisplayOrders(rows, {
        getId: (row) => row.id,
        getDisplayOrder: (row) => row.display_order,
        getGroupKey: (row) => row.prod_id
    })

    const changed = normalized
        .filter((row) => row.changed)
        .map((row) => ({ id: row.id, nextDisplayOrder: row.nextDisplayOrder }))

    const updated = await applyDisplayOrderUpdates("prod_line", changed)

    return {
        entity: "prod_line",
        scanned: rows.length,
        updated
    }
}

export async function reestablishModelDisplayOrder(
    productLineId?: string
): Promise<DisplayOrderRepairSummary> {
    let query = supabase
        .from("model")
        .select("id, prod_line_id, display_order")

    if (productLineId) {
        query = query.eq("prod_line_id", productLineId)
    }

    const { data, error } = await query

    if (error) {
        console.error("reestablishModelDisplayOrder error:", error)
        throw error
    }

    const rows = (data ?? []) as Array<{
        id: string
        prod_line_id: string
        display_order: number | null
    }>

    const normalized = normalizeDisplayOrders(rows, {
        getId: (row) => row.id,
        getDisplayOrder: (row) => row.display_order,
        getGroupKey: (row) => row.prod_line_id
    })

    const changed = normalized
        .filter((row) => row.changed)
        .map((row) => ({ id: row.id, nextDisplayOrder: row.nextDisplayOrder }))

    const updated = await applyDisplayOrderUpdates("model", changed)

    return {
        entity: "model",
        scanned: rows.length,
        updated
    }
}

export async function reestablishAllDisplayOrders(): Promise<DisplayOrderRepairSummary[]> {
    const productSummary = await reestablishProductDisplayOrder()
    const productLineSummary = await reestablishProductLineDisplayOrder()
    const modelSummary = await reestablishModelDisplayOrder()

    return [productSummary, productLineSummary, modelSummary]
}
