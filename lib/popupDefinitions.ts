export type ConfirmDialogDefinition = {
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
}

export const popupDefinitions = {
    configuration: {
        // Fired when a user changes a configurable away from the Single Select type.
        changeConfigType: (configName: string, nextTypeName: string): ConfirmDialogDefinition => ({
            title: "Change Config Type?",
            message: `Changing "${configName}" to ${nextTypeName} will remove all of its options and any model-option assignments tied to those options.`,
            confirmLabel: "Change Type",
            cancelLabel: "Cancel"
        }),
        // Fired when a user deletes an entire configurable from Configuration Management.
        deleteConfig: (configName: string): ConfirmDialogDefinition => ({
            title: "Delete Configurable?",
            message: `Deleting "${configName}" will remove the configurable, all configurable options underneath it, and related assignments from the product, product line, model, and model-option mapping tables.`,
            confirmLabel: "Delete",
            cancelLabel: "Cancel"
        }),
        // Fired when a user deletes one option underneath a configurable.
        deleteConfigOption: (optionName: string): ConfirmDialogDefinition => ({
            title: "Delete Configurable Option?",
            message: `Deleting "${optionName}" will remove it from this configurable and clear any related model-option mapping records that reference it.`,
            confirmLabel: "Delete",
            cancelLabel: "Cancel"
        })
    },
    productManagement: {
        // Fired when a user deletes a product from the Product Management sidebar.
        deleteProduct: (productName: string): ConfirmDialogDefinition => ({
            title: "Delete Product?",
            message: `Deleting "${productName}" will remove the product, all product lines underneath it, all models under those product lines, and related assignments from the product, product line, model-config, and model-config_option mapping tables.`,
            confirmLabel: "Delete",
            cancelLabel: "Cancel"
        }),
        // Fired when a user deletes a product line and everything nested under it.
        deleteProductLine: (productLineName: string): ConfirmDialogDefinition => ({
            title: "Delete Product Line?",
            message: `Deleting "${productLineName}" will remove the product line, all models underneath it, and related assignments from the product line, model-config, and model-config_option mapping tables.`,
            confirmLabel: "Delete",
            cancelLabel: "Cancel"
        }),
        // Fired when a user deletes a single model from a product line.
        deleteModel: (modelName: string): ConfirmDialogDefinition => ({
            title: "Delete Model?",
            message: `Deleting "${modelName}" will remove the model and clear related assignments from the model-config and model-config_option mapping tables.`,
            confirmLabel: "Delete",
            cancelLabel: "Cancel"
        }),
        // Fired when a user removes a configurable from a product and that removal will cascade down.
        removeProductConfigurable: (configName: string): ConfirmDialogDefinition => ({
            title: "Remove Product Configurable?",
            message: `Removing "${configName}" from this product will also remove it from the product lines and models under this product, along with any related configurable option assignments.`,
            confirmLabel: "Remove",
            cancelLabel: "Cancel"
        }),
        // Fired when a user removes a configurable from a product line and that removal will cascade to its models.
        removeProductLineConfigurable: (
            configName: string,
            productLineName: string
        ): ConfirmDialogDefinition => ({
            title: "Remove Product Line Configurable?",
            message: `Removing "${configName}" from "${productLineName}" will also remove it from the models in this product line, along with any related configurable option assignments.`,
            confirmLabel: "Remove",
            cancelLabel: "Cancel"
        })
    }
} as const
