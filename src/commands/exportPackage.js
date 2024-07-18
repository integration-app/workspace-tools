const { IntegrationAppClient } = require('@integration-app/sdk')
const { generateAccessToken, getWorkspaceData, coloredLog} = require('../util.js')
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path'); 
const YAML = require('js-yaml');
const { default: axios } = require('axios');

async function exportPackage(options) {
    dotenv.config();
    const token = generateAccessToken(process.env.EXPORT_WORKSPACE_KEY, process.env.EXPORT_WORKSPACE_SECRET)
    const iAppConfig = { token }
    const outputPath = path.join(__dirname,"../../dist")
    if (process.env.EXPORT_API_URI) iAppConfig.apiUri = process.env.EXPORT_API_URI
    const iApp = new IntegrationAppClient(iAppConfig)

    // Download Custom Connectors
    const integrations = await iApp.integrations.findAll()
    
    for (integration of integrations) {

        const connector = await iApp.get(`connectors/${integration.connectorId}`, {
            version: integration.connectorVersion
        })
        const connectorVersion = integration.connectorVersion ?? "development"

        const connectorPath = path.join(outputPath, "connectors", `${connector.name}_${integration.connectorId}`, connectorVersion)

   
        fs.mkdirSync(connectorPath, { recursive: true });
        fs.writeFileSync(path.join(connectorPath, `${connectorVersion}.yaml`), YAML.dump({ ...connector, version: connectorVersion }))
        coloredLog(`Get ${connector.name}`, "Blue")


        if ((!fs.existsSync(path.join(connectorPath, `${connectorVersion}.zip`))) && (connector.workspaceId || options.allConnectors)) {
                const connectorData = await iApp.get(`connectors/${integration.connectorId}/download`, {
                    version: integration.connectorVersion
                }, {
                    responseType: "arraybuffer",
                    headers: {
                        "Accept": "application/zip"
                    },
                    timeout: 1000000,
                })

                fs.writeFileSync(path.join(connectorPath, `${connectorVersion}.zip`), connectorData)
                coloredLog(`Downloaded ${connectorVersion} version of ${connector.name}`, "Blue")

            }
            // TODO: refactor this, when we'll start returning version in connector response
    }


    workspaceData = await getWorkspaceData(iApp)

    for (elementType of Object.keys(workspaceData)) {
        if (workspaceData[elementType].length > 0) {
            try {
                fs.readdirSync(outputPath)
            } catch (err) {
                fs.mkdirSync(outputPath, { recursive: true });
            }

            for (element of workspaceData[elementType]) {
                try {
                    fs.readdirSync(path.join(outputPath, elementType, `${element.key}`))
                } catch (err) {
                    fs.mkdirSync(path.join(outputPath, elementType, `${element.key}`), { recursive: true });
                }
                if (element.integration || element.integrationKey) {
                    const integrationKey = element.integration ? element.integration.key : element.integrationKey;
                    try {
                        fs.readdirSync(path.join(outputPath, elementType, `${element.key}`, `${integrationKey}`))
                    } catch (err) {
                        fs.mkdirSync(path.join(outputPath, elementType, `${element.key}`, `${integrationKey}`), { recursive: true });
                    }
                    fs.writeFileSync(path.join(outputPath, elementType, `${element.key}`, `${integrationKey}`, `${integrationKey}.yaml`), YAML.dump(element));
                } else {
                    fs.writeFileSync(path.join(outputPath, elementType, element.key, `${element.key}.yaml`), YAML.dump(element));
                }
            }

        }
    }

    coloredLog(`Data written to ${outputPath} successfully.`, "BgGreen");

    /*// Write the data to a file outputPath
    fs.writeFile(outputPath, JSON.stringify(workspaceData), (err) => {
        if (err) {
            console.error(err);
            return;
        }
        coloredLog(`Data written to ${outputPath} successfully.`,"BgGreen");
    });*/
}
    


module.exports = { exportPackage }
