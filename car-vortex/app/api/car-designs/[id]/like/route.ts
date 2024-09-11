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
      return NextResponse.json({ error: 'Missing carId' }, { status: 400 })
    }

    // Check if the user has already liked the car
    const existingLike = await prisma.favorite.findUnique({
      where: {
        userId_carId: {
          userId,
          carId,
        },
      },
    })

    if (existingLike) {
      // If the user has already liked the car, remove the like
      await prisma.favorite.delete({
        where: {
          userId_carId: {
            userId,
            carId,
          },
        },
      })

      await prisma.car.update({
        where: { id: carId },
        data: { likes: { decrement: 1 } },
      })

      return NextResponse.json({ liked: false, likes: await getCarLikes(carId) })
    } else {
      // If the user hasn't liked the car, add a new like
      await prisma.favorite.create({
        data: {
          userId,
          carId,
        },
      })

      await prisma.car.update({
        where: { id: carId },
        data: { likes: { increment: 1 } },
      })

      return NextResponse.json({ liked: true, likes: await getCarLikes(carId) })
    }
  } catch (error) {
    console.error('Error handling like:', error)
    return NextResponse.json({ error: 'Failed to process like' }, { status: 500 })
  }
}

async function getCarLikes(carId: string): Promise<number> {
  const car = await prisma.car.findUnique({
    where: { id: carId },
    select: { likes: true },
  })
  return car?.likes ?? 0
}