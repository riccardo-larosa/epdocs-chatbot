import { MongoClient, type Collection } from 'mongodb'
import bcrypt from 'bcryptjs'

export interface RfpUser {
  username: string
  passwordHash: string
  role: 'user' | 'admin'
  createdAt: Date
  active: boolean
}

export type PublicRfpUser = Omit<RfpUser, 'passwordHash'>

const COLLECTION_NAME = 'rfp_users'

async function getCollection(): Promise<Collection<RfpUser>> {
  const uri = process.env.MONGODB_CONNECTION_URI
  const dbName = process.env.MONGODB_DATABASE_NAME
  if (!uri || !dbName) {
    throw new Error('MongoDB connection environment variables are not set')
  }
  const client = new MongoClient(uri)
  await client.connect()
  return client.db(dbName).collection<RfpUser>(COLLECTION_NAME)
}

export async function findUserByUsername(username: string): Promise<RfpUser | null> {
  const col = await getCollection()
  return col.findOne({ username })
}

export async function verifyUserPassword(username: string, password: string): Promise<RfpUser | null> {
  const user = await findUserByUsername(username)
  if (!user || !user.active) return null
  const valid = await bcrypt.compare(password, user.passwordHash)
  return valid ? user : null
}

export async function createUser(
  username: string,
  password: string,
  role: 'user' | 'admin' = 'user'
): Promise<void> {
  const col = await getCollection()
  const existing = await col.findOne({ username })
  if (existing) {
    throw new Error(`User "${username}" already exists`)
  }
  const passwordHash = await bcrypt.hash(password, 12)
  await col.insertOne({
    username,
    passwordHash,
    role,
    createdAt: new Date(),
    active: true,
  })
}

export async function deleteUser(username: string): Promise<boolean> {
  const col = await getCollection()
  const result = await col.deleteOne({ username })
  return result.deletedCount > 0
}

export async function listUsers(): Promise<PublicRfpUser[]> {
  const col = await getCollection()
  const users = await col.find({}, { projection: { passwordHash: 0 } }).toArray()
  return users.map(({ _id: _ignored, ...u }) => u) as PublicRfpUser[]
}

export async function hasAnyAdmin(): Promise<boolean> {
  const col = await getCollection()
  const admin = await col.findOne({ role: 'admin' })
  return admin !== null
}
