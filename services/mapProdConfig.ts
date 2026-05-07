import { supabase } from "@/lib/supabase"
import { formatError } from "@/lib/errorFormatting"
import { MapModelConfig, MapModelConfigOption, MapProdConfig, MapProdLineConfig } from "@/types"

export type RemoveProductConfigAssignmentResult = {
    removedProductMappingCount: number
    removedProductLineMappingCount: number
    removedModelMappingCount: number
    removedModelOptionMappingCount: number
}

export type AssignProductConfigAssignmentResult = {
    addedProductMappingCount: number
    addedProductLineMappingCount: number
    addedModelMappingCount: number
    addedModelOptionMappingCount: number
}

export type RemoveProductLineConfigAssignmentResult = {
    removedProductLineMappingCount: number
    removedModelMappingCount: number
    removedModelOptionMappingCount: number
}

export type AssignProductLineConfigAssignmentResult = {
    addedProductLineMappingCount: number
    addedModelMappingCount: number
    addedModelOptionMappingCount: number
}

// GET PRODUCT-CONFIG MAPPINGS
export async function fetchMapProdConfigs(): Promise<MapProdConfig[]> {
    const { data, error } = await supabase
        .from("map_prod-config")
        .select("prod_id, config_id")

    if (error) {
        console.error("fetchMapProdConfigs error:", error)
        throw error
    }

    return (data ?? []).map((row) => ({
        prodId: row.prod_id,
        configId: row.config_id
    }))
}

// CREATE PRODUCT-CONFIG MAPPING
export async function createMapProdConfig(
    prodId: string,
    configId: string
): Promise<MapProdConfig> {
    const { error } = await supabase
        .from("map_prod-config")
        .upsert([{
            prod_id: prodId,
            config_id: configId
        }], {
            onConflict: "prod_id,config_id",
            ignoreDuplicates: true
        })

    if (error) {
        console.error("createMapProdConfig error:", formatError(error), error)
        throw new Error(formatError(error))
    }

    return {
        prodId,
        configId
    }
}

// DELETE PRODUCT-CONFIG MAPPING
export async function deleteMapProdConfig(
    prodId: string,
    configId: string
): Promise<void> {
    const { error } = await supabase
        .from("map_prod-config")
        .delete()
        .eq("prod_id", prodId)
        .eq("config_id", configId)

    if (error) {
        console.error("deleteMapProdConfig error:", formatError(error), error)
        throw new Error(formatError(error))
    }
}

// GET MODEL-CONFIG MAPPINGS
export async function fetchMapModelConfigs(): Promise<MapModelConfig[]> {
    const { data, error } = await supabase
        .from("map_model-config")
        .select("model_id, config_id")

    if (error) {
        console.error("fetchMapModelConfigs error:", error)
        throw error
    }

    return (data ?? []).map((row) => ({
        modelId: row.model_id,
        configId: row.config_id
    }))
}

// CREATE MODEL-CONFIG MAPPING
export async function createMapModelConfig(
    modelId: string,
    configId: string
): Promise<MapModelConfig> {
    const { error } = await supabase
        .from("map_model-config")
        .upsert([{
            model_id: modelId,
            config_id: configId
        }], {
            onConflict: "model_id,config_id",
            ignoreDuplicates: true
        })

    if (error) {
        console.error("createMapModelConfig error:", formatError(error), error)
        throw new Error(formatError(error))
    }

    return {
        modelId,
        configId
    }
}

// DELETE MODEL-CONFIG MAPPING
export async function deleteMapModelConfig(
    modelId: string,
    configId: string
): Promise<void> {
    const { error } = await supabase
        .from("map_model-config")
        .delete()
        .eq("model_id", modelId)
        .eq("config_id", configId)

    if (error) {
        console.error("deleteMapModelConfig error:", formatError(error), error)
        throw new Error(formatError(error))
    }
}

// GET MODEL-CONFIG OPTION MAPPINGS
export async function fetchMapModelConfigOptions(): Promise<MapModelConfigOption[]> {
    const { data, error } = await supabase
        .from("map_model-config_option")
        .select("model_id, config_option_id")

    if (error) {
        console.error("fetchMapModelConfigOptions error:", error)
        throw error
    }

    return (data ?? []).map((row) => ({
        modelId: row.model_id,
        configOptionId: row.config_option_id
    }))
}

// CREATE MODEL-CONFIG OPTION MAPPING
export async function createMapModelConfigOption(
    modelId: string,
    configOptionId: string
): Promise<MapModelConfigOption> {
    const { data: optionRow, error: optionLookupError } = await supabase
        .from("config_option")
        .select("config_id")
        .eq("id", configOptionId)
        .single()

    if (optionLookupError) {
        console.error("createMapModelConfigOption option lookup error:", formatError(optionLookupError), optionLookupError)
        throw new Error(formatError(optionLookupError))
    }

    const { error: ensureParentError } = await supabase
        .from("map_model-config")
        .upsert([{
            model_id: modelId,
            config_id: optionRow.config_id
        }], {
            onConflict: "model_id,config_id",
            ignoreDuplicates: true
        })

    if (ensureParentError) {
        console.error("createMapModelConfigOption ensure parent error:", formatError(ensureParentError), ensureParentError)
        throw new Error(formatError(ensureParentError))
    }

    const { error } = await supabase
        .from("map_model-config_option")
        .upsert([{
            model_id: modelId,
            config_option_id: configOptionId
        }], {
            onConflict: "model_id,config_option_id",
            ignoreDuplicates: true
        })

    if (error) {
        console.error("createMapModelConfigOption error:", formatError(error), error)
        throw new Error(formatError(error))
    }

    return {
        modelId,
        configOptionId
    }
}

// DELETE MODEL-CONFIG OPTION MAPPING
export async function deleteMapModelConfigOption(
    modelId: string,
    configOptionId: string
): Promise<void> {
    const { error } = await supabase
        .from("map_model-config_option")
        .delete()
        .eq("model_id", modelId)
        .eq("config_option_id", configOptionId)

    if (error) {
        console.error("deleteMapModelConfigOption error:", formatError(error), error)
        throw new Error(formatError(error))
    }
}

// GET PRODUCT LINE-CONFIG MAPPINGS
export async function fetchMapProdLineConfigs(): Promise<MapProdLineConfig[]> {
    const { data, error } = await supabase
        .from("map_prod_line-config")
        .select("prod_line_id, config_id")

    if (error) {
        console.error("fetchMapProdLineConfigs error:", error)
        throw error
    }

    return (data ?? []).map((row) => ({
        prodLineId: row.prod_line_id,
        configId: row.config_id
    }))
}

// CREATE PRODUCT LINE-CONFIG MAPPING
export async function createMapProdLineConfig(
    prodLineId: string,
    configId: string
): Promise<MapProdLineConfig> {
    const { error } = await supabase
        .from("map_prod_line-config")
        .upsert([{
            prod_line_id: prodLineId,
            config_id: configId
        }], {
            onConflict: "prod_line_id,config_id",
            ignoreDuplicates: true
        })

    if (error) {
        console.error("createMapProdLineConfig error:", formatError(error), error)
        throw new Error(formatError(error))
    }

    return {
        prodLineId,
        configId
    }
}

// DELETE PRODUCT LINE-CONFIG MAPPING
export async function deleteMapProdLineConfig(
    prodLineId: string,
    configId: string
): Promise<void> {
    const { error } = await supabase
        .from("map_prod_line-config")
        .delete()
        .eq("prod_line_id", prodLineId)
        .eq("config_id", configId)

    if (error) {
        console.error("deleteMapProdLineConfig error:", formatError(error), error)
        throw new Error(formatError(error))
    }
}

export async function removeProductConfigAssignment(
    prodId: string,
    configId: string
): Promise<RemoveProductConfigAssignmentResult> {
    const { data, error } = await supabase.rpc("admin_remove_product_config_assignment", {
        p_prod_id: prodId,
        p_config_id: configId
    })

    if (error) {
        console.error("removeProductConfigAssignment error:", formatError(error), error)
        throw new Error(formatError(error))
    }

    const row = Array.isArray(data) ? data[0] : null

    return {
        removedProductMappingCount: row?.removed_product_mapping_count ?? 0,
        removedProductLineMappingCount: row?.removed_product_line_mapping_count ?? 0,
        removedModelMappingCount: row?.removed_model_mapping_count ?? 0,
        removedModelOptionMappingCount: row?.removed_model_option_mapping_count ?? 0
    }
}

export async function assignProductConfigAssignment(
    prodId: string,
    configId: string
): Promise<AssignProductConfigAssignmentResult> {
    const { data, error } = await supabase.rpc("admin_assign_product_config_assignment", {
        p_prod_id: prodId,
        p_config_id: configId
    })

    if (error) {
        console.error("assignProductConfigAssignment error:", formatError(error), error)
        throw new Error(formatError(error))
    }

    const row = Array.isArray(data) ? data[0] : null

    return {
        addedProductMappingCount: row?.added_product_mapping_count ?? 0,
        addedProductLineMappingCount: row?.added_product_line_mapping_count ?? 0,
        addedModelMappingCount: row?.added_model_mapping_count ?? 0,
        addedModelOptionMappingCount: row?.added_model_option_mapping_count ?? 0
    }
}

export async function removeProductLineConfigAssignment(
    prodLineId: string,
    configId: string
): Promise<RemoveProductLineConfigAssignmentResult> {
    const { data, error } = await supabase.rpc("admin_remove_product_line_config_assignment", {
        p_prod_line_id: prodLineId,
        p_config_id: configId
    })

    if (error) {
        console.error("removeProductLineConfigAssignment error:", formatError(error), error)
        throw new Error(formatError(error))
    }

    const row = Array.isArray(data) ? data[0] : null

    return {
        removedProductLineMappingCount: row?.removed_product_line_mapping_count ?? 0,
        removedModelMappingCount: row?.removed_model_mapping_count ?? 0,
        removedModelOptionMappingCount: row?.removed_model_option_mapping_count ?? 0
    }
}

export async function assignProductLineConfigAssignment(
    prodLineId: string,
    configId: string
): Promise<AssignProductLineConfigAssignmentResult> {
    const { data, error } = await supabase.rpc("admin_assign_product_line_config_assignment", {
        p_prod_line_id: prodLineId,
        p_config_id: configId
    })

    if (error) {
        console.error("assignProductLineConfigAssignment error:", formatError(error), error)
        throw new Error(formatError(error))
    }

    const row = Array.isArray(data) ? data[0] : null

    return {
        addedProductLineMappingCount: row?.added_product_line_mapping_count ?? 0,
        addedModelMappingCount: row?.added_model_mapping_count ?? 0,
        addedModelOptionMappingCount: row?.added_model_option_mapping_count ?? 0
    }
}
