// content script
const script = document.createElement("script")

script.src = chrome.runtime.getURL("dist/provider.js")
script.type = "text/javascript";

(document.head || document.documentElement).appendChild(script)

script.onload = () => script.remove()

console.log("[Estus] Provider injected")
