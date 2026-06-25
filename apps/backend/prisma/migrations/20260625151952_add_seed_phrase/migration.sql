-- CreateTable
CREATE TABLE "SeedPhrase" (
    "id" TEXT NOT NULL,
    "encryptedMnemonic" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeedPhrase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SeedPhrase_accountId_key" ON "SeedPhrase"("accountId");

-- AddForeignKey
ALTER TABLE "SeedPhrase" ADD CONSTRAINT "SeedPhrase_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
