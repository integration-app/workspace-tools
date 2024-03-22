const fs = require('fs');
const { INTEGRATION_ELEMENTS, baseExportCleanup } = require('../integrationElements.js')
const { IntegrationAppClient } = require('@integration-app/sdk')
const { generateAccessToken, getWorkspaceData, hasParent, splitWorkspaceData, coloredLog } = require('../util.js')
const dotenv = require('dotenv');
const { exit } = require('process');

async function importPackage() {
    dotenv.config();
   
    const token = generateAccessToken(process.env.IMPORT_WORKSPACE_KEY, process.env.IMPORT_WORKSPACE_SECRET)
    const iApp = new IntegrationAppClient({ token: token })
    
    const warnings = [] // Collect all warnings and display them at the end
    
    const workspaceData = await getWorkspaceData(iApp, logs = "minified")
    // Matching imported data with existing data
    if (process.argv[3]) {
        data = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'))

        const {universalElements, integrationSpecificElements} = splitWorkspaceData(data)

        if (data.integrations) {
            warnings.push(...await syncIntegrations(data, workspaceData, iApp))
        }
        // Regfetch latest integrations
        workspaceData.integrations = await iApp.integrations.findAll()


        coloredLog(`Syncing Universal Elements`, "BgBlue")
        console.group()
        await syncElements(universalElements, workspaceData, iApp)
        console.groupEnd()
        
        coloredLog(`Syncing Integration Specific Elements`, "BgBlue")
        console.group()

        // Data Sources should be synced first, if passed
        if (integrationSpecificElements.dataSources) {
            await syncElements({ dataSources: integrationSpecificElements.dataSources }, workspaceData, iApp)
            delete integrationSpecificElements.dataSources
        }
        
        await syncElements(integrationSpecificElements, workspaceData, iApp)
        console.groupEnd()
    }
  
    // Display warnings
    coloredLog("Warnings        ", "BgYellow")
    console.group()
    for (warning of warnings) {
        coloredLog(warning,"Yellow")
    }
    console.groupEnd()
    coloredLog(`Data written successfully.`, "BgGreen");

}

async function syncIntegrations(sourceData, destinationData, iApp, warnings = []) {
    coloredLog("Matching imported integrations with existing ones","BgBlue")
    const integrationMissmatchErrors = []
    for (let integration of sourceData.integrations) {
        const matchedIntegration = destinationData.integrations.some((item) => item.key == integration.key)
        if (!matchedIntegration) {
            // Try to create the integration
            try {
                newIntegration = await iApp.integrations.create({ connectorId: integration.connectorId })
                coloredLog(`Created ${integration.key} ${integration.name}`, "Green")
            } catch (error) {
                // Failed to create, usually because of the connector is custom and not available in the destination workspace
                integrationMissmatchErrors.push(integration)
            }
        } else {
            coloredLog(`Matched ${integration.key} ${integration.name}`, "Blue")
        }
        // Check if they are on the same version
        if (matchedIntegration.baseUri != integration.baseUri) {
            warnings.push(`${integration.key} has different versions in the workspace, that may cause issues`)
        }

    }
    if (integrationMissmatchErrors.length > 0) {
        console.table(integrationMissmatchErrors.map((item) => { return { key: item.key, name: item.name } }))
        coloredLog("Integration missmatch errors. Make sure you have those applications in your destination workspace", "BgRed")
        throw new Error("Integration missmatch errors")
    }
    return warnings
}

async function syncElements(data, workspaceData, iApp) {
    for (elementType of Object.keys(data)) {

        if (INTEGRATION_ELEMENTS[elementType].exportable === false) continue
        
        for (element of data[elementType]) {

            // Cleanup 
            delete element.integrationId

            destinationElement = matchElement(element, workspaceData)

            if (destinationElement) {
               
                if (!hasParent(element) || (elementIsCustomized(element) && hasParent(element))) {
                    // Update the element without parent OR the integration-specific element that should be customized 
                    await iApp[INTEGRATION_ELEMENTS[elementType].element](destinationElement.id).put(element)
                    coloredLog(`Updated ${element.integrationKey || "universal"} ${INTEGRATION_ELEMENTS[elementType].element} ${element.key}`, "Cyan")

                } else if (hasParent(element)) {
                    // Reset Integration-specific element if it has universal parent
                    try {
                        await iApp[INTEGRATION_ELEMENTS[elementType].element](destinationElement.id).reset()
                    } catch (error) {
                        console.log(destinationElement, element)
                        throw error
                    }
                    coloredLog(`Customization reset ${element.integrationKey || "universal"} ${INTEGRATION_ELEMENTS[elementType].element} ${element.key}`, "Magenta")
                } else {
                    coloredLog(`Corrupted. Migrate Manually ${element.integrationKey || "universal"} ${INTEGRATION_ELEMENTS[elementType].element} ${element.key}`, "Red")
                }

            } else {
                // Create the element

                if (hasParent(element)) {
                    
                    await iApp[INTEGRATION_ELEMENTS[elementType].element]({ key: element.key }).apply([ element.integrationKey ])
                    if (elementIsCustomized(element)) {
                        try {
                            await iApp[INTEGRATION_ELEMENTS[elementType].element]({key: element.key, integrationKey: element.integrationKey}).put(element)
                        } catch (error) {
                            console.log(destinationElement, element)
                            throw error
                        
                        }
                        coloredLog(`Applied & Customized ${element.integrationKey || "universal"} ${INTEGRATION_ELEMENTS[elementType].element} ${element.key}`, "Green")
                    } else {
                        coloredLog(`Applied universal ${INTEGRATION_ELEMENTS[elementType].element} ${element.key} to ${element.integrationKey} `, "Green")
                    }

                } else {
                    try {
                        if (element.integrationKey) {
                            delete element.integration
                            element.integrationId = workspaceData.integrations.find((item) => item.key == element.integrationKey).id
                        }
                        await iApp[elementType].create(element)
                    } catch (error) {
                        console.log(hasParent(element),element.integrationKey, element)
                        throw error
                    }
                    coloredLog(`Created universal ${INTEGRATION_ELEMENTS[elementType].element} ${element.key}`, "Green")
                }
            }
            //console.log(elementType, element.key, element.integrationKey || "universal")
        }
    }
}


function elementIsCustomized(element) {
    return element.integrationKey && (element.customized || element.isCustomized)
}

function matchElement(element, workspaceData) {
    const matchedElements = workspaceData[elementType]?.filter((item) => (item.key == element.key && (item.integrationKey == element.integrationKey)))
    if (matchedElements.length > 1) {
        throw new Error(`More than one ${element.integrationKey || "universal"} ${elementType} with key ${element.key} found in the workspace`)
    }
    if (matchedElements.length == 1) {
        return matchedElements[0]
    }
    return
}
module.exports = { importPackage }