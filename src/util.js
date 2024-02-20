const jwt = require('jsonwebtoken')
const { INTEGRATION_ELEMENTS, baseExportCleanup } = require('../src/integrationElements.js')

async function getWorkspaceData(iApp, logs = "full") {
    const workspaceData = {}
    coloredLog("Getting workspace data", "BgBlue")

    const integrations = await iApp.integrations.findAll()
    workspaceData.integrations = integrations
    console.group();
    for (let element of Object.values(INTEGRATION_ELEMENTS)) {
        if (element.exportable === false) continue
        const elementEnteties = []
        coloredLog(`${element.elements}`,"Blue")
        // Get all universal elements
        const elements = await iApp[element.elements].findAll()
        elementEnteties.push(...elements.map((item) => { return (element.exportCleanup && element.exportCleanup(baseExportCleanup(item))) || baseExportCleanup(item) }))
        // Get all integration specific elements
        if (element.integrationSpecific) {
            for (let integration of integrations) {
                const integrationElements = await iApp[element.elements].findAll({ integrationId: integration.id })
                elementEnteties.push(...integrationElements.map((item) => {
                    item.integrationKey = integration.key
                    return (element.exportCleanup && element.exportCleanup(baseExportCleanup(item))) || baseExportCleanup(item)
                }))
            }
        }

        if (logs == "full") {
            console.group();
            console.table(elementEnteties.map((item) => { return { key: item.key, integrationKey: item.integrationKey, universal: !item.integrationKey } }).reduce((acc, item, idx) => {
                if (!acc) { acc = {} }
                if (!acc[item.key]) { acc[item.key] = {} }
                if (item.universal) { acc[item.key].universal = true }
                if (item.integrationKey) {
                    if (!acc[item.key].integrations) { acc[item.key].integrations = item.integrationKey } else {
                        acc[item.key].integrations += ` ${item.integrationKey}`
                    }
                }
                return acc

            }, {}))
            console.groupEnd();
        }
        workspaceData[element.elements] = elementEnteties

    }
    console.groupEnd();
    coloredLog("Workspace data retrieved successfully.","Green")
    return workspaceData
}

function generateAccessToken(key, secret) {

    const tokenData = {
        name: 'Workspace Import/Export Tool',
        isAdmin: true
    }

    const options = {
        issuer: key,
        // To prevent token from being used for too long
        expiresIn: 7200,
        // HS256 signing algorithm is used by default,
        // but we recommend to go with more secure option like HS512.
        algorithm: 'HS512',
    }

    return jwt.sign(tokenData, secret, options)
}

function splitWorkspaceData(data) {
    const universalElements = {}
    const integrationSpecificElements = {}
    for (let elementType of Object.keys(data)) {

        universalElements[elementType] = []
        integrationSpecificElements[elementType] = []

        if (INTEGRATION_ELEMENTS[elementType].integrationSpecific) {

            for (element of data[elementType]) {
                if (element.integrationKey || element.integration || element.integrationId) {
                    integrationSpecificElements[elementType].push(element)
                } else {
                    universalElements[elementType].push(element)
                }
            }
        } else {
            universalElements[elementType].push(...data[elementType])
        }
    }
    return { universalElements, integrationSpecificElements }
}

function hasParent(element) {
    return Object.keys(element).some((key) => (/universal.*Id/g).test(key) || (/parentId/g).test(key))
}

function coloredLog(message, color) {
    const colors = {
        "Reset": "\x1b[0m",
        "Bright": "\x1b[1m",
        "Dim": "\x1b[2m",
        "Underscore": "\x1b[4m",
        "Blink": "\x1b[5m",
        "Reverse": "\x1b[7m",
        "Hidden": "\x1b[8m",
        "Black": "\x1b[30m",
        "Red": "\x1b[31m",
        "Green": "\x1b[32m",
        "Yellow": "\x1b[33m",
        "Blue": "\x1b[34m",
        "Magenta": "\x1b[35m",
        "Cyan": "\x1b[36m",
        "White": "\x1b[37m",
        "Gray": "\x1b[90m",
        "BgBlack": "\x1b[40m",
        "BgRed": "\x1b[41m",
        "BgGreen": "\x1b[42m",
        "BgYellow": "\x1b[43m",
        "BgBlue": "\x1b[44m",
        "BgMagenta": "\x1b[45m",
        "BgCyan": "\x1b[46m",
        "BgWhite": "\x1b[47m",
        "BgGray": "\x1b[100m",
    }   
    console.log("\x1b[0m",`\x1b[${colors[color]}`, message, "\x1b[0m")
}

module.exports = { generateAccessToken, getWorkspaceData, splitWorkspaceData, hasParent, coloredLog }
