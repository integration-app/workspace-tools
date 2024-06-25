const { IntegrationAppClient } = require('@integration-app/sdk')
const { generateAccessToken, getWorkspaceData, coloredLog} = require('../util.js')
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path'); 
const YAML = require('js-yaml');

async function exportPackage() {
    dotenv.config();
    const token = generateAccessToken(process.env.EXPORT_WORKSPACE_KEY, process.env.EXPORT_WORKSPACE_SECRET)
    const options = { token }
    if (process.env.EXPORT_API_URI) options.apiUri = process.env.EXPORT_API_URI
    const iApp = new IntegrationAppClient(options)
    
    if (!process.argv[3]) {
        process.argv[3] = path.join(__dirname, '../../dist');
    }

    workspaceData = await getWorkspaceData(iApp)

    for (elementType of Object.keys(workspaceData)) {
        if (workspaceData[elementType].length > 0) {
            try {
                fs.readdirSync(process.argv[3])
            } catch (err) {
                fs.mkdirSync(process.argv[3], { recursive: true });
            }

            for (element of workspaceData[elementType]) {
                try {
                    fs.readdirSync(path.join(process.argv[3], elementType, `${element.key}`))
                } catch (err) {
                    fs.mkdirSync(path.join(process.argv[3], elementType, `${element.key}`), { recursive: true });
                }
                if (element.integration || element.integrationKey) {
                    const integrationKey = element.integration ? element.integration.key : element.integrationKey;
                    try {
                        fs.readdirSync(path.join(process.argv[3], elementType, `${element.key}`, `${integrationKey}`))
                    } catch (err) {
                        fs.mkdirSync(path.join(process.argv[3], elementType, `${element.key}`, `${integrationKey}`), { recursive: true });
                    }
                    fs.writeFileSync(path.join(process.argv[3], elementType, `${element.key}`, `${integrationKey}`, `${integrationKey}.yaml`), YAML.dump(element));
                } else {
                    fs.writeFileSync(path.join(process.argv[3], elementType, element.key, `${element.key}.yaml`), YAML.dump(element));
                }
            }

        }
    }
    coloredLog(`Data written to ${process.argv[3]} successfully.`, "BgGreen");

    /*// Write the data to a file process.argv[3]
    fs.writeFile(process.argv[3], JSON.stringify(workspaceData), (err) => {
        if (err) {
            console.error(err);
            return;
        }
        coloredLog(`Data written to ${process.argv[3]} successfully.`,"BgGreen");
    });*/
}
    


module.exports = { exportPackage }
