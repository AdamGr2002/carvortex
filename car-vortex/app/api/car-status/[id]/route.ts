/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { pollForResult, uploadToCloudinary } from '../../generate-car/route'

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const car = await prisma.car.findUnique({
      where: { id: params.id },
    })

    if (!car) {
      return NextResponse.json({ error: 'Car not found' }, { status: 404 })
    }

    if (car.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (car.status === 'PENDING') {
      // Continue the car generation process
      try {
        const result = await pollForResult(car.replicateId!)
        const cloudinaryUrl = await uploadToCloudinary(result.output[0])

        await prisma.car.update({
          where: { id: car.id },
          data: {
            imageUrl: cloudinaryUrl,
            status: 'COMPLETED',
          },
        })

        return NextResponse.json({
          id: car.id,
          status: 'COMPLETED',
          imageUrl: cloudinaryUrl,
          title: car.title,
          description: car.description,
        })
      } catch (error) {
        console.error('Error completing car generation:', error)
        await prisma.car.update({
          where: { id: car.id },
          data: { status: 'FAILED' },
        })
        return NextResponse.json({ error: 'Car generation failed' }, { status: 500 })
      }
    }

    return NextResponse.json({
      id: car.id,
      status: car.status,
      imageUrl: car.imageUrl,
      title: car.title,
      description: car.description,
    })
  } catch (error) {
    console.error('Error fetching car status:', error)
    return NextResponse.json({ error: 'Failed to fetch car status' }, { status: 500 })
  }
}