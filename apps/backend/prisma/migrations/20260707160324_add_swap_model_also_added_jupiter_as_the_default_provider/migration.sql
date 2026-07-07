-- CreateTable
CREATE TABLE "Swap" (
    "id" TEXT NOT NULL,
    "addressId" TEXT NOT NULL,
    "inputTokenId" TEXT NOT NULL,
    "outputTokenId" TEXT NOT NULL,
    "inputAmount" DECIMAL(36,9) NOT NULL,
    "outputAmount" DECIMAL(36,9) NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provider" TEXT NOT NULL DEFAULT 'JUPITER',

    CONSTRAINT "Swap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Swap_transactionHash_key" ON "Swap"("transactionHash");

-- AddForeignKey
ALTER TABLE "Swap" ADD CONSTRAINT "Swap_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
