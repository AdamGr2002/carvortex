/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { handleCORS } from '@/lib/cors'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period')

    let query: any = {
      orderBy: {
        votes: 'desc',
      },
    }

    if (period) {
      const now = new Date()
      const periodStart = new Date(now)

      switch (period) {
        case '24h':
          periodStart.setHours(now.getHours() - 24)
          break
        case '7d':
          periodStart.setDate(now.getDate() - 7)
          break
        case '30d':
          periodStart.setDate(now.getDate() - 30)
          break
        // 'all' or any other value will return all cars
      }

      if (period !== 'all') {
        query.where = {
          createdAt: {
            gte: periodStart,
          },
        }
      }
    }

    const cars = await prisma.car.findMany(query)
    return handleCORS(req, NextResponse.json(cars))
  } catch (error) {
    console.error('Error in GET /api/cars:', error)
    return handleCORS(req, NextResponse.json({ error: 'Internal Server Error' }, { status: 500 }))
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return handleCORS(req, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const carData = await req.json()

    // Check if the user exists
    let user = await prisma.user.findUnique({
      where: { id: userId },
    })

    // If the user doesn't exist, create them
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          email: 'placeholder@example.com', // You might want to get this from Clerk
        },
      })
    }

    // Create the car
    const result = await prisma.car.create({
      data: {
        userId,
        imageUrl: carData.imageUrl,
        title: carData.title,
        description: carData.description,
        style: carData.style,
        environment: carData.environment,
      },
    })

    return handleCORS(req, NextResponse.json(result, { status: 201 }))
  } catch (error) {
    console.error('Error in POST /api/cars:', error)
    return handleCORS(req, NextResponse.json({ error: 'Internal Server Error' }, { status: 500 }))
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return handleCORS(req, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const { id, vote: voteType } = await req.json()

    const existingVote = await prisma.vote.findUnique({
      where: {
        carId_userId: {
          carId: id,
          userId,
        },
      },
    })

    if (existingVote) {
      return handleCORS(req, NextResponse.json({ error: 'You have already voted for this car' }, { status: 400 }))
    }

    const updatedCar = await prisma.$transaction(async (prisma) => {
      await prisma.vote.create({
        data: {
          carId: id,
          userId,
          voteType,
        },
      })

      return prisma.car.update({
        where: { id },
        data: {
          votes: {
            increment: voteType === 'up' ? 1 : -1,
          },
        },
      })
    })

    return handleCORS(req, NextResponse.json(updatedCar))
  } catch (error) {
    console.error('Error in PATCH /api/cars:', error)
    return handleCORS(req, NextResponse.json({ error: 'Internal Server Error' }, { status: 500 }))
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCORS(req, new NextResponse(null, { status: 204 }))
}