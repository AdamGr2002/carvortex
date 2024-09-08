import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    log: ['query', 'error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

async function connectWithRetry(retries = 5) {
  while (retries > 0) {
    try {
      await prisma.$connect()
      console.log('Successfully connected to the database')
      return
    } catch (error) {
      console.error('Failed to connect to the database:', error)
      retries -= 1
      console.log(`Retries left: ${retries}`)
      await new Promise(res => setTimeout(res, 5000)) // Wait for 5 seconds before retrying
    }
  }
  throw new Error('Unable to connect to the database after multiple retries')
}

connectWithRetry()
  .catch((error) => {
    console.error('Failed to establish database connection:', error)
    process.exit(1)
  })

export default prisma