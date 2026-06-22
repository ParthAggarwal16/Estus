import { Keypair } from "@solana/web3.js"
import bs58 from "bs58"

export function generateSolanaKeypair() {
  const keypair = Keypair.generate()

  return {
    publicKey: keypair.publicKey.toBase58(),
    privateKey: bs58.encode(keypair.secretKey)
  }
}

