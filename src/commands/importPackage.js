const fs = require('fs');
const { INTEGRATION_ELEMENTS, baseExportCleanup } = require('../integrationElements.js')
const { IntegrationAppClient } = require('@integration-app/sdk')
const { generateAccessToken, getWorkspaceData, hasParent, splitWorkspaceData, coloredLog } = require('../util.js')
const dotenv = require('dotenv');
const path = require('path');
const YAML = require('js-yaml');
const FormData = require('form-data');
const { connect } = require('http2');

const basePath = path.join(__dirname, "../../dist")


async function importPackage() {
    dotenv.config();
    
    const token = generateAccessToken(process.env.IMPORT_WORKSPACE_KEY, process.env.IMPORT_WORKSPACE_SECRET)
    const options = { token }
    if (process.env.IMPORT_API_URI) options.apiUri = process.env.IMPORT_API_URI
    const iApp = new IntegrationAppClient(options)

    const warnings = [] // Collect all warnings and display them at the end
    

    const workspaceData = await getWorkspaceData(iApp, logs = "minified")
    // Matching imported data with existing data
    
    
    //TODO: Add check if custom connector already exists, when UUID is available

    const data = {}
    const elementTypes = fs.readdirSync(basePath)
    coloredLog(`Loading Files`, "BgBlue")

    for (elementType of elementTypes) { 
        data[elementType] = []
        console.log(path.join(basePath, elementType))
        const elementKeys = fs.readdirSync(path.join(basePath, elementType))
        for (elementKey of elementKeys) {
            const elements = fs.readdirSync(path.join(basePath, elementType, elementKey))
            for (element of elements) {
                // check if element is directory or file
                const elementPath = path.join(basePath, elementType, elementKey, element)
                
                if (fs.statSync(elementPath).isDirectory()) {
                    data[elementType].push(YAML.load(fs.readFileSync(path.join(elementPath, `${element}.yaml`), 'utf8')))
                } else {
                    data[elementType].push(YAML.load(fs.readFileSync(path.join(elementPath), 'utf8')))
                }
                coloredLog(`Loaded ${elementPath}`, "Green")

            }
        }
    }

    const { universalElements, integrationSpecificElements } = splitWorkspaceData(data)

    
    warnings.push(...await syncIntegrations(data, workspaceData, iApp))
    
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


    // Display warnings
    coloredLog("Warnings        ", "BgYellow")
    console.group()
    for (warning of warnings) {
        coloredLog(warning, "Yellow")
    }
    console.groupEnd()
    coloredLog(`Data written successfully.`, "BgGreen");

}

async function syncIntegrations(sourceData, destinationData, iApp, warnings = []) {
    coloredLog("Matching imported integrations and connectors with existing ones", "BgBlue")

    const connectorFromStore = await iApp.get("connectors")
    const sourceConnectors = {}

    for (connector of sourceData.connectors) {
        if (!sourceConnectors[connector.id]) { sourceConnectors[connector.id] = {} }
        sourceConnectors[connector.id][connector.version] = connector
    }
    
    const connectorsMapping = {}
    for (connectorKey of Object.keys(sourceConnectors)) {
        const versions = Object.keys(sourceConnectors[connectorKey]).sort()
        //console.log(versions)
        let connectorId = versions[0].Id

        for (let version of versions) {

            const connector = sourceConnectors[connectorKey][version]


            if (connector.appUuid && connectorFromStore.find((item) => item.appUuid == connector.appUuid)) {
                connectorsMapping[connector.id] = connectorFromStore.find((item) => item.appUuid == connector.appUuid).id
                // coloredLog(`Matched ${connector.name} ${connector.appUuid}`, "Blue")
            } else {
                delete connector.baseUri
                if (!connectorsMapping[connector.id]) {
                    const resp = await iApp.post("connectors", {
                        ...connector,
                        workspaceId: process.env.IMPORT_WORKSPACE_ID
                    })
                    connectorsMapping[connector.id] = resp.id
                }

                // Read the file synchronously into a buffer
                const zipFilePath = path.join(basePath, "connectors", `${connector.name}_${connector.id}`, version, `${version}.zip`);
                const zipFileBuffer = fs.readFileSync(zipFilePath);

                // Create FormData
                const formData = new FormData();
                formData.append('file', zipFileBuffer, {
                    filename: `file.zip`, // Provide the filename option
                    contentType: 'application/zip' // Provide the content type
                });

                if (version != "development") {
                    formData.append('version', version);
                    formData.append('changelog', "Imported Version");

                    await iApp.post(`connectors/${connectorsMapping[connector.id]}/publish-version`, formData, {
                        headers: {
                            ...formData.getHeaders()
                        }
                    });
                   coloredLog(`Published ${connector.name} ${version}`, "Blue")

                } else { 
                    await iApp.post(`connectors/${connectorsMapping[connector.id]}/upload`, formData, {
                        headers: {
                            ...formData.getHeaders()
                        }
                    });
                    coloredLog(`Uploaded ${connector.name} ${version}`, "Blue")

                }

            }

        }

    }

    const integrationMissmatchErrors = []
    for (let integration of sourceData.integrations) {
        let matchedIntegration = destinationData.integrations.find((item) => item.key == integration.key)
        connectorsMapping[integration.connectorId]
        let versions = await iApp.get(`/connectors/${connectorsMapping[integration.connectorId]}/versions`)

        if (!matchedIntegration) {
            // Try to create the integration
            if (integration.workspaceId) {
                // TODO: add support for custom connectors, when we add uuid to them
            } else {
                try {
                    const integrationResp = await iApp.integrations.create({ connectorId: connectorsMapping[integration.connectorId], key: integration.key, name: integration.name })
                    const versionId = versions.find((item) => item.version == integration.connectorVersion)?.id
                    if (versionId) {
                        await iApp.post(`integrations/${integrationResp.id}/switch-connector-version`, { connectorVersionId: versionId })
                    }

                coloredLog(`Created ${integration.key} ${integration.name}`, "Green")
            } catch (error) {
                console.log(error)
                // Failed to create, usually because of the connector is custom and not available in the destination workspace
                integrationMissmatchErrors.push(integration)
                }
            }
        } else {
            if (integration.connectorVersion && (integration.connectorVersion != matchedIntegration.connectorVersion)) {
                await iApp.post(`integrations/${matchedIntegration.id}/switch-connector-version`, { connectorVersionId: versions.find((item) => item.version == integration.connectorVersion).id })
                coloredLog(`Switched to correct version ${integration.key} ${integration.name}`, "Blue")

            } else {
                coloredLog(`Matched ${integration.key} ${integration.name}`, "Blue")
            }
        }

    }
    if (integrationMissmatchErrors.length > 0) {
        console.table(integrationMissmatchErrors.map((item) => { return { key: item.key, name: item.name } }))
        coloredLog("Integration missmatch errors. Make sure you have those applications in your destination workspace", "BgRed")
        throw new Error("Integration missmatch errors")
    }
    
    return warnings
}

async function getWorkspaceId(iApp) {
    const workspaces = await iApp.get("workspaces")
    return workspaces.find((item) => item.key == process.env.IMPORT_WORKSPACE_KEY).id

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
                    try {
                        await iApp[INTEGRATION_ELEMENTS[elementType].element]({ key: element.key }).apply([element.integrationKey])
                    } catch (error) {
                        try {
                            await iApp[INTEGRATION_ELEMENTS[elementType].element]({ key: element.key, integrationKey: element.integrationKey }).put(element)
                        } catch (error) {
                            await iApp[INTEGRATION_ELEMENTS[elementType].elements].create({ ...element, integrationId: workspaceData.integrations.find((item) => item.key == element.integrationKey).id })
                        }
                    }
                    if (elementIsCustomized(element)) {
                        try {
                            await iApp[INTEGRATION_ELEMENTS[elementType].element]({ key: element.key, integrationKey: element.integrationKey }).put(element)
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
                        console.log(hasParent(element), element.integrationKey, element)
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