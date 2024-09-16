import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const skip = (page - 1) * limit

    if (page < 1) {
      return NextResponse.json({ error: 'Invalid page number' }, { status: 400 })
    }

    const totalCars = await prisma.car.count({
      where: {
        status: 'COMPLETED',
      },
    })

    const totalPages = Math.ceil(totalCars / limit)

    if (page > totalPages) {
      return NextResponse.json({ error: 'Page number exceeds total pages' }, { status: 400 })
    }

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
      distinct: ['id'], // Ensure we're not getting duplicates
    })

    console.log(`Fetched ${cars.length} cars for page ${page}`)
    console.log('Car IDs:', cars.map(car => car.id))

    return NextResponse.json({
      cars,
      totalPages,
      currentPage: page,
    })
  } catch (error) {
    console.error('Error fetching cars:', error)
    return NextResponse.json({ error: 'Failed to fetch cars' }, { status: 500 })
  }
}