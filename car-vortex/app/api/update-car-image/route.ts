import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN
const CLOUDINARY_UPLOAD_URL = process.env.CLOUDINARY_UPLOAD_URL

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { carId } = await req.json()

    if (!carId) {
      return NextResponse.json({ error: 'Missing carId' }, { status: 400 })
    }

    const car = await prisma.car.findUnique({
      where: { id: carId },
    })

    if (!car) {
      return NextResponse.json({ error: 'Car not found' }, { status: 404 })
    }

    if (car.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!car.replicateId) {
      return NextResponse.json({ error: 'No Replicate job associated with this car' }, { status: 400 })
    }

    const response = await fetch(`https://api.replicate.com/v1/predictions/${car.replicateId}`, {
      headers: {
        Authorization: `Token ${REPLICATE_API_TOKEN}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch Replicate job status: ${response.statusText}`)
    }

    const prediction = await response.json()

    if (prediction.status === 'succeeded') {
      const replicateImageUrl = prediction.output[0]
      
      // Upload image to Cloudinary
      const formData = new FormData()
      formData.append('file', replicateImageUrl)
      formData.append('upload_preset', 'car_vortex_unsigned') // Make sure to create this unsigned upload preset in your Cloudinary account

      if (!CLOUDINARY_UPLOAD_URL) {
        throw new Error('CLOUDINARY_UPLOAD_URL is not defined')
      }

      const cloudinaryResponse = await fetch(CLOUDINARY_UPLOAD_URL, {
        method: 'POST',
        body: formData,
      })

      if (!cloudinaryResponse.ok) {
        throw new Error('Failed to upload image to Cloudinary')
      }

      const cloudinaryData = await cloudinaryResponse.json()
      const cloudinaryImageUrl = cloudinaryData.secure_url

      await prisma.car.update({
        where: { id: carId },
        data: {
          imageUrl: cloudinaryImageUrl,
          status: 'COMPLETED',
        },
      })

      return NextResponse.json({ status: 'COMPLETED', imageUrl: cloudinaryImageUrl })
    } else if (prediction.status === 'failed') {
      await prisma.car.update({
        where: { id: carId },
        data: {
          status: 'FAILED',
        },
      })

      return NextResponse.json({ status: 'FAILED', error: prediction.error })
    } else {
      return NextResponse.json({ status: 'PENDING' })
    }
  } catch (error) {
    console.error('Error updating car image:', error)
    return NextResponse.json({ error: 'Failed to update car image' }, { status: 500 })
  }
}