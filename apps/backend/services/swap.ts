const BASE_URL = "https://api.jup.ag/swap/v2"

const API_KEY = process.env.JUPITER_API_KEY!
export async function getSwapOrder(inputMint: string, outputMint: string, amount: number, taker: string) {
  const params = new URLSearchParams({ inputMint, outputMint, amount: amount.toString(), taker })

  const response = await fetch(`${BASE_URL}/order?${params}`, {
    headers: { "x-api-key": API_KEY },
  })

  if (!response.ok) {
    throw new Error(await response.text())
  }

  return await response.json()
}
