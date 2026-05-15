export const emptyStateDefinitions = {
    generic: {
        // Shown by the basic list editor when it has nothing to render and no add action is available.
        listEditorNoRows: "No rows to display.",
        // Shown by the nested parent/child editors when there are no parent rows and no add action is available.
        multiLevelEditorNoParents: "No parent rows to display.",
        // Shown inside nested child lists when a parent exists but has no child rows yet.
        nestedEditorNoChildren: "No child rows for this parent.",
        // Shown by the selection gallery when there are no selectable cards and no add action is available.
        selectionGalleryNoItems: "No items available.",
        // Shown by the pill list when there are no pills available to render.
        pillListNoOptions: "No options available."
    },
    configurationManagement: {
        // Shown on Configuration Management when there are no configurables to list.
        noConfigsFound: "No configurables found."
    },
    productManagement: {
        // Shown in the left sidebar gallery when there are no products to select.
        noProductsFound: "No products found.",
        // Shown in the assigned configurables panel when there are no configurables available in the system.
        noConfigurablesFound: "No configurables found.",
        // Shown under a product line when the selected product has no configurables assigned to offer that line.
        noConfigurablesAssignedToProduct: "No configurables assigned to this product.",
        // Shown under a model when the product line has no model-level configurable controls to display.
        noModelLevelConfigControlsForProductLine:
            "No model-level configurable controls are available for this product line.",
        // Shown in the model-level yes/no section when no yes/no configurables are assigned to that product line.
        noYesNoConfigurablesForProductLine: "No yes/no configurables assigned to this product line.",
        // Shown in the model-level single-select section when a configurable has no options to show.
        noConfigurableOptionsFound: "No configurable options found.",
        // Shown in the main hierarchy area when the selected product has no product lines yet.
        noProductLinesForProduct: "No product lines found for this product."
    }
} as const
