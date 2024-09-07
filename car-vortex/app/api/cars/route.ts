/* eslint-disable prefer-const */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { handleCORS } from '@/lib/cors'

interface Car {
  id: number
  imageUrl: string
  votes: number
  title: string
  description: string
  style: string
  environment: string
  voters: string[]
  createdAt: Date
}

let cars: Car[] = []

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period')

  let filteredCars = [...cars]

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
      filteredCars = filteredCars.filter(car => car.createdAt >= periodStart)
    }
  }

  // Sort cars by votes in descending order
  filteredCars.sort((a, b) => b.votes - a.votes)

  return handleCORS(req, NextResponse.json(filteredCars))
}

export async function POST(req: NextRequest) {
  const car: Car = await req.json()
  car.id = cars.length + 1
  car.votes = 0
  car.voters = []
  car.createdAt = new Date()
  cars.push(car)
  return handleCORS(req, NextResponse.json(car, { status: 201 }))
}

export async function PATCH(req: NextRequest) {
  const { userId } = auth()
  if (!userId) {
    return handleCORS(req, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
  }

  const { id, vote }: { id: number; vote: 'up' | 'down' } = await req.json()
  const carIndex = cars.findIndex(car => car.id === id)
  
  if (carIndex === -1) {
    return handleCORS(req, NextResponse.json({ error: 'Car not found' }, { status: 404 }))
  }

  if (cars[carIndex].voters.includes(userId)) {
    return handleCORS(req, NextResponse.json({ error: 'You have already voted for this car' }, { status: 400 }))
  }

  cars[carIndex].votes += vote === 'up' ?  1 : -1
  cars[carIndex].voters.push(userId)
  return handleCORS(req, NextResponse.json(cars[carIndex]))
}

export async function OPTIONS(req: NextRequest) {
  return handleCORS(req, new NextResponse(null, { status: 204 }))
}