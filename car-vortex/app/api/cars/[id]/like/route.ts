// app/api/cars/[id]/like/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const updatedCar = await prisma.car.update({
      where: { id: params.id },
      data: {
        likes: { increment: 1 },
      },
      select: {
        id: true,
        title: true,
        imageUrl: true,
        likes: true,
      },
    })

    return NextResponse.json(updatedCar)
  } catch (error) {
    console.error('Error liking car:', error)
    return NextResponse.json({ error: 'Failed to like car' }, { status: 500 })
  }
}