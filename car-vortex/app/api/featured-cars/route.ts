import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET(req: NextRequest) {
  const { userId } = auth()
  const { searchParams } = new URL(req.url)
  const cursor = searchParams.get('cursor')
  const limit = 9 // Number of cars to fetch per request

  try {
    const cars = await prisma.$transaction(async (tx) => {
      return await tx.car.findMany({
        take: limit,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: {
          votes: 'desc'
        },
        include: {
          _count: {
            select: { votedBy: true }
          },
          votedBy: userId ? {
            where: { userId: userId }
          } : undefined
        }
      })
    })

    const formattedCars = cars.map(car => ({
      id: car.id,
      imageUrl: car.imageUrl,
      title: car.title,
      voteCount: car.votes,
      hasVoted: car.votedBy && car.votedBy.length > 0
    }))

    const nextCursor = cars.length === limit ? cars[cars.length - 1].id : null

    return NextResponse.json({ cars: formattedCars, nextCursor })
  } catch (error) {
    console.error('Error fetching featured cars:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 })
    } else if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      return NextResponse.json({ error: 'Unknown database error occurred' }, { status: 500 })
    } else {
      return NextResponse.json({ error: 'Failed to fetch featured cars' }, { status: 500 })
    }
  }
}