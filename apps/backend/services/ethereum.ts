import { JsonRpcProvider, formatEther, Wallet } from "ethers"

export async function getBalance(rpcUrl: string, address: string) {
  const provider = new JsonRpcProvider(rpcUrl)

  const balance = await provider.getBalance(address)

  return { wei: balance.toString(), eth: formatEther(balance) }
}

export async function sendTransaction(rpcUrl: string, privateKey: string, to: string, amountWei: bigint) {

  const provider = new JsonRpcProvider(rpcUrl)
  const wallet = new Wallet(privateKey, provider)

  const tx = await wallet.sendTransaction({ to, value: amountWei })
  const receipt = await tx.wait()
  return { hash: tx.hash, blockNumber: receipt?.blockNumber, status: receipt?.status === 1 ? "success" : "failed" }
}

export async function getTransactions(_rpcUrl: string, _address: string) {

  throw new Error("ethereum transaction history requires an indexer such as etherscan, alchemy or infura. json rpc alone cannot fetch address history")

}
