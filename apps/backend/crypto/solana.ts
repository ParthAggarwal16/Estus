import { Keypair } from "@solana/web3.js"
import bs58 from "bs58"
import bip39 from "bip39"

export function generateSolanaKeypair() {
  const keypair = Keypair.generate()

  return {
    publicKey: keypair.publicKey.toBase58(),
    privateKey: bs58.encode(keypair.secretKey)
  }
}

export function importSolanaPrivateKey(privateKey: string) {
  const keypair = Keypair.fromSecretKey(bs58.decode(privateKey))
  return {
    publicKey: keypair.publicKey.toBase58(),
    privateKey
  }
}

export function importSolanaMnemonic(mnemonic: string) {
  const isValid = bip39.validateMnemonic(mnemonic)

  if (!isValid) {
    throw new Error("Invalid mnemonic")
  }

  const seed = bip39.mnemonicToSeedSync(mnemonic)

  const keypair = Keypair.fromSeed(seed.subarray(0, 32))

  return {
    publicKey: keypair.publicKey.toBase58(),
    privateKey: bs58.encode(keypair.secretKey)
  }
}
