console.log("Estus background started")

chrome.runtime.onMessage.addListener((message, sender) => {
  console.log("[Background]", message)

  if (message.type === "CONNECT") {
    chrome.tabs.sendMessage(sender.tab!.id!, {
      type: "CONNECT_RESPONSE",
      publicKey:
        "GB9GVaBsUkLXdhXzNPgaZBb8Xr7RQQk9GUzeNky6KQ3g",
    })
  }
})
//background
