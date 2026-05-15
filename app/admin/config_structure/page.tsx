import { ListTree } from "lucide-react"
import { ConfigHierarchyContextFilter } from "@/components/configHierarchyContextFilter"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { uiTextDefinitions } from "@/lib/uiTextDefinitions"
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
        <div className="admin-page-shell w-full space-y-5 p-6">
            <div className="admin-page-hero">
                <div className="flex items-center gap-4">
                    <ListTree className="size-8 shrink-0 text-white" aria-hidden="true" />
                    <div>
                        <h1 className="admin-page-hero-title text-2xl font-semibold tracking-tight">Configuration Hierarchy</h1>
                        <p className="admin-page-hero-subtitle text-sm">
                            Review configurables and options assigned to different products, product lines, and models.
                        </p>
                    </div>
                </div>
            </div>

            {hierarchy.length === 0 && (
                <Alert>
                    <AlertTitle>{uiTextDefinitions.configurationStructure.alerts.noConfigsTitle}</AlertTitle>
                    <AlertDescription>{uiTextDefinitions.configurationStructure.helperText.noConfigsDescription}</AlertDescription>
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
