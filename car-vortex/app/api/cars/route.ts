import { NextRequest, NextResponse } from 'next/server'
import { prisma, setupDatabase, saveDatabase } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    await setupDatabase()
    
    console.log('Fetching cars...')
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '9', 10)
    const skip = (page - 1) * limit

    console.log(`Page: ${page}, Limit: ${limit}, Skip: ${skip}`)

    const [cars, totalCount] = await Promise.all([
      prisma.car.findMany({
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      }),
      prisma.car.count(),
    ])

    console.log(`Fetched ${cars.length} cars, Total count: ${totalCount}`)

    const carsWithDisplayName = cars.map(car => ({
      ...car,
      userDisplayName: car.user?.email?.split('@')[0] || 'Unknown',
      user: undefined,
    }))

    return NextResponse.json({
      cars: carsWithDisplayName,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
    })
  } catch (error) {
    console.error('Error in /api/cars route:', error)
    return NextResponse.json({ error: 'Internal Server Error', details: (error as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await setupDatabase()
    
    const body = await req.json()
    const { imageUrl, title, description, style, environment, userId } = body

    const car = await prisma.car.create({
      data: {
        imageUrl,
        title,
        description,
        style,
        environment,
        userId,
      },
    })

    await saveDatabase()

    return NextResponse.json(car)
  } catch (error) {
    console.error('Error in POST /api/cars route:', error)
    return NextResponse.json({ error: 'Internal Server Error', details: (error as Error).message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await setupDatabase()
    
    const body = await req.json()
    const { id, vote } = body

    const car = await prisma.car.update({
      where: { id },
      data: {
        votes: {
          increment: vote === 'up' ? 1 : -1,
        },
      },
    })

    await saveDatabase()

    return NextResponse.json(car)
  } catch (error) {
    console.error('Error in PATCH /api/cars route:', error)
    return NextResponse.json({ error: 'Internal Server Error', details: (error as Error).message }, { status: 500 })
  }
}