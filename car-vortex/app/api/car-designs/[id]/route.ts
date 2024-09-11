// app/api/car-designs/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const carDesign = await prisma.carDesign.findUnique({
      where: { id: params.id },
      include: {
        creator: {
          select: {
            name: true,
            avatar: true,
          },
        },
      },
    })

    if (!carDesign) {
      return NextResponse.json({ error: 'Car design not found' }, { status: 404 })
    }

    return NextResponse.json(carDesign)
  } catch (error) {
    console.error('Error fetching car design:', error)
    return NextResponse.json({ error: 'Failed to fetch car design details' }, { status: 500 })
  }
}