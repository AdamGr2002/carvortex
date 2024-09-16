import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const timeRange = searchParams.get('timeRange') || 'allTime'

  let dateFilter: { createdAt?: { gte: Date } } = {}
  const now = new Date()

  switch (timeRange) {
    case 'day':
      dateFilter = { createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } }
      break
    case 'week':
      dateFilter = { createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } }
      break
    case 'month':
      dateFilter = { createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } }
      break
    case 'allTime':
    default:
      // No date filter for all time
      break
  }

  try {
    const topCars = await prisma.car.findMany({
      where: dateFilter,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        votes: 'desc',
      },
      take: 10,
    })

    const formattedTopCars = topCars.map(car => ({
      id: car.id,
      imageUrl: car.imageUrl,
      title: car.title,
      description: car.description,
      type: car.type,
      style: car.style,
      votes: car.votes,
      userDisplayName: car.user.name || car.user.email.split('@')[0],
    }))

    return NextResponse.json(formattedTopCars)
  } catch (error) {
    console.error('Error fetching top cars:', error)
    return NextResponse.json({ error: 'Failed to fetch top cars' }, { status: 500 })
  }
}