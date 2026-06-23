import crypto from "crypto"

const SALT_LENGTH = 16
const IV_LENGTH = 12
const ALGORITHM = "aes-256-gcm"
const KEY_LENGTH = 32
const ITERATIONS = 100_000

export function encryptPrivateKey(privateKey: string, password: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH)
  const iv = crypto.randomBytes(IV_LENGTH)

  const key = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, "sha256")

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(privateKey, "utf8", "hex")
  encrypted += cipher.final("hex")

  const authtag = cipher.getAuthTag()

  return [salt.toString("hex"), iv.toString("hex"), authtag.toString("hex"), encrypted].join(":")

}

export function decryptPrivateKey(encryptedData: string, password: string): string {
  const parts = encryptedData.split(":")
  if (parts.length !== 4) {
    throw new Error("Invalid encryption data format")
  }

  const [saltHex, ivHex, authtagHex, encrypted] = parts as [string, string, string, string]

  const key = crypto.pbkdf2Sync(password, Buffer.from(saltHex, "hex"), ITERATIONS, KEY_LENGTH, "sha256")

  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"))
}
