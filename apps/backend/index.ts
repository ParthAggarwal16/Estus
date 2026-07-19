import express from "express"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcrypt"
import { encryptPrivateKey, decryptPrivateKey } from "./crypto/encryption"
import { deriveSolanaWallet, importSolanaPrivateKey, generateMnemonic } from "./crypto/solana"
import { validateMnemonic } from "bip39"
import { getNativeBalance, getTokenBalances, sendTransaction, getTransactions } from "./services/solana"
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js"
import { getSwapOrder, executeSwap, getSwapRoutes } from "./services/swap"
import { WebSocketServer } from "ws"
import type { WebSocket } from "ws"
import { stringify } from "querystring"
import { deriveEthereumWallet, walletFromPrivateKey } from "./crypto/ethereum"
import { getBalance, sendEthTransaction } from "./services/ethereum"
import { parseEther } from "ethers"

const prisma = new PrismaClient()

const app = express()

app.use(express.json())

let vaultUnlocked = false
let unlockedPassword: string | null = null

app.post("/vault/create", async (req, res) => {
  try {
    const { password } = req.body

    if (!password || typeof password !== "string") {
      return res.status(400).json({ error: "Password required" })
    }
    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({ error: "Invalid password length" })
    }

    const existingVault = await prisma.vault.findFirst()
    if (existingVault) {
      return res.status(409).json({
        error: "Vault already exists",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const vault = await prisma.vault.create({
      data: {
        passwordHash,
      },
    })
    return res.status(201).json({
      vaultId: vault.id,
      message: "Vault created",
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Internal server error" })
  }
})

app.get("/vault/status", async (req, res) => {
  try {
    const existingVault = await prisma.vault.findFirst();
    return res.status(200).json({
      "exists": !!existingVault,
      "unlocked": vaultUnlocked
    })
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Internal server error",
    })
  }
})

app.post("/vault/unlock", async (req, res) => {
  try {
    const { password } = req.body ?? {}
    if (!password || typeof password !== "string") {
      return res.status(400).json({ error: "Password required" })
    }
    const vault = await prisma.vault.findFirst()
    if (!vault) {
      return res.status(400).json({ error: "Vault not found" })
    }
    const isValidPassowrd = await bcrypt.compare(password, vault.passwordHash)
    if (!isValidPassowrd) {
      return res.status(401).json({ error: "InValid Password" })

    }
    vaultUnlocked = true
    unlockedPassword = password

    return res.status(200).json({
      message: "Vault unlocked"
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({
      error: "Internal Server Error"
    })
  }
})

app.post("/vault/lock", async (req, res) => {
  try {
    const vault = await prisma.vault.findFirst()
    if (!vault) {
      return res.status(400).json({ error: "Vault not found" })
    }
    if (!vaultUnlocked) {
      return res.status(400).json({ error: "Vault already locked" })
    }
    vaultUnlocked = false
    unlockedPassword = null

    return res.status(200).json({ message: "Vault locked" })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Internal Server Error" })
  }

})

app.post("/account/create", async (req, res) => {

  try {
    const vault = await prisma.vault.findFirst()
    if (!vault) {
      return res.status(404).json({ error: "Vault not found" })
    }
    if (!vaultUnlocked) {
      return res.status(401).json({ error: "Vault is locked" })
    }

    const { name } = req.body
    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "Account name required" })
    }

    const existingAccount = await prisma.account.findFirst({ where: { vaultId: vault.id, name } })
    if (existingAccount) {
      return res.status(409).json({ error: "Account already exists" })
    }

    const account = await prisma.account.create({
      data: {
        vaultId: vault.id,
        name
      }
    })
    return res.status(200).json({
      accountId: account.id,
      name: account.name,
      message: "Account created"
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Internal Server Error" })
  }
})

app.get("/accounts", async (req, res) => {
  try {
    const vault = await prisma.vault.findFirst()
    if (!vault) {
      return res.status(404).json({ error: "Vault doesnt exist" })
    }
    if (!vaultUnlocked) {
      return res.status(401).json({ error: "Vault is locked" })
    }

    const accounts = await prisma.account.findMany({
      where: { vaultId: vault.id },
      orderBy: { createdAt: "asc" }
    })

    return res.status(200).json({ accounts })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Internal Server Error" })
  }
})

app.get("/accounts/:id", async (req, res) => {
  try {
    if (!vaultUnlocked) {
      return res.status(401).json({ error: "Vault is locked" })
    }

    const { id } = req.params
    const account = await prisma.account.findUnique({ where: { id } })

    if (!account) {
      return res.status(404).json({ error: "Acciount not found" })
    }
    return res.status(200).json(account)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Internal Server Error" })
  }
})

app.delete("/accounts/:id", async (req, res) => {
  try {
    if (!vaultUnlocked) {
      return res.status(401).json({ error: "Vault is locked" })
    }

    const { id } = req.params
    const account = await prisma.account.findUnique({ where: { id } })

    if (!account) {
      return res.status(404).json({ error: "Account doesn't exist" })
    }
    await prisma.account.delete({ where: { id } })
    return res.status(200).json({ message: "Account deleted successfully" })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Internal server error" })
  }
})

app.post("/accounts/:id/addresses/create", async (req, res) => {
  try {
    if (!vaultUnlocked) {
      return res.status(401).json({ error: "Vault is locked" })
    }

    const { id: accountId } = req.params
    const { networkId } = req.body

    if (!networkId) {
      return res.status(400).json({ error: "Network id is required" })
    }

    const account = await prisma.account.findUnique({ where: { id: accountId }, include: { seedPhrase: true } })

    if (!account) {
      return res.status(404).json({ error: "Account not found" })
    }

    const network = await prisma.network.findUnique({ where: { id: networkId } })

    if (!network) {
      return res.status(404).json({ error: "Network not found" })
    }

    let mnemonic: string
    if (account.seedPhrase) {
      mnemonic = decryptPrivateKey(
        account.seedPhrase.encryptedMnemonic,
        unlockedPassword!
      )
    } else {
      mnemonic = generateMnemonic()

      await prisma.seedPhrase.create({ data: { accountId, encryptedMnemonic: encryptPrivateKey(mnemonic, unlockedPassword!) } })
    }

    const walletIndex = await prisma.address.count({ where: { accountId } })

    let publicKey: string
    let privateKey: string
    let derivationPath: string | null = null

    switch (network.type) {
      case "SOLANA": {
        const wallet = deriveSolanaWallet(mnemonic, walletIndex)

        publicKey = wallet.publicKey
        privateKey = wallet.privateKey
        derivationPath = wallet.derivationPath
        break
      }
      case "ETHEREUM": {
        const wallet = deriveEthereumWallet(mnemonic, walletIndex)
        publicKey = wallet.address,
          privateKey = wallet.privateKey,
          derivationPath = wallet.path
        break
      }

      default:
        return res.status(400).json({
          error: `${network.type} not supported yet`,
        })
    }

    const encryptedKey = encryptPrivateKey(privateKey, unlockedPassword!)

    const address = await prisma.address.create({
      data: {
        publicKey,
        encryptedKey,
        derivationPath,
        accountId,
        networkId,
      },
    })

    return res.status(201).json({ message: "Address created", address })

  } catch (err) {
    console.error(err);

    return res.status(500).json({ error: "Internal Server Error" })
  }
})

app.get("/accounts/:id/addresses", async (req, res) => {
  try {
    if (!vaultUnlocked) {
      return res.status(401).json({ error: "Vault is lcoked" })
    }
    const { id: accountId } = req.params
    const account = await prisma.account.findUnique({ where: { id: accountId } })
    if (!account) {
      return res.status(400).json({ error: "Account doesn't exist" })
    }

    const addresses = await prisma.address.findMany({ where: { accountId } })

    return res.status(200).json({ addresses })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Internal Server Error" })
  }
})

app.get("/addresses/:id", async (req, res) => {
  try {
    if (!vaultUnlocked) {
      return res.status(401).json({ error: "Vault is locked" })
    }

    const { id } = req.params;
    const address = await prisma.address.findUnique({ where: { id } })

    if (!address) {
      return res.status(404).json({ error: "Address not found" })
    }

    return res.status(200).json(address)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Internal Server Error" })
  }
})

app.get("/addresses/:id/export", async (req, res) => {
  try {
    if (!vaultUnlocked || !unlockedPassword) {
      return res.status(401).json({ error: "Vault is Locked" })
    }

    const { id } = req.params
    const address = await prisma.address.findUnique({ where: { id } })
    if (!address) {
      return res.status(400).json({ error: "No Address found" })
    }

    const privateKey = decryptPrivateKey(address.encryptedKey, unlockedPassword)
    return res.status(200).json({ publicKey: address.publicKey, privateKey })
  } catch (err) {
    console.log(err)
    return res.status(500).json({ error: "Internal Server Error" })
  }
})

app.post("/accounts/:id/addresses/import", async (req, res) => {
  try {
    if (!vaultUnlocked) {
      return res.status(401).json({ error: "Vault is Locked" })
    }

    const { id: accountId } = req.params

    const { networkId, privateKey, mnemonic } = req.body

    if (!networkId) {
      return res.status(400).json({ error: "Network id required" })
    }

    if (!privateKey && !mnemonic) {
      return res.status(400).json({ error: "Provide privateKey or mnemonic" })
    }

    if (privateKey && mnemonic) {
      return res.status(400).json({ error: "Provide only one import method" })
    }

    const account = await prisma.account.findUnique({ where: { id: accountId }, include: { seedPhrase: true } })

    if (!account) {
      return res.status(404).json({ error: "Account not found" })
    }

    const network = await prisma.network.findUnique({ where: { id: networkId } })

    if (!network) {
      return res.status(404).json({ error: "Network not found" })
    }

    let publicKey: string
    let encryptedKey: string
    let derivationPath: string | null = null

    if (privateKey) {
      switch (network.type) {
        case "SOLANA": {
          const wallet = importSolanaPrivateKey(privateKey)
          publicKey = wallet.publicKey
          encryptedKey = encryptPrivateKey(wallet.privateKey, unlockedPassword!)

          break
        }

        case "ETHEREUM": {
          const wallet = walletFromPrivateKey(privateKey)
          publicKey = wallet.address
          encryptedKey = encryptPrivateKey(wallet.privateKey, unlockedPassword!)
          break
        }

        default:
          return res.status(400).json({ error: `${network.type} not supported yet` })
      }
    } else {
      if (!validateMnemonic(mnemonic)) {
        return res.status(400).json({ error: "Invalid mnemonic" })
      }

      let accountIndex = 0

      if (account.seedPhrase) {
        accountIndex = await prisma.address.count({
          where: { accountId, derivationPath: { not: null } },
        })
      } else {
        await prisma.seedPhrase.create({
          data: { accountId, encryptedMnemonic: encryptPrivateKey(mnemonic, unlockedPassword!) },
        })
      }

      switch (network.type) {
        case "SOLANA": {
          const wallet = deriveSolanaWallet(mnemonic, accountIndex)

          publicKey = wallet.publicKey
          encryptedKey = encryptPrivateKey(wallet.privateKey, unlockedPassword!)
          derivationPath = wallet.derivationPath

          break
        }

        case "ETHEREUM": {
          const wallet = deriveEthereumWallet(mnemonic, accountIndex)
          publicKey = wallet.address
          encryptedKey = encryptPrivateKey(wallet.privateKey, unlockedPassword!)
          break
        }

        default:
          return res.status(400).json({ error: `${network.type} not supported yet` })
      }

    }

    const existingAddress = await prisma.address.findFirst({ where: { publicKey, networkId } })

    if (existingAddress) {
      return res.status(409).json({ error: "Address already exists" })
    }

    const address = await prisma.address.create({
      data: { publicKey, encryptedKey, derivationPath, accountId, networkId }
    })

    return res.status(201).json({ message: "Address Imported", address })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Internal Server Error" })
  }
})

app.patch("/accounts/:id", async (req, res) => {
  try {
    if (!vaultUnlocked) {
      return res.status(401).json({ error: "Vault is locked" })
    }

    const { id } = req.params
    const { name } = req.body

    if (!name || typeof (name) !== "string") {
      return res.status(400).json({ error: "Account name required" })
    }

    const account = await prisma.account.findUnique({ where: { id } })
    if (!account) {
      return res.status(404).json({ error: "Account not found" })
    }

    const existingAccount = await prisma.account.findFirst({ where: { vaultId: account.vaultId, name, NOT: { id } } })

    if (existingAccount) {
      return res.status(409).json({ error: "Account already exists" })
    }

    const updatedAccount = await prisma.account.update({ where: { id }, data: { name } })

    return res.status(200).json({ message: "Account Updated", account: updatedAccount })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Internal server Error" })
  }
})

app.delete("/addresses/:id", async (req, res) => {
  try {
    if (!vaultUnlocked) {
      return res.status(401).json({ error: "Vault is Locked" })
    }

    const { id } = req.params
    const address = await prisma.address.findUnique({ where: { id } })
    if (!address) {
      return res.status(400).json({ error: "Address doesn't exist" })
    }

    await prisma.address.delete({ where: { id } })

    return res.status(200).json({ message: "Account deleted successfully" })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Internal Server Error" })
  }
})

app.get("/networks", async (req, res) => {
  try {
    const networks = await prisma.network.findMany({ orderBy: { name: "asc" } })
    return res.status(200).json({ networks })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Internal Server Error" })
  }
})

app.get("/networks/:id", async (req, res) => {

  try {
    const { id } = req.params
    const network = await prisma.network.findUnique({ where: { id } })
    if (!network) {
      return res.status(404).json({ error: "Network not found" })
    }
    return res.status(200).json(network)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Internal Server Error" })

  }

})

app.get("/networks/:id/tokens", async (req, res) => {

  try {
    const { id: networkId } = req.params

    const network = await prisma.network.findUnique({ where: { id: networkId } })

    if (!network) {
      return res.status(404).json({ error: "Network Not found" })
    }

    const tokens = await prisma.token.findMany({ where: { networkId }, orderBy: { name: "asc" } })
    return res.status(200).json({ tokens })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Internal Server Error" })
  }
})

app.get("/tokens/search", async (req, res) => {

  try {
    const q = req.query.q
    if (!q || typeof (q) !== "string") {
      return res.status(400).json({ error: "Search query Required" })
    }

    const tokens = await prisma.token.findMany({
      where: {
        OR: [{ symbol: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }]
      }
    })

    return res.status(200).json({ tokens })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Internal Server Error" })
  }
})

app.get("/tokens/:id", async (req, res) => {

  try {
    const { id } = req.params
    const token = await prisma.token.findUnique({ where: { id } })
    if (!token) {
      return res.status(404).json({ error: "Token not found" })
    }

    return res.status(200).json(token)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Internal Server Error" })

  }
})

app.post("/vault/reveal-secret", async (req, res) => {

  try {
    if (!vaultUnlocked || !unlockedPassword) {
      return res.status(401).json({ error: "Vault is Locked" })
    }

    const vault = await prisma.vault.findFirst()
    if (!vault) {
      return res.status(404).json({ error: "Vault not found" })
    }

    const account = await prisma.account.findFirst({
      where: { seedPhrase: { isNot: null } },
      include: { seedPhrase: true },
    })

    if (!account?.seedPhrase) {
      return res.status(404).json({ error: "Account not found" })
    }

    const mnemonic = decryptPrivateKey(account.seedPhrase.encryptedMnemonic, unlockedPassword)
    return res.status(200).json({ mnemonic })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Internal Server Error" })
  }

})

app.get("/addresses/:id/balance", async (req, res) => {

  try {
    const { id } = req.params
    const address = await prisma.address.findUnique({ where: { id }, include: { network: true } })
    if (!address) {
      return res.status(404).json({ error: "Address not found" })
    }

    switch (address.network.type) {
      case "SOLANA": {
        const balance = await getNativeBalance(address.network.rpcURL, address.publicKey)
        return res.status(200).json({
          address: address.publicKey,
          network: address.network.type,
          ...balance,
        })
      }

      case "ETHEREUM": {
        const balance = await getBalance(address.network.rpcURL, address.publicKey)
        return res.status(200).json({
          address: address.publicKey,
          network: address.network.type,
          ...balance,
        })
      }
      default:
        return res.status(400).json({ error: `${address.network.type} not supported yet` })
    }
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Internal Server Error" })
  }
})

app.get("/addresses/:id/balances", async (req, res) => {

  try {
    const { id } = req.params
    const address = await prisma.address.findUnique({ where: { id }, include: { network: true } })
    if (!address) {
      return res.status(404).json({ error: "Address not found" })
    }

    switch (address.network.type) {
      case "SOLANA": {
        const nativeBalance = await getNativeBalance(address.network.rpcURL, address.publicKey)
        const tokenBalances = await getTokenBalances(address.network.rpcURL, address.publicKey)
        const tokens = await prisma.token.findMany({
          where: {
            mintAddress: { in: tokenBalances.map((t) => t.mintAddress) },
          }
        })

        const balances = tokenBalances.map((balance) => {
          const token = tokens.find((t) => t.mintAddress === balance.mintAddress)
          return {
            symbol: token?.symbol ?? "UNKNOWN",
            name: token?.name ?? "Unknown Token",
            mintAddress: balance.mintAddress,
            amount: balance.amount,
          }
        })
        return res.status(200).json({
          address: address.publicKey,
          network: address.network.type,
          native: nativeBalance,
          tokens: balances,
        })
      }

      case "ETHEREUM": {
        const nativeBalance = await getBalance(address.network.rpcURL, address.publicKey)
        return res.status(200).json({
          address: address.publicKey,
          network: address.network.type,
          native: nativeBalance,
          tokens: [],
        })
      }

      default:
        return res.status(400).json({ error: `${address.network.type} not supported yet` })
    }
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Internal Server Error" })
  }
})

app.post("/transactions/send", async (req, res) => {

  try {
    if (!vaultUnlocked || !unlockedPassword) {
      return res.status(401).json({ error: "Vault is Locked" })
    }

    const { fromAddressId, toPublicKey, amount } = req.body

    if (!fromAddressId || !toPublicKey || typeof amount !== "number") {
      return res.status(400).json({ error: "fromAddressId, toPublicKey and amount are required" })
    }

    const address = await prisma.address.findUnique({ where: { id: fromAddressId }, include: { network: true } })
    if (!address) {
      return res.status(404).json({ error: "Address not found" })
    }

    const privateKey = decryptPrivateKey(address.encryptedKey, unlockedPassword)

    switch (address.network.type) {
      case "SOLANA": {
        const lamports = Math.round(amount * LAMPORTS_PER_SOL)

        const tx = await sendTransaction(address.network.rpcURL, privateKey, toPublicKey, lamports)

        return res.status(200).json(tx)
      }

      case "ETHEREUM": {
        const wei = parseEther(amount.toString())
        const tx = await sendEthTransaction(address.network.rpcURL, privateKey, toPublicKey, wei)
        return res.status(200).json(tx)
      }

      default:
        return res.status(400).json({
          error: `${address.network.type} not supported yet`,
        })
    }
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Internal Server Error" })
  }

})

app.get("/addresses/:id/transactions", async (req, res) => {
  try {
    const { id } = req.params

    const address = await prisma.address.findUnique({ where: { id }, include: { network: true } })

    if (!address) {
      return res.status(404).json({ error: "Address not found" })
    }

    if (address.network.type !== "SOLANA") {
      return res.status(400).json({ error: "Network not supported yet" })
    }

    const transactions = await getTransactions(address.network.rpcURL, address.publicKey)

    return res.status(200).json({ address: address.publicKey, transactions })

  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Internal Server Error" })
  }
})

app.get("/accounts/:id/transactions", async (req, res) => {
  try {
    if (!vaultUnlocked || !unlockedPassword) {
      return res.status(401).json({ error: "Vault is Locked" })
    }

    const { id: accountId } = req.params
    const account = await prisma.account.findUnique({ where: { id: accountId } })

    if (!account) {
      return res.status(404).json({ error: "Account not found" })
    }

    const addresses = await prisma.address.findMany({ where: { accountId }, include: { network: true } })

    let transactions: any[] = []

    for (const address of addresses) {
      switch (address.network.type) {
        case "SOLANA": {
          const txs = await getTransactions(address.network.rpcURL, address.publicKey)

          transactions.push(
            ...txs.map((tx) => ({
              address: address.publicKey,
              network: address.network.type,
              ...tx,
            }))
          )
          break
        }
        default:
          break
      }
    }
    transactions.sort((a, b) => b.timestamp - a.timestamp)
    return res.status(200).json({ accountId, transactions })

  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Internal Server Error" })
  }
})

app.get("/transactions/:signature", async (req, res) => {

  try {
    if (!vaultUnlocked) {
      return res.status(400).json({ error: "Vault is Locked" })
    }

    const { signature } = req.params
    const addresses = await prisma.address.findMany({ include: { network: true } })

    for (const address of addresses) {
      switch (address.network.type) {
        case "SOLANA": {
          const transactions = await getTransactions(address.network.rpcURL, address.publicKey)
          const transaction = transactions.find((tx) => tx.signature === signature)

          if (transaction) {
            return res.status(200).json({ address: address.publicKey, network: address.network.type, ...transaction })
          }
          break
        }
        default: break
      }
    }
    return res.status(400).json({ error: "transaction not found" })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Internal Server Error" })
  }
})

app.post("/swap/quote", async (req, res) => {

  try {
    const { inputMint, outputMint, amount, addressId } = req.body
    if (!inputMint || !outputMint || !addressId || typeof amount !== "number") {
      return res.status(400).json({ error: "addressId, inputMint, outputMint and amount are required" })
    }

    const address = await prisma.address.findUnique({ where: { id: addressId } })
    if (!address) {
      return res.status(404).json({ error: "Address not found" })
    }

    const order = await getSwapOrder(inputMint, outputMint, amount, address.publicKey)
    return res.json(order)

  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Internal Server Error" })
  }
})

app.post("/swap/execute", async (req, res) => {
  try {
    if (!vaultUnlocked || !unlockedPassword) {
      return res.status(401).json({ error: "Vault is locked" })
    }

    const { addressId, requestId, signedTransaction, inputTokenId, outputTokenId, inputAmount, outputAmount } = req.body

    if (!addressId || !requestId || !signedTransaction || !inputTokenId || !outputTokenId || typeof inputAmount !== "number" || typeof outputAmount !== "number") {
      return res.status(400).json({ error: "Missing required fields" })
    }

    const address = await prisma.address.findUnique({ where: { id: addressId } })

    if (!address) {
      return res.status(404).json({ error: "Address not found" })
    }

    const result = await executeSwap(signedTransaction, requestId)

    if (result.status !== "Success") {
      return res.status(400).json(result)
    }

    if (!result.signature) {
      throw new Error("Swap succeeded but no transaction signature was returned")
    }

    const swap = await prisma.swap.create({
      data: { addressId, inputTokenId, outputTokenId, inputAmount, outputAmount, transactionHash: result.signature },
    })

    return res.status(201).json({ message: "Swap executed", swap, execution: result })
  } catch (err) {
    console.error(err)

    return res.status(500).json({ error: "Internal Server Error" })
  }
})

app.get("/swap/routes", async (req, res) => {
  try {
    const inputMint = req.query.inputMint as string
    const outputMint = req.query.outputMint as string
    const amount = Number(req.query.amount)

    if (!inputMint || !outputMint || Number.isNaN(amount)) {
      return res.status(400).json({ error: "inputMint, outputMint and amount are required" })
    }

    const routes = await getSwapRoutes(inputMint, outputMint, amount)

    return res.json({
      inputMint: routes.inputMint,
      outputMint: routes.outputMint,
      inAmount: routes.inAmount,
      outAmount: routes.outAmount,
      swapMode: routes.swapMode,
      slippageBps: routes.slippageBps,
      priceImpact: routes.priceImpact,
      router: routes.router,
      routePlan: routes.routePlan,
    })
  } catch (err) {
    console.error(err)

    return res.status(500).json({
      error: "Internal Server Error",
    })
  }
})

const PORT = 3000
const server = app.listen(PORT, () => console.log(`Server started on http://localhost:${PORT}`))

const balanceWss = new WebSocketServer({ noServer: true })

balanceWss.on("connection", (ws: WebSocket) => {
  console.log("balance websocket connected")

  let subscriptionId: number | null = null
  let connection: Connection | null = null

  ws.on("message", async (message) => {

    try {
      const { addressId } = JSON.parse(message.toString())
      const address = await prisma.address.findUnique({ where: { id: addressId } })

      if (!address) {
        ws.send(JSON.stringify({ error: "Address not found" }))
        return
      }
      const network = await prisma.network.findUnique({ where: { id: address.networkId } })
      if (!network) {
        ws.send(JSON.stringify({ error: "Network not found" }))
        return
      }

      connection = new Connection(network.rpcURL)
      subscriptionId = connection.onAccountChange(
        new PublicKey(address.publicKey),
        (accountInfo) => {
          ws.send(JSON.stringify({ addressId, lamports: accountInfo.lamports, sol: accountInfo.lamports / LAMPORTS_PER_SOL }))
        }
      )
    } catch (err) {
      console.error(err)
      ws.send(JSON.stringify({ error: "Invalid Request" }))
    }
  })
  ws.on("close", async () => {
    console.log("websocket server disconnected")
    if (connection && subscriptionId !== null) {
      await connection.removeAccountChangeListener(subscriptionId)
    }
  })
})

// const transactionWss = new WebSocketServer({ noServer: true })
// transactionWss.on("connection", (ws: WebSocket) => {
//   console.log("transactions websocket connected")
//
//   let connection: Connection | null = null
//   let subscriptionId: number | null = null
//
//   ws.on("message", async (message) => {
//
//     const { addressId } = JSON.parse(message.toString())
//     const address = await prisma.address.findUnique({ where: { id: addressId }, include: { network: true } })
//     if (!address) {
//       ws.send(JSON.stringify({ error: "Address not found" }))
//       return
//     }
//     connection = new Connection(address.network.rpcURL)
//     subscriptionId = connection.onLogs(
//       new PublicKey(address.publicKey),
//       async (logs) => {
//         console.log("logs callback fired")
//
//         console.log(logs)
//         const transaction = await getTransaction(address.network.rpcURL, logs.signature)
//         if (transaction) {
//           ws.send(JSON.stringify({ address: address.publicKey, network: address.network.type, ...transaction }))
//         }
//       }, "confirmed"
//     )
//   })
//   ws.on("close", async () => {
//     console.log("transactions websocket disconnected")
//     if (connection && subscriptionId !== null) {
//       await connection.removeOnLogsListener(subscriptionId)
//     }
//   })
// })

// the thing is that jupiter doesnt provide anything that can auto push qoute updates so we have to resort to 
// polling, something i can do in order to make it a bit more efficient is to make it so that
// client connect -- sends(inputMint, outputMint, amount) -- backend starts polling every 2 secs --
// if qoute changed -- push --- client edits amount, stops timer, -- start new timer -- client disconnects -- new timer
// lastQoute.amount -- newQoute.amount  -- if same -- dont send -- if not -- send

const swapQuoteWss = new WebSocketServer({ noServer: true })
swapQuoteWss.on("connection", (ws: WebSocket) => {
  console.log("swap qoute websocket connected")

  let poller: NodeJS.Timeout | null = null
  let lastQoute = ""

  ws.on("message", async (message) => {
    try {
      const { addressId, inputMint, outputMint, amount } = JSON.parse(message.toString())
      if (!addressId || !inputMint || !outputMint || typeof amount !== "number") {
        ws.send(JSON.stringify({ error: "Invalid Request" }))
        return
      }

      const lamports = Math.round(amount * LAMPORTS_PER_SOL)

      const address = await prisma.address.findUnique({ where: { id: addressId } })
      if (!address) {
        ws.send(JSON.stringify({ error: "Address not found" }))
        return
      }

      if (poller) {
        clearInterval(poller)
      }
      lastQoute = ""
      const updateQoute = async () => {

        try {
          const qoute = await getSwapOrder(inputMint, outputMint, lamports, address.publicKey)
          const serialized = JSON.stringify(qoute)

          if (serialized !== lastQoute) {
            lastQoute = serialized
            ws.send(serialized)
          }
        } catch (err) {
          console.error(err)
          ws.send(stringify({ error: "Failed to fetch quote" }))
        }
      }

      await updateQoute()
      poller = setInterval(() => {
        void updateQoute()
      }, 2000)
    } catch (err) {
      console.error(err)
      ws.send(JSON.stringify({ error: "Invalid request" }))
    }
  })

  ws.on("close", () => {
    console.log("swap qoute websocket disconnected")
    if (poller) {
      clearInterval(poller)
      poller = null
    }
  })

})

server.on("upgrade", (req, socket, head) => {
  const pathname = req.url?.split("?")[0]

  switch (pathname) {
    case "/ws/balance":
      balanceWss.handleUpgrade(req, socket, head, (ws) => balanceWss.emit("connection", ws, req))
      break

    // case "/ws/transactions":
    //   transactionWss.handleUpgrade(req, socket, head, (ws) => transactionWss.emit("connection", ws, req))
    //   break

    case "/ws/swap-quotes":
      swapQuoteWss.handleUpgrade(req, socket, head, (ws) => swapQuoteWss.emit("connection", ws, req))
      break

    default:
      socket.destroy()
  }
})
