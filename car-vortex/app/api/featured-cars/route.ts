import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const skip = (page - 1) * limit

    const cars = await prisma.car.findMany({
      where: {
        status: 'COMPLETED',
      },
      orderBy: [
        { votes: 'desc' },
        { createdAt: 'desc' },
      ],
      skip,
      take: limit,
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    })

    const totalCars = await prisma.car.count({
      where: {
        status: 'COMPLETED',
      },
    })

    return NextResponse.json({
      cars,
      totalPages: Math.ceil(totalCars / limit),
      currentPage: page,
    })
  } catch (error) {
    console.error('Error fetching cars:', error)
    return NextResponse.json({ error: 'Failed to fetch cars' }, { status: 500 })
  }
}