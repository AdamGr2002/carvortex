import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { carId } = await req.json()

    if (!carId) {
      return NextResponse.json({ error: 'Car ID is required' }, { status: 400 })
    }

    const existingVote = await prisma.vote.findUnique({
      where: {
        carId_userId: {
          carId,
          userId
        }
      }
    })

    if (existingVote) {
      await prisma.vote.delete({
        where: { id: existingVote.id }
      })
      return NextResponse.json({ message: 'Vote removed', action: 'removed' })
    } else {
      await prisma.vote.create({
        data: {
          carId,
          userId
        }
      })
      return NextResponse.json({ message: 'Vote added', action: 'added' })
    }
  } catch (error) {
    console.error('Error voting:', error)
    return NextResponse.json({ error: 'Failed to vote' }, { status: 500 })
  }
}