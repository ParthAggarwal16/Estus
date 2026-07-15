import { HDNodeWallet, Wallet } from "ethers"

export function deriveEthereumWallet(mnemonic: string, index: number) {
  const path = `m/44'/60'/0'/0/${index}`
  const wallet = HDNodeWallet.fromPhrase(mnemonic, undefined, path)
}
