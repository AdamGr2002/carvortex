import { PrismaClient } from '@prisma/client'
import { put, list, del } from '@vercel/blob'
import fs from 'fs/promises'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

async function setupDatabase() {
  if (process.env.NODE_ENV === 'production') {
    try {
      const { blobs } = await list()
      const databaseBlob = blobs.find(blob => blob.pathname === 'sqlite-database')
      
      if (databaseBlob) {
        const response = await fetch(databaseBlob.url)
        const arrayBuffer = await response.arrayBuffer()
        await fs.writeFile('/tmp/database.db', Buffer.from(arrayBuffer))
        process.env.DATABASE_URL = 'file:/tmp/database.db'
      } else {
        console.log('No existing database found. Creating a new one.')
        process.env.DATABASE_URL = 'file:/tmp/database.db'
      }
    } catch (error) {
      console.error('Error setting up database:', error)
    }
  }
}

async function saveDatabase() {
  if (process.env.NODE_ENV === 'production') {
    try {
      const content = await fs.readFile('/tmp/database.db')
      
      // Delete the old blob if it exists
      const { blobs } = await list()
      const oldBlob = blobs.find(blob => blob.pathname === 'sqlite-database')
      if (oldBlob) {
        await del(oldBlob.url)
      }
      
      // Upload the new blob
      await put('sqlite-database', content, { access: 'public' })
    } catch (error) {
      console.error('Error saving database:', error)
    }
  }
}

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: ['query', 'error', 'warn'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export { setupDatabase, saveDatabase }