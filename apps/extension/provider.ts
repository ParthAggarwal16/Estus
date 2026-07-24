// this is the thing injected into the page
const provider = {
  isEstus: true,
  isConnected: false,

  async connect() {
    const id = crypto.randomUUID()

    return new Promise((resolve) => {
      const listener = (event: MessageEvent) => {
        if (event.source !== window)
          return
        if (event.data?.target !== "estus-page")
          return
        if (event.data?.id !== id)
          return

        window.removeEventListener("message", listener)
        provider.isConnected = true
        resolve(event.data.response)
      }

      window.addEventListener("message", listener)
      window.postMessage({ target: "estus-content", type: "CONNECT", id }, "*")
    })
  },

  disconnect() {
    provider.isConnected = false
    console.log("disconnect() called")
  },
}

  ; (window as any).estus = provider

console.log("Estus Provider loaded")
