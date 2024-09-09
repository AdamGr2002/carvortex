/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN
const CLOUDINARY_URL = process.env.CLOUDINARY_URL

async function pollForResult(id: string): Promise<any> {
  const response = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
    headers: {
      Authorization: `Token ${REPLICATE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
  })
  const result = await response.json()
  if (result.status === 'succeeded') {
    return result
  } else if (result.status === 'failed') {
    throw new Error('Image generation failed')
  } else {
    return null // Still in progress
  }
}

async function uploadToCloudinary(imageUrl: string) {
  if (!CLOUDINARY_URL) {
    throw new Error('CLOUDINARY_URL is not set')
  }

  const formData = new FormData()
  formData.append('file', imageUrl)
  formData.append('upload_preset', 'ml_default')

  const response = await fetch(CLOUDINARY_URL, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Failed to upload image to Cloudinary: ${response.statusText}`)
  }

  const result = await response.json()
  return result.secure_url
}

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

    if (car.status === 'PENDING' && car.replicateId) {
      // Check the status of the Replicate job
      const result = await pollForResult(car.replicateId)
      
      if (result) {
        // Job is complete, upload to Cloudinary
        const cloudinaryUrl = await uploadToCloudinary(result.output[0])

        // Update the car with the final image URL
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
      } else {
        // Job is still in progress
        return NextResponse.json({
          id: car.id,
          status: 'PENDING',
          message: 'Car generation in progress',
        })
      }
    }

    // If the car is already completed or failed, just return its current status
    return NextResponse.json({
      id: car.id,
      status: car.status,
      imageUrl: car.imageUrl,
      title: car.title,
      description: car.description,
    })
  } catch (error) {
    console.error('Error checking car status:', error)
    return NextResponse.json({ error: 'Failed to check car status' }, { status: 500 })
  }
}