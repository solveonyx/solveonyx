import { ConfigHierarchyContextFilter } from "@/components/configHierarchyContextFilter"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { fetchConfigHierarchy } from "@/services/configurableHierarchyService"
import {
    fetchMapModelConfigOptions,
    fetchMapModelConfigs,
    fetchMapProdConfigs,
    fetchMapProdLineConfigs
} from "@/services/mapProdConfig"
import { fetchProducts } from "@/services/productService"

export default async function ConfigurationHierarchyPage() {
    const [hierarchy, products, prodConfigs, prodLineConfigs, modelConfigs, modelConfigOptions] = await Promise.all([
        fetchConfigHierarchy(),
        fetchProducts(),
        fetchMapProdConfigs(),
        fetchMapProdLineConfigs(),
        fetchMapModelConfigs(),
        fetchMapModelConfigOptions()
    ])

    return (
        <div className="w-full space-y-5 p-6">
            {hierarchy.length === 0 && (
                <Alert>
                    <AlertTitle>No configs found</AlertTitle>
                    <AlertDescription>Create a config before reviewing the hierarchy.</AlertDescription>
                </Alert>
            )}

            {hierarchy.length > 0 && (
                <ConfigHierarchyContextFilter
                    hierarchy={hierarchy}
                    products={products}
                    prodConfigs={prodConfigs}
                    prodLineConfigs={prodLineConfigs}
                    modelConfigs={modelConfigs}
                    modelConfigOptions={modelConfigOptions}
                />
            )}
        </div>
    )
}
