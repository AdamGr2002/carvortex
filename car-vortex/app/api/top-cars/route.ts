import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const timeFilter = searchParams.get('timeFilter') || 'all'
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    let dateFilter: Date | null = null
    switch (timeFilter) {
      case '24h':
        dateFilter = new Date(Date.now() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        dateFilter = null
    }

    const cars = await prisma.car.findMany({
      where: dateFilter ? {
        createdAt: {
          gte: dateFilter
        }
      } : {},
      orderBy: {
        votes: 'desc'
      },
      take: limit,
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    })

    const carsWithDisplayName = cars.map(car => ({
      ...car,
      userDisplayName: car.user.email.split('@')[0],
      user: undefined,
    }))

    return NextResponse.json(carsWithDisplayName)
  } catch (error) {
    console.error('Error fetching top cars:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}