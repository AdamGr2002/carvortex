/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const timeFilter = searchParams.get('timeFilter') || 'all'
  const limit = parseInt(searchParams.get('limit') || '10', 10)

  try {
    let whereClause = {}
    if (timeFilter !== 'all') {
      const date = new Date()
      if (timeFilter === 'day') {
        date.setDate(date.getDate() - 1)
      } else if (timeFilter === 'week') {
        date.setDate(date.getDate() - 7)
      } else if (timeFilter === 'month') {
        date.setMonth(date.getMonth() - 1)
      }
      whereClause = {
        createdAt: {
          gte: date
        }
      }
    }

    const topCars = await prisma.car.findMany({
      where: whereClause,
      orderBy: {
        votes: {
          _count: 'desc'
        }
      },
      take: limit,
      include: {
        user: {
          select: {
            email: true
          }
        },
        votes: true
      }
    })

    const formattedTopCars = topCars.map(car => ({
      ...car,
      votes: car.votes.reduce((acc, vote) => acc + (vote.voteType === 'up' ? 1 : -1), 0),
      userDisplayName: car.user.email.split('@')[0]
    }))

    return NextResponse.json(formattedTopCars)
  } catch (error) {
    console.error('Error fetching top cars:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', details: (error as any).message },
      { status: 500 }
    )
  }
}