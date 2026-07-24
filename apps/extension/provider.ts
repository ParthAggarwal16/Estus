// this is the thing injected into the page
const provider = {
  isEstus: true,
  isConnected: false,

  async connect() {

    return new Promise((resolve) => {
      const listener = (event: MessageEvent) => {
        if (event.source !== window)
          return
        if (event.data?.target !== "estus-provider")
          return
        if (event.data?.type !== "CONNECT_RESPONSE")
          return

        window.removeEventListener("message", listener)
        provider.isConnected = true
        resolve({ publicKey: event.data.publicKey })
      }

      window.addEventListener("message", listener)
      window.postMessage({ target: "estus-content", type: "CONNECT" }, "*")
    })
  },

  disconnect() {
    provider.isConnected = false
  },
}

  ; (window as any).estus = provider

console.log("Estus Provider loaded")
