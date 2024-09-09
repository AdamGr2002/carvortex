/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN
const CLOUDINARY_URL = process.env.CLOUDINARY_URL

if (!CLOUDINARY_URL) {
  console.error('CLOUDINARY_URL is not set')
}

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
    await new Promise(resolve => setTimeout(resolve, 1000))
    return pollForResult(id)
  }
}

async function uploadToCloudinary(imageUrl: string) {
  if (!CLOUDINARY_URL) {
    throw new Error('CLOUDINARY_URL is not set')
  }

  const formData = new FormData()
  formData.append('file', imageUrl)
  formData.append('upload_preset', 'ml_default')

  try {
    const response = await fetch(CLOUDINARY_URL, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Cloudinary upload failed:', errorData)
      throw new Error(`Failed to upload image to Cloudinary: ${response.statusText}`)
    }

    const result = await response.json()
    return result.secure_url
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error)
    throw new Error('Failed to upload image to Cloudinary')
  }
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
      // Continue the car generation process
      try {
        const result = await pollForResult(car.replicateId)
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