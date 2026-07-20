import { JsonRpcProvider, formatEther, Wallet, Contract, formatUnits } from "ethers"

export async function getBalance(rpcUrl: string, address: string) {
  const provider = new JsonRpcProvider(rpcUrl)

  const balance = await provider.getBalance(address)

  return { wei: balance.toString(), eth: formatEther(balance) }
}

export async function sendEthTransaction(rpcUrl: string, privateKey: string, to: string, amountWei: bigint) {

  const provider = new JsonRpcProvider(rpcUrl)
  const wallet = new Wallet(privateKey, provider)

  const tx = await wallet.sendTransaction({ to, value: amountWei })
  const receipt = await tx.wait()
  return { hash: tx.hash, blockNumber: receipt?.blockNumber, status: receipt?.status === 1 ? "success" : "failed" }
}

export async function getTransactions(_rpcUrl: string, _address: string) {

  throw new Error("ethereum transaction history requires an indexer such as etherscan, alchemy or infura. json rpc alone cannot fetch address history")

}

export async function getTransaction(rpcUrl: string, signature: string) {

  const provider = new JsonRpcProvider(rpcUrl)
  const tx = await provider.getTransaction(signature)

  if (!tx) {
    return null
  }

  const receipt = await provider.getTransactionReceipt(signature)
  return {
    hash: tx.hash,
    from: tx.from,
    to: tx.to,
    value: formatEther(tx.value),
    gasLimit: tx.gasLimit.toString(),
    gasPrice: tx.gasPrice?.toString(),
    nonce: tx.nonce,
    blockNumber: tx.blockNumber,
    status:
      receipt?.status === 1
        ? "success"
        : receipt?.status === 0
          ? "failed"
          : "pending",
  }
}

type ERC20Token = { symbol: string, name: string, mintAddress: string, decimals: number; }
const ERC20_ABI = ["function balanceOf(address owner) view returns (uint256)"]

export async function getTokenBalances(rpcUrl: string, walletAddress: string, tokens: ERC20Token[]) {

  const provider = new JsonRpcProvider(rpcUrl)
  const balances = await Promise.all(
    tokens.map(async (token) => {
      const contract = new Contract(token.mintAddress, ERC20_ABI, provider) as Contract & {
        balanceOf(address: string): Promise<bigint>
      }

      const rawBalance = await contract.balanceOf(walletAddress)
      return {
        symbol: token.symbol,
        name: token.name,
        mintAddress: token.mintAddress,
        amount: formatUnits(rawBalance, token.decimals),
      }
    })
  )
  return balances.filter((token) => parseFloat(token.amount) > 0)
}
