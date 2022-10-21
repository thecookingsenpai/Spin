const fs = require('fs');
const { parentPort } = require('worker_threads')

// NOTE Is possible to load data from the main process
// someVariable = workerData.someProperty

// SECTION Utilities

// NOTE Waiting list for the responses
let messages_awaiting = {}

// NOTE Sleep method
// REVIEW This is a CPU intensive method, use with caution or better don't use it
function sleep(delay) {
  var start = new Date().getTime();
  while (new Date().getTime() < start + delay);
}

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
  return hash;
}

// NOTE Sending messages to the main process
function send_message(message) {
  // Adding the message id to the message
  let msg_id = string_message.hashCode()
  message["id"] = msg_id
  // Sending as a string
  let string_message = JSON.stringify(message)
  parentPort.postMessage(string_message)
  // Creating a waiting structure for the response
  messages_awaiting[msg_id] = {
    "message": string_message,
    "timestamp": Date.now(),
    "response": null
  }
  // Allowing the calling function to wait for the response
  return msg_id
}

// NOTE Parsing the messages from the main process
function parse_message(message) {
  console.log(message)
  // Handle responses
  if (message.type == "response") {
    // Extracting the message id
    let id = message.id
    // Checking if the message is in the awaiting list
    if (messages_awaiting[id]) {
      // Updating the response if it is empty
      if (messages_awaiting[id].response == null) {
        messages_awaiting[id].response = JSON.stringify(message)
      } 
      else {
          console.log("[!] Response already received: " + id)
      }
    } 
      else {
        console.log("[!] Message not found: " + id)
    }
  }
}


// NOTE Blocking structure waiting for the response
function waitForResponse(msg_id, timeout) {
  let start = Date.now()
  let now = Date.now()
  // Wait for the message being in the waiting list
  while(!messages_awaiting[msg_id]) {
    sleep(100)
    // Timeout check
    now = Date.now()
    if (now - start > timeout) {
      return false, "timeout"
    }
  }
  // Wait for the response
  while(messages_awaiting[msg_id].response == null) {
    sleep(100)
    // Timeout check
    now = Date.now()
    if (now - start > timeout) {
      return false, "timeout"
    }
  }
  // Return the response
  return true, messages_awaiting[msg_id].response
}

// !SECTION Utilities

// SECTION Methods to operate on the page background
// REVIEW Remove the methods you won't use, as those are just examples

function setBackgroundImage(imagefile) {
    // NOTE Setting a new background image over existing one
    let cmd = "background-image: url('" + imagefile + "');"
    let payload = {
        "type": "style",
        "property": cmd,
        "element": "background"
    }
    let msg_id = send_message(payload)
    return msg_id
}

function setBackgroundStyle(property, value) {
  let cmd = property + ": " + value + ";"
  let payload = {
    "type": "style",
    "property": cmd,
    "element": "background"
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
    "property": cmd,
    "element": element
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

// ANCHOR Main process
// INFO Note that the main process is sync, so you can't use async/await here
function start () {
  
  // NOTE Handling messages from the main process
  parentPort.on('message', (message) => {
    let j_message = JSON.parse(message.toString('utf8'))
    parse_message(j_message)
  });

  // INFO You can write whatever you want here

}

// ANCHOR Entry pont
// REVIEW Remember to execute the included start() code if you change this
start()
