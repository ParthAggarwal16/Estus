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

export async function getTokenBalances(rpcUrl: string, publicKey: string) {

  const connection = getConnection(rpcUrl)

  const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(new PublicKey(publicKey), { programId: TOKEN_PROGRAM_ID })

  return tokenAccounts.value.map(({ account }) => {
    const info = account.data.parsed.info;
    const tokenAmount = info.tokenAmount;

    return {
      mintAddress: info.mint,
      amount: tokenAmount.uiAmount,
      decimals: tokenAmount.decimals,
      rawAmount: tokenAmount.amount,
    }
  })

}
