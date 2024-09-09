/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '9')
  const skip = (page - 1) * limit

  try {
    const [cars, totalCount] = await prisma.$transaction([
      prisma.car.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              email: true,
            },
          },
          votedBy: true,
        },
      }),
      prisma.car.count(),
    ])

    const totalPages = Math.ceil(totalCount / limit)

    const carsWithVoteCount = cars.map(car => ({
      ...car,
      votes: Array.isArray(car.votes) ? car.votes.length : 0,
      userDisplayName: car.user.email.split('@')[0],
    }))

    return NextResponse.json({
      cars: carsWithVoteCount,
      currentPage: page,
      totalPages,
    })
  } catch (error) {
    console.error('Error in GET /api/cars route:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', details: (error as any).message },
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
        type: 'car',
        environment,
        userId,
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    })

    return NextResponse.json({
      ...newCar,
      votes: 0,
      userDisplayName: newCar.user.email.split('@')[0],
    })
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

    const existingVote = await prisma.vote.findUnique({
      where: {
        userId_carId: {
          userId: userId,
          carId: id,
        },
      },
    } as any) // Add 'as any' to bypass the type checking

    let updatedVote
    if (existingVote) {
      // Update existing vote
      updatedVote = await prisma.vote.update({
        where: {
          id: existingVote.id,
        },
        data: {
        },
      })
    } else {
      // Create new vote
      updatedVote = await prisma.vote.create({
        data: {
          userId: userId,
          carId: id,
        },
      })
    }

    const updatedCar = await prisma.car.findUnique({
      where: { id: id },
      include: {
        votedBy: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    })

    if (!updatedCar) {
      return NextResponse.json({ error: 'Car not found' }, { status: 404 })
    }

    const voteCount = Array.isArray(updatedCar.votes) ? updatedCar.votes.reduce((acc, vote) => {
      if (vote.voteType === 'up') return acc + 1
      if (vote.voteType === 'down') return acc - 1
      return acc
    }, 0): 0

    return NextResponse.json({
      ...updatedCar,
      votes: voteCount,
      userDisplayName: updatedCar.user.email.split('@')[0],
    })
  } catch (error) {
    console.error('Error in PATCH /api/cars route:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', details: (error as any).message },
      { status: 500 }
    )
  }
}