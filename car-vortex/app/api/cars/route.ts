/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'

export async function GET(req: NextRequest) {
  try {
    console.log('Fetching cars...')
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '9')
    const skip = (page - 1) * limit

    console.log(`Page: ${page}, Limit: ${limit}, Skip: ${skip}`)

    const [cars, totalCars] = await Promise.all([
      prisma.car.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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

    const totalPages = Math.ceil(totalCars / limit)

    console.log(`Fetched ${cars.length} cars. Total cars: ${totalCars}. Total pages: ${totalPages}`)

    return NextResponse.json({
      cars: cars.map(car => ({
        ...car,
        userDisplayName: car.user.email.split('@')[0], // Use email username as display name
      })),
      currentPage: page,
      totalPages,
    })
  } catch (error) {
    console.error('Error in GET /api/cars route:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', details: (error as Error).message, stack: (error as Error).stack },
      { status: 500 }
    )
  }
}
export async function POST(req: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { imageUrl, title, description, style, environment } = body

    const newCar = await prisma.car.create({
      data: {
        imageUrl,
        title,
        description,
        style,
        environment,
        userId,
      },
    })

    return NextResponse.json(newCar)
  } catch (error) {
    console.error('Error in POST /api/cars route:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', details: (error as any).message },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { id, vote } = body

    const car = await prisma.car.findUnique({ where: { id } })

    if (!car) {
      return NextResponse.json({ error: 'Car not found' }, { status: 404 })
    }

    const updatedCar = await prisma.car.update({
      where: { id },
      data: {
        votes: vote === 'up' ? car.votes + 1 : car.votes - 1,
      },
    })

    return NextResponse.json(updatedCar)
  } catch (error) {
    console.error('Error in PATCH /api/cars route:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', details: (error as any).message },
      { status: 500 }
    )
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}