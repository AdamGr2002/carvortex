// app/api/car-designs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sort = searchParams.get('sort') || 'recent'

  try {
    let carDesigns

    switch (sort) {
      case 'top':
        carDesigns = await prisma.carDesign.findMany({
          orderBy: { likes: 'desc' },
          take: 20,
          include: {
            creator: {
              select: {
                name: true,
                avatar: true,
              },
            },
          },
        })
        break
      case 'trending':
        // For trending, we'll use a combination of recent activity and likes
        carDesigns = await prisma.carDesign.findMany({
          orderBy: [
            { createdAt: 'desc' },
            { likes: 'desc' },
          ],
          take: 20,
          include: {
            creator: {
              select: {
                name: true,
                avatar: true,
              },
            },
          },
        })
        break
      case 'recent':
      default:
        carDesigns = await prisma.carDesign.findMany({
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            creator: {
              select: {
                name: true,
                avatar: true,
              },
            },
          },
        })
    }

    return NextResponse.json(carDesigns)
  } catch (error) {
    console.error('Error fetching car designs:', error)
    return NextResponse.json({ error: 'Failed to fetch car designs' }, { status: 500 })
  }
}