const BASE_URL = "https://api.jup.ag/swap/v2"

const API_KEY = process.env.JUPITER_API_KEY!

export type ExecuteSwapResponse = {
  status: "Success" | "Failed"
  signature?: string
  slot?: string
  error?: string
  code: number
  totalInputAmount?: string
  totalOutputAmount?: string
  inputAmountResult?: string
  outputAmountResult?: string
}

type SwapRoutesResponse = {
  inputMint: string
  outputMint: string
  inAmount: string
  outAmount: string
  swapMode: string
  slippageBps: number
  priceImpact: number
  router: string
  routePlan: unknown[]
}

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

export async function executeSwap(signedTransaction: string, requestId: string): Promise<ExecuteSwapResponse> {
  const response = await fetch(`${BASE_URL}/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.JUPITER_API_KEY!,
    },
    body: JSON.stringify({ signedTransaction, requestId }),
  })

  const result = (await response.json()) as ExecuteSwapResponse

  return result
}

export async function getSwapRoutes(inputMint: string, outputMint: string, amount: number): Promise<SwapRoutesResponse> {
  const params = new URLSearchParams({ inputMint, outputMint, amount: amount.toString() })

  const response = await fetch(`${BASE_URL}/order?${params}`, {
    headers: { "x-api-key": process.env.JUPITER_API_KEY! },
  })

  if (!response.ok) {
    throw new Error("Failed to fetch swap routes")
  }

  return (await response.json()) as SwapRoutesResponse
}
