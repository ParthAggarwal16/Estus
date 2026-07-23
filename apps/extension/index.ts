console.log("Estus background started")

chrome.runtime.onMessage.addListener((message) => {
  console.log("Background received:", message)
})
//background
