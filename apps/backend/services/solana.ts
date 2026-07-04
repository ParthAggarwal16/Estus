import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js"

const connections = new Map<string, Connection>()

export function getConnection(rpcUrl: string) {
  let connection = connections.get(rpcUrl)

  if (!connection) {
    connection = new Connection(rpcUrl, "confirmed")
    connections.set(rpcUrl, connection)
  }

  return connection
}

export async function getNativeBalance(rpcUrl: string, address: string) {
  const connection = getConnection(rpcUrl)

  const balance = await connection.getBalance(new PublicKey(address))

  return {
    lamports: balance,
    sol: balance / LAMPORTS_PER_SOL,
  }
}
