// this is the thing injected into the page
const provider = {
  isEstus: true,
  isConnected: false,

  connect() {
    window.postMessage(
      {
        target: "estus-content",
        type: "CONNECT",
      },
      "*",
    )
  },

  disconnect() {
    console.log("disconnect() called")
  },
}

  ; (window as any).estus = provider

console.log("Estus Provider loaded")
