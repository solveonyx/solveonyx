export const uiTextDefinitions = {
    generic: {
        componentFeedback: {
            // Shown by the simple list editor when saving an edited row fails.
            listSaveFailed: "Unable to save changes. Please try again.",
            // Shown by the simple list editor when creating a new row fails.
            listCreateFailed: "Unable to add item. Please try again.",
            // Shown by the simple list editor when deleting a row fails.
            listDeleteFailed: "Unable to delete item. Please try again.",
            // Shown by the selection gallery when saving an edited card fails.
            gallerySaveFailed: "Unable to save changes. Please try again.",
            // Shown by the selection gallery when creating a new card fails.
            galleryCreateFailed: "Unable to add item. Please try again.",
            // Shown by the selection gallery when deleting a card fails.
            galleryDeleteFailed: "Unable to delete item. Please try again.",
            // Shown by the nested editors when saving a parent row fails.
            hierarchySaveFailed: "Unable to save changes.",
            // Shown by the nested editors when deleting a parent row fails.
            hierarchyDeleteFailed: "Unable to delete item.",
            // Shown by the nested editors when creating a new parent row fails.
            hierarchyCreateFailed: "Unable to add item."
        }
    },
    configurationManagement: {
        helperText: {
            // Subtitle under the Configuration Management page title.
            pageSubtitle: "Edit configs and nested config options inline."
        },
        validation: {
            // Raised when a configurable name is blank during create or save.
            configNameRequired: "Config name cannot be empty.",
            // Raised when no config type is selected during a type change.
            configTypeRequired: "Config type is required.",
            // Raised when an option name is blank during create or save.
            optionNameRequired: "Option name cannot be empty.",
            // Raised when someone tries to add options to a non-Single Select configurable.
            optionsRequireSingleSelect: "Options are only available for Single Select configs.",
            // Raised when no config types exist yet and a configurable cannot be created.
            noConfigTypeFound: "No config type found. Create at least one config type first."
        },
        errors: {
            // Shown when the page cannot load config types and hierarchy data.
            loadFailed: "Could not load configurations and options.",
            // Shown when deleting a configurable or option fails after confirmation.
            deleteFailed: "Unable to delete the selected item.",
            // Shown when saving the configurable display order fails.
            saveConfigOrderFailed: "Unable to save config order.",
            // Shown when saving the option display order fails.
            saveOptionOrderFailed: "Unable to save option order."
        },
        alerts: {
            // Title used for the destructive alert banner on Configuration Management.
            pageIssueTitle: "Configuration issue"
        }
    },
    productManagement: {
        helperText: {
            // Subtitle under the Product Management page title.
            pageSubtitle: "Select a product, then edit product lines and nested models inline."
        },
        validation: {
            // Raised when a product name is blank during create or save.
            productNameRequired: "Product name cannot be empty.",
            // Raised when a product line name is blank during create or save.
            productLineNameRequired: "Product line name cannot be empty.",
            // Raised when a model name is blank during create or save.
            modelNameRequired: "Model name cannot be empty.",
            // Raised when someone tries to create a product line without first selecting a product.
            productSelectionRequired: "Select a product first."
        },
        errors: {
            // Shown when the left product gallery cannot load products.
            loadProductsFailed: "Could not load products.",
            // Shown when the configurables data cannot be loaded for the page.
            loadConfigurablesFailed: "Could not load configurables.",
            // Shown when the selected product's hierarchy cannot be loaded.
            loadHierarchyFailed: "Could not load product lines and models.",
            // Shown when deleting a product, product line, or model fails after confirmation.
            deleteFailed: "Unable to delete the selected item.",
            // Shown when saving product card order fails.
            saveProductOrderFailed: "Unable to save product order.",
            // Shown when saving product line order fails.
            saveProductLineOrderFailed: "Unable to save product line order.",
            // Shown when saving model order fails.
            saveModelOrderFailed: "Unable to save model order.",
            // Shown when a product-level configurable assignment update fails.
            updateSelectedProductConfigurablesFailed: "Unable to update assigned configurables for the selected product.",
            // Shown when a product-line configurable assignment update fails.
            updateAssignedConfigurablesFailed: "Unable to update assigned configurables.",
            // Shown when a model's single-select options update fails.
            updateModelConfigOptionsFailed: "Unable to update configurable options for the selected model.",
            // Shown when a model's yes/no configurable toggle fails.
            updateModelConfigFailed: "Unable to update the configurable for the selected model."
        },
        alerts: {
            // Title used for the destructive alert banner on Product Management.
            pageIssueTitle: "Product management issue"
        }
    },
    productStructure: {
        helperText: {
            // Subtitle under the Product Hierarchy page title.
            pageSubtitle: "Review product lines and models in their display order.",
            // Helper text under the hierarchy card title.
            hierarchyDescription: "Product lines are shown with their nested models.",
            // Placeholder text in the product selector before a product is chosen.
            selectProductPlaceholder: "Select a product",
            // Description shown when no products exist yet.
            noProductsDescription: "Create a product before reviewing its hierarchy."
        },
        errors: {
            // Shown when the Product Hierarchy page cannot load products.
            loadProductsFailed: "Could not load products.",
            // Shown when the Product Hierarchy page cannot load the selected product hierarchy.
            loadHierarchyFailed: "Could not load product hierarchy."
        },
        alerts: {
            // Title used when there are no products to review on Product Hierarchy.
            noProductsTitle: "No products found",
            // Title used for the destructive alert banner on Product Hierarchy.
            pageIssueTitle: "Product hierarchy issue"
        }
    },
    configurationStructure: {
        helperText: {
            // Description shown when no configurables exist yet on Configuration Hierarchy.
            noConfigsDescription: "Create a config before reviewing the hierarchy."
        },
        alerts: {
            // Title used when there are no configurables to review on Configuration Hierarchy.
            noConfigsTitle: "No configs found"
        }
    }
} as const
