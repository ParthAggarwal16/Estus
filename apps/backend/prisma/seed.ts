import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const solana = await prisma.network.findFirst({
    where: {
      type: "SOLANA",
    },
  })

  if (!solana) {
    throw new Error("Solana network not found")
  }

  await prisma.token.createMany({
    data: [
      {
        symbol: "SOL",
        name: "Solana",
        mintAddress: "So11111111111111111111111111111111111111112",
        networkId: solana.id,
      },
      {
        symbol: "USDC",
        name: "USD Coin",
        mintAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        networkId: solana.id,
      },
      {
        symbol: "USDT",
        name: "Tether USD",
        mintAddress: "Es9vMFrzaCERmJfrF4H2tD1f6YewsG32KzBSSMSmc5Qw",
        networkId: solana.id,
      },
      {
        symbol: "BONK",
        name: "Bonk",
        mintAddress: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
        networkId: solana.id,
      },
      {
        symbol: "JUP",
        name: "Jupiter",
        mintAddress: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
        networkId: solana.id,
      },
      {
        symbol: "PYTH",
        name: "Pyth Network",
        mintAddress: "HZ1JovNiVvGrGNiiYvJRLmM8mbMT6M3DYe1kzJmTn9J",
        networkId: solana.id,
      },
    ],
  })

  console.log("Seed complete.")
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })
