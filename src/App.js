import { IntegrationAppProvider, useIntegrationApp } from "@integration-app/react";
import './App.css';
import { useState, useEffect } from "react";
import ReactJson from '@dinuac/react-json-view'
import * as jose from 'jose'


const ELEMENTS = ["appDataSchemas", "appEventTypes", "dataLinkTables", "fieldMappings", "flows"]


function App() {

  const [originalToken, setOriginalToken] = useState()
  const [copyToken, setCopyToken] = useState()
  const [data, setData] = useState({})
  return (
    <>
      {originalToken}
      <CredentialsInput title="Export Workspace" setToken={setOriginalToken}></CredentialsInput>
      <CredentialsInput title="Import Workspace" setToken={setCopyToken}></CredentialsInput>
      {copyToken}


      <div className="mockup-window border bg-base-300 max-w-screen-xl container mx-auto">
        <div className="flex justify-center px-4 py-16 bg-base-200">
          <div>
            {(originalToken && copyToken) ? (
              <>
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
        {ELEMENTS.map((el) => {
          return (
            <label className="label cursor-pointer">
              <span className="label-text">{el}</span>
              <input type="checkbox" onChange={async () => {
                addToData((await iApp[el].find()).items, el)
              }} className="checkbox" />
            </label>
          )
        })}

      </div>


      <div className="mt-5 mb-5"> <ReactJson src={data} collapsed={true} name={false} /></div>
    </>
  )
}


function ImportData(props) {
  const data = props.data
  const iApp = useIntegrationApp();
  async function importData() {

    for (let element of ELEMENTS) {
      if (element in data) {
        for (let schema of data[element]) {
          iApp[element].create(schema)
        }
      }
    }

    alert("done")

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
    console.log(jwt)
    return jwt
  } catch {
    return ""
  }

}


function CredentialsInput(props) {
  const [key, setKey] = useState()
  const [secret, setSecret] = useState()

  return (
    <div className="form-control w-full max-w-xs">
      {key} {secret}
      <label className="label">
        <span className="label-text">{props.title} Secret</span>
      </label>
      <input type="text" placeholder="Type here" className="input input-bordered w-full max-w-xs" onChange={async (el) => { setSecret(el.target.value); props.setToken(await generateAccessToken(key, el.target.value)) }} />
      <label className="label">
      </label>
      <label className="label">
        <span className="label-text">{props.title} Key</span>
      </label>
      <input type="text" placeholder="Type here" className="input input-bordered w-full max-w-xs" onChange={async (el) => { setKey(el.target.value); props.setToken(await generateAccessToken(el.target.value, secret)) }} />
      <label className="label">
      </label>
    </div>
  )
}