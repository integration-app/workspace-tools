const INTEGRATION_ELEMENTS = {
    "integrations": {
        element: "integration",
        elements: "integrations",
        exportable: false, // Integrations export are not supported yet. Should come early in Q2 2024
        exportCleanup: (el) => {
            return  {
                id: el.id,
                key: el.key,
                name: el.name,
                connectorId: el.connectorId,
                baseUri: el.baseUri,
                }
        }
    },
    "actions": {
        element: "action",
        elements: "actions",
        integrationSpecific: true, // Integrations export are not supported yet. Should come early in Q2 2024
        exportCleanup: (el) => {
            delete el.integration
            return el
        }
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
    delete element.revision
    delete element.parentRevision
    delete element.parentId
    Object.keys(element).map((key) => {
        if (key.match(/universal.*Revision/g)) {
            delete element[key]
        }
    })
    return element
}
module.exports = { INTEGRATION_ELEMENTS, baseExportCleanup }
