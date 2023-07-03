import { IntegrationAppProvider, useIntegrationApp } from "@integration-app/react";
import './App.css';
import { useState, useEffect } from "react";
import ReactJson from '@dinuac/react-json-view'
import * as jose from 'jose'
import * as Button from '@integration-app/ui/Button'



const ELEMENTS = {
  "integrations": {
    element: "integration",
  },
  "appDataSchemas": {
    element: "appDataSchema",
  },
  "appEventTypes": {
    element: "appEventType",
  },
  "dataLinkTables": {
    element: "dataLinkTable",
  },
  "dataSources": {
    element: "dataSource",
  },
  "fieldMappings": {
    element: "fieldMapping",
  },
  "flows": {
    element: "flow",
  }
}

const INTEGRATION_SPECIFIC_ELEMENTS = [
  "dataSources",
  "fieldMappings",
  "flows"
]



function App() {

  const [originalToken, setOriginalToken] = useState()
  const [copyToken, setCopyToken] = useState()
  const [data, setData] = useState({})
  return (
    <>
      <CredentialsInput title="Export Workspace" setToken={setOriginalToken}></CredentialsInput>
      <CredentialsInput title="Import Workspace" setToken={setCopyToken}x></CredentialsInput>

      <div className="mockup-window border bg-base-300 max-w-screen-xl container mx-auto">
        <div className="flex justify-center px-4 py-16 bg-base-200">
          <div>
            {(originalToken && copyToken) ? (
              <>
                <Button
                  variant={'primary'}
                  size={'medium'}
                >
                   Button
                </Button>
                <IntegrationAppProvider token={originalToken} >
                  <ExportData data={data} setData={setData}></ExportData>
                </IntegrationAppProvider>

                <IntegrationAppProvider token={copyToken}>
                  <ImportData data={data} setData={setData}></ImportData>
                </IntegrationAppProvider>
              </>
            ) : (
              <>
                Set credentials to enable data transfer
              </>
            )}
          </div>
        </div>
      </div>

    </>
  );

}

export default App;



function ExportData(props) {
  const data = props.data
  const setData = props.setData
  const iApp = useIntegrationApp();
  async function addToData(exportedData, key) {
    if (data[key]) {
      const { [key]: drop, ...rest } = data
      setData(rest)
    } else {
      const items = exportedData
      setData({ ...data, [key]: items })
      data[key] = (await iApp.appDataSchemas.find()).items
    }
  }

  return (
    <>

      <div className="form-control">

        {Object.keys(ELEMENTS).map((el) => {
          return (
            <label className="label cursor-pointer">
              <span className="label-text">{el}</span>
              <input type="checkbox" onChange={async () => {
                addToData((await iApp[el].find()).items, el)
              }} className="checkbox" />
            </label>
          )
        })}
        {INTEGRATION_SPECIFIC_ELEMENTS.map((el) => {
              return (
                <label className="label cursor-pointer">
                  <span className="label-text">Integration-specific {el}</span>
                  <input type="checkbox" onChange={async () => {
                    const integrations = (await iApp.integrations.find()).items
                    for (let integration of integrations) {
                      addToData((await iApp[el].find({integrationKey:integration.key})).items, `${el}/${integration.key}`)
                    }
                    
                  }} className="checkbox" />
                </label>
              )
        })}

      </div>


      <div className="mt-5 mb-5"> <ReactJson src={data} collapsed={true} name={false} displayDataTypes={false} /></div>
    </>
  )
}

async function getDestinationWorkspaceData(elementTypes, iApp) {
  const dataPromises = []
  for (let elementType of elementTypes) {
    dataPromises.push(await iApp[elementType].find())
  } 
  const dataArr = await Promise.all(dataPromises)
  return Object.assign(...elementTypes.map((k, i) => ({ [k]: dataArr[i].items }))) 
}


function ImportData(props) {
  const data = props.data
  const iApp = useIntegrationApp();
  console.log(iApp)
  async function importData() {

    const destinationWorkspace = await getDestinationWorkspaceData(Object.keys(ELEMENTS), iApp)
    const jobs = []
    for (let elementType of Object.keys(ELEMENTS)) {
      if (elementType in data) {
        for (let element of data[elementType]) {
          
          delete element.id
          delete element.revision
          delete element.publishedRevision
          
          if (elementType == "fieldMappings") {
            delete element.dataSourceId
          }

          const existingElements = destinationWorkspace[elementType].filter((el) => el.key == element.key)
          
          if (existingElements.length > 0) {
            jobs.push(App[ELEMENTS[elementType].element](existingElements[0].id).put(element).then((el) => console.log("updated", elementType, element.key, el.id)))
          } else {
            jobs.push(iApp[elementType].create(element).then((el) => console.log("created", elementType, element.key, el.id)))
          }
        
        }
      }
    }
    
    await Promise.all(jobs).then(() => console.log("done"))
  }

  return (
    <>
      <button className="btn btn-active btn-primary" onClick={importData}>Import</button>
    </>
  )
}


async function generateAccessToken(key, secret) {
  try {
    const encodedSecret = new TextEncoder().encode(secret)
    const alg = 'HS256'

    const jwt = await new jose.SignJWT({
      name: 'Workspace Migrate Tool',
      isAdmin: true
    })
      .setProtectedHeader({ alg })
      .setIssuer(key)
      .setAudience('urn:example:audience')
      .setExpirationTime('2h')
      .sign(encodedSecret)
    return jwt
  } catch {
    return ""
  }

}


function CredentialsInput(props) {
  const [key, setKey] = useState()
  const [secret, setSecret] = useState()

  useEffect(() => {
    (async () => {
      setKey(window.localStorage.getItem(`${props.title}-key`))
      setSecret(window.localStorage.getItem(`${props.title}-secret`))
      props.setToken(await generateAccessToken(key, secret));
    })()
  },)

  return (
    <>
      <div className="form-control w-full max-w-xs">
        <label className="label">
          <span className="label-text">{props.title} Secret</span>
        </label>
        <input type="text" placeholder="Type here" defaultValue={secret} className="input input-bordered w-full max-w-xs" onChange={async (el) => { setSecret(el.target.value); props.setToken(await generateAccessToken(key, el.target.value)); window.localStorage.setItem(`${props.title}-secret`, el.target.value) }} />
        <label className="label">
        </label>
        <label className="label">
          <span className="label-text">{props.title} Key</span>
        </label>
        <input type="text" placeholder="Type here" defaultValue={key} className="input input-bordered w-full max-w-xs" onChange={async (el) => { setKey(el.target.value); props.setToken(await generateAccessToken(el.target.value, secret)); window.localStorage.setItem(`${props.title}-key`, el.target.value) }} />
        <label className="label">
        </label>
      </div>
    </>
  )
}