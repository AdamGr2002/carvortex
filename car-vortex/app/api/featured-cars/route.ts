import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const featuredCars = await prisma.car.findMany({
      where: {
        featured: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 6,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    if (!featuredCars) {
      throw new Error('Failed to fetch featured cars from the database')
    }

    const formattedCars = featuredCars.map(car => ({
      id: car.id,
      imageUrl: car.imageUrl,
      title: car.title,
      userDisplayName: car.user?.name || car.user?.email?.split('@')[0] || 'Unknown User',
    }))

    return NextResponse.json(formattedCars)
  } catch (error) {
    console.error('Error fetching featured cars:', error)
    return NextResponse.json({ error: 'Failed to fetch featured cars', details: (error as Error).message }, { status: 500 })
  }
}