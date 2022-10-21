const fs = require('fs');
const { parentPort } = require('worker_threads')


// NOTE Is possible to load data from the main process
// someVariable = workerData.someProperty

// SECTION Utilities

// NOTE Waiting list for the responses
let messages_awaiting = {}
let ready_responses = {}

// NOTE Allow generating a message id
String.prototype.hashCode = function() {
  var hash = 0,
    i, chr;
  if (this.length === 0) return hash;
  for (i = 0; i < this.length; i++) {
    chr = this.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString();
}

// NOTE Sending messages to the main process
function send_message(message, callback=null) {
  // Adding the message id to the message
  let _message = JSON.stringify(message)
  let msg_id = _message.hashCode()
  message["id"] = msg_id
  let string_message = JSON.stringify(message)
  // Creating a waiting structure for the response
  messages_awaiting[msg_id] = {
    "message": string_message,
    "timestamp": Date.now(),
    "response": null
  }
  // Sending as a string
  parentPort.postMessage(string_message)
  // Allowing the calling function to wait for the response
  if(callback) {
    check_response(msg_id, callback)
  } else {
    check_response(msg_id, react_to_response)
  }
  return msg_id
}

// NOTE Parsing the messages from the main process
function parse_message(message_str) {
  let message = JSON.parse(JSON.parse(message_str))
  console.log("Parsing: " + message_str)
  let type = message["type"]
  // Handle responses
  if (type == "response") {
    // Extracting the message id
    let id = message.id
    // Checking if the message is in the awaiting list
    if (messages_awaiting[id]) {
      // Updating the response if it is empty
      if (messages_awaiting[id].response == null) {
        messages_awaiting[id].response = JSON.stringify(message)
        console.log("[*] Response received for message " + id + ": " + messages_awaiting[id].response)
        // Setting the ready flag
        ready_responses[id].ready = true
        return
      } 
      else {
          console.log("[!] Response already received: " + id)
          return
      }
    } 
      else {
        console.log("[!] Message not found: " + id)
        return
    }
  } else {
    console.log("[!] Unknown message type: " + type)
    console.log(message)
    return
  }
}

// NOTE Checking if the response is ready and calling the callback function
function check_response(message_id, callback) {
  try {
    // Recalled response
    if(ready_responses[message_id].ready) {
        callback(message_id)
        return messages_awaiting[message_id].response
    } 
  }
  catch(err) {
    // Setting a listener for the response readiness
    ready_responses[message_id] = new Proxy( {ready: false}, { 
      set (target, prop, val) {
        console.log("[*] Response ready for message " + message_id)
        target[prop] = val;
        callback(message_id)
        return messages_awaiting[message_id].response
      }
    });
  }
}
    
// !SECTION Utilities

// SECTION Methods to operate on the page background
// REVIEW Remove the methods you won't use, as those are just examples

function setBackgroundStyle(property, value) {
  let payload = {
    "type": "style",
    "element": "background",
    "property": property,
    "value": value
  }
  let msg_id = send_message(payload)
  return msg_id
}


// !SECTION Background methods

// SECTION General low level method
// REVIEW Remove the methods you won't use, as those are just examples

function setStyle(element, property, value) {
  let cmd = property + ": " + value + ";"
  let payload = {
    "type": "style",
    "element": element,
    "property": property,
    "value": value
  }
  let msg_id = send_message(payload)
  return msg_id
}

function setHTML(element, html) {
  let payload = {
    "type": "render",
    "element": element,
    "html": html
  }
  let msg_id = send_message(payload)
  return msg_id
}


function getHTML(element) {
  let payload = {
    "type": "get",
    "element": element
  }
  let message_id = send_message(payload)
  return message_id
}

// !SECTION General low level method

// ANCHOR Example of reacting to a response
function react_to_response(message_id) {
  console.log("[reacted] Message id: " + message_id)
  let response = messages_awaiting[message_id].response
  console.log("[reacted] Response: " + response)
}

// ANCHOR Main process
// INFO Note that the main process is sync, so you can't use async/await here
function start () {
  console.log("[*] Starting worker")
  
  // NOTE Handling messages from the main process
  parentPort.on('message', (message) => {
    console.log('[+] Message from parent:', message);
      parse_message(message)
    });

  // INFO You can write whatever you want here
  // NOTE Examples
  let msg_id = setHTML("editable", "<h2>Hello world!</h2>")
  console.log("[-] Waiting for response " + msg_id)

}

// ANCHOR Entry pont
// REVIEW Remember to execute the included start() code if you change this
start()
