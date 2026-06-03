import { PrismaClient }  from '@prisma/client'
import { PrismaPg }      from '@prisma/adapter-pg'
import { Pool }          from 'pg'
import 'dotenv/config'

declare global {
  var __prisma: PrismaClient | undefined
}

const pool    = new Pool({ connectionString: process.env.DATABASE_URL! })
const adapter = new PrismaPg(pool)

export const prisma = global.__prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma
}

export const connectDB = async (): Promise<void> => {
  try {
    await prisma.$connect()
    console.log('✅ PostgreSQL connected via Prisma')
  } catch (err) {
    console.error('❌ Database connection failed:', err)
    process.exit(1)
  }
}

export const disconnectDB = async (): Promise<void> => {
  await prisma.$disconnect()
}

process.on('SIGINT',  disconnectDB)
process.on('SIGTERM', disconnectDB)