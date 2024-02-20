const INTEGRATION_ELEMENTS = {
    "integrations": {
        element: "integration",
        elements: "integrations",
        exportable: false // Integrations export are not supported yet. Should come early in Q2 2024
    },  
    "actions": {
        element: "action",
        elements: "actions",
        integrationSpecific: true
    },
    "appDataSchemas": {
        element: "appDataSchema",
        elements: "appDataSchemas"
    },
    "appEventTypes": {
        element: "appEventType",
        elements: "appEventTypes"
    },
    "dataLinkTables": {
        element: "dataLinkTable",
        elements: "dataLinkTables"
    },
    "dataSources": {
        element: "dataSource",
        elements: "dataSources",
        integrationSpecific: true
    },
    "fieldMappings": {
        element: "fieldMapping",
        elements: "fieldMappings",
        integrationSpecific: true,
        exportCleanup: (fieldMapping) => {
            delete fieldMapping.dataSourceId
            return fieldMapping
        }
    },
    "flows": {
        element: "flow",
        elements: "flows",
        integrationSpecific: true
    }
}
function baseExportCleanup(element) {
    delete element.workspaceId
    delete element.createdAt
    delete element.updatedAt
    return element
}
module.exports = { INTEGRATION_ELEMENTS, baseExportCleanup }
