const { IntegrationAppClient } = require('@integration-app/sdk')
const { generateAccessToken, getWorkspaceData, coloredLog} = require('../src/util.js')
const dotenv = require('dotenv');
const fs = require('fs');

async function exportPackage() {
    dotenv.config();
    const token = generateAccessToken(process.env.EXPORT_WORKSPACE_KEY, process.env.EXPORT_WORKSPACE_SECRET)
    const iApp = new IntegrationAppClient({ token: token })
    
    workspaceData = await getWorkspaceData(iApp)
    // Write the data to a file process.argv[3]
    fs.writeFile(process.argv[3], JSON.stringify(workspaceData), (err) => {
        if (err) {
            console.error(err);
            return;
        }
        coloredLog(`Data written to ${process.argv[3]} successfully.`,"BgGreen");
    });
}
    


module.exports = { exportPackage }
