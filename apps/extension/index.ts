console.log("Estus background started")

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log("Background received:", message)

  switch (message.type) {
    case "CONNECT":
      sendResponse({ success: true, publicKey: "DemoPublicKey123" })
      break
  }

  return true
})
//background
