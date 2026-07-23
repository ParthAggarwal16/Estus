// content script
const script = document.createElement("script")

script.src = chrome.runtime.getURL("dist/provider.js")
script.type = "text/javascript";

(document.head || document.documentElement).appendChild(script)

script.onload = () => script.remove()

window.addEventListener("message", (event) => {
  if (event.source !== window) return

  if (event.data?.target !== "estus-content") return

  console.log("Content received:", event.data)

  chrome.runtime.sendMessage(event.data)
})

console.log("[Estus] Provider injected")
