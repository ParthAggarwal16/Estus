// this is the thing injected into the page
const provider = {
  isEstus: true,
  isConnected: false,

  connect() {
    console.log("connect() called")
  },

  disconnect() {
    console.log("disconnect() called")
  },
}

  ; (window as any).estus = provider

console.log("Estus Provider loaded")
