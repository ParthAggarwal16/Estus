const JUPITER_OUOTE_API_KEY = "https://lite-api.jup.ag/swap/v1/quote"

export async function getSwapQoute(inputMint: string, outputMint: string, amount: number) {
  const params = new URLSearchParams({ inputMint, outputMint, amount: amount.toString(), slippageBps: "50" })

  const response = await fetch(`${JUPITER_OUOTE_API_KEY}?${params}`)
  if (!response.ok) {
    throw new Error("Failed to fetch the swap qoute")
  }

  return await response.json()
}
