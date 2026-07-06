import { Connection, PublicKey, LAMPORTS_PER_SOL, Keypair, Transaction, SystemProgram, sendAndConfirmTransaction } from "@solana/web3.js"
import bs58 from "bs58"

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

  return { lamports: balance, sol: balance / LAMPORTS_PER_SOL }
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

export async function sendTransaction(rpcUrl: string, fromPrivateKey: string, toPublicKey: string, lamports: number) {

  const connection = getConnection(rpcUrl)

  const sender = Keypair.fromSecretKey(bs58.decode(fromPrivateKey))
  const recipeint = new PublicKey(toPublicKey)

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: sender.publicKey,
      toPubkey: recipeint,
      lamports
    })
  )

  const signature = await sendAndConfirmTransaction(connection, transaction, [sender])

  return { signature }
}

//gonna be honest, took the help of a clanker since i couldnt get it even after like 8hrs of trying, sorry
export async function getTransactions(rpcUrl: string, publicKey: string) {

  const connection = new Connection(rpcUrl)
  const signatures = await connection.getSignaturesForAddress(new PublicKey(publicKey), { limit: 20 })

  const transactions = await Promise.all(signatures.map(async (signatureInfo) => {
    const tx = await connection.getParsedTransaction(
      signatureInfo.signature, { maxSupportedTransactionVersion: 0 },
    )

    return {
      signature: signatureInfo.signature,
      slot: signatureInfo.slot,
      timestamp: signatureInfo.blockTime,
      status: signatureInfo.err ? "failed" : "success",
      fee: tx?.meta?.fee ?? 0,
      transaction: tx,
    }
  })
  )
  return transactions
}

