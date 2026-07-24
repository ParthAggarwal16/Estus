// content script
const script = document.createElement("script")

script.src = chrome.runtime.getURL("dist/provider.js")
script.type = "text/javascript"

  ; (document.head || document.documentElement).appendChild(script)

script.onload = () => script.remove()

window.addEventListener("message", (event) => {
  if (event.source !== window) return
  if (event.data?.target !== "estus-content") return

  chrome.runtime.sendMessage(event.data)
})

chrome.runtime.onMessage.addListener((message) => {
  window.postMessage(
    {
      target: "estus-provider",
      ...message,
    },
    "*"
  )
})

console.log("[Estus] Provider injected")
