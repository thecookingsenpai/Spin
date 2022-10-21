// NOTE Loading modules (app and BrowserWindow) for main and rederer
const {app, BrowserWindow} = require('electron')
const { Worker } = require('worker_threads')

// SECTION Subroutine management

// NOTE Loading subprocesses and starting the listeners
subroutines = {}

function start_subroutine(name, path, data) {
  if (name in subroutines) {
    console.log("[x] Subroutine already exists")
    alert("Error launching the subroutine: subroutine already exists")
    return
  }
  subroutines[name] = new Worker(path, { workerData: data });
  subroutines[name].on('message', (message) => {
    // On message load it
    let j_message = JSON.parse(message.toString('utf8'))
    console.log("[*] Message from " + name)
    console.log(j_message)
    // Extract the message id
    let msg_id = j_message.id
    console.log("ID: " + msg_id)
    var result;
    var message;
    // Send it to the parser
    var packed = parseMessage(j_message, name)
    result = packed[0]
    message = packed[1]
    console.log(result)
    console.log(message)
    // Manage errors
    if (result == "error") {
      console.log("[x] Error in " + name + ".js")
      alert("Error in the subroutine " + name + " at " + path + ": " + message)
    }
    else {
      console.log("[+] Message from " + name + " parsed")
    }
    // Send the response back solving promises if any
    solved = null
    if (message.toString().includes("Promise")) {
      // In case of promise, solve it and send it
      message.then((value) => {
        console.log("Promise resolved: " + value)
        let payload = '{ "type": "response", "id": "' + msg_id + '", "result": "' + result + '", "message": "' + value + '"}'
        console.log("[*] Sending response: " + JSON.stringify(payload))
        subroutines[name].postMessage(JSON.stringify(payload))
      })
    } else {
      // In case of normal message, send it
      let payload = '{ "type": "response", "id": "' + msg_id + '", "result": "' + result + '", "message": "' + message + '"}'
      console.log("[*] Sending response: " + JSON.stringify(payload))
      subroutines[name].postMessage(JSON.stringify(payload))
    }
  })
}

// NOTE Parsing the response
function parseMessage (j_response, sender) {
      // Schema being like:
      /* 
      {
      "type": "render|info|error",
      [...] (properties of the above)
      }
      */
  console.log("Parsing message from " + sender + ": " + JSON.stringify(j_response))
  let type = j_response.type
  let id = j_response.id
  if (type == "error") {
    console.log("[x] Error in " + sender + ".js")
    console.log(j_response.message)
    return ["error", j_response.message]
  }
  // NOTE Rendering an element (overwriting it if exists)
  else if (type == "render") {
    let element = j_response.element
    console.log("[*] Rendering")
    // Loading element to replace
    console.log("Element: " + element)
    // Normalizing and loading the HTML to insert
    let newHTML = j_response.html.replace("'", '"')
    console.log("HTML: " + newHTML)
    // Executing the rendering command
    let renderCmd = "document.getElementById('" + j_response.element + "').innerHTML += '" + newHTML + "'"
    console.log(renderCmd)
    mainWindow.webContents.executeJavaScript(renderCmd)
    console.log("[+] Rendered")
    return ["ok", "Rendered"]
  }
  // NOTE Changing style of an existing element
  else if (type == "style") {
    let element = j_response.element
    let property = j_response.property
    let value = j_response.value
    console.log("[*] Styling")
    // Loading element to replace
    console.log("Element: " + element)
    // Normalizing and loading the HTML to insert
    let newProperty = j_response.property.replace("'", '"')
    console.log("Property: " + newProperty)
    // Executing the rendering command
    let renderCmd = "document.getElementById('" + element + "').style." + property + "='" + value + "'"
    console.log(renderCmd)
    mainWindow.webContents.executeJavaScript(renderCmd)
    console.log("[+] Styled")
    return ["ok", "Styled"]
  }
  // NOTE Executing a js command
  // REVIEW Remember to sanitize it
  else if (j_response.type == "exec") {
    let command = j_response.command
    console.log("[*] Executing")
    console.log(command)
    mainWindow.webContents.executeJavaScript(command + ";")
    console.log("[+] Executed")
    return ["ok", "Executed"]
  }
  // NOTE Getting an existing element
  else if (type == "get") {
    let element = j_response.element
    console.log("[*] Getting " + element + " for renderer")
    let cmd = "document.getElementById('" + element + "');"
    console.log(cmd)
    let response = mainWindow.webContents.executeJavaScript("document.getElementById('" + element + "').innerHTML;")
    console.log("[+] Got " + element + " for renderer")
    console.log('[>] Returning ' + response)
    return ["ok", response]

                
  }
  else if (type == "info") {
    console.log("[i] Info from " + sender)
    console.log(j_response.message)
    return ["ok", "Info"]
  }

}

// !SECTION Subroutine management

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
// Create a new BrowserWindow when `app` is ready
// NOTE This is just a definition which will be executed later
function createWindow () {

  mainWindow = new BrowserWindow({
    width: 1280, height: 720,
    webPreferences: {
      // --- !! IMPORTANT !! ---
      // Disable 'contextIsolation' to allow 'nodeIntegration'
      // 'contextIsolation' defaults to "true" as from Electron v12
      contextIsolation: false,
      nodeIntegration: true
    }
  })


  // NOTE Load index.html into the new BrowserWindow
  mainWindow.loadFile('index.html')

  // Open DevTools - Remove for PRODUCTION!
  //mainWindow.webContents.openDevTools();

  // NOTE Listen for window being closed
  mainWindow.on('closed',  () => {
    mainWindow = null
  })

  // NOTE Once the window is loaded, start the subroutines
  // INFO: graphics subroutine is responsible for the loading of the graphics
  start_subroutine("template", "./worker_template.js", { })

}

// NOTE Listener for app ready that will execute the createWindow function
app.on('ready', createWindow)

// NOTE Quit when all windows are closed - (Not macOS - Darwin)
app.on('window-all-closed', () => {
  // also on mac
  app.quit()
})

// NOTE When app icon is clicked and app is running, (macOS) recreate the BrowserWindow
app.on('activate', () => {
  if (mainWindow === null) createWindow()
})
