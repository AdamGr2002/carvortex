import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const car = await prisma.car.update({
      where: { id: params.id },
      data: { votes: { increment: 1 } },
    })

    return NextResponse.json(car)
  } catch (error) {
    console.error('Error voting for car:', error)
    return NextResponse.json({ error: 'Failed to vote for car' }, { status: 500 })
  }
}