/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN
const CLOUDINARY_URL = process.env.CLOUDINARY_URL
const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || 'ml_default'

async function pollForResult(id: string): Promise<any> {
  try {
    const response = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: {
        Authorization: `Token ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    })
    if (!response.ok) {
      throw new Error(`Replicate API responded with status ${response.status}`)
    }
    const result = await response.json()
    console.log('Replicate API response:', result)
    if (result.status === 'succeeded') {
      return result
    } else if (result.status === 'failed') {
      throw new Error(`Image generation failed: ${result.error || 'Unknown error'}`)
    } else {
      return null // Still in progress
    }
  } catch (error) {
    console.error('Error in pollForResult:', error)
    throw error
  }
}

async function uploadToCloudinary(imageUrl: string) {
  if (!CLOUDINARY_URL) {
    throw new Error('CLOUDINARY_URL is not set')
  }

  try {
    const cloudinaryUrlParts = CLOUDINARY_URL.match(/cloudinary:\/\/(\d+):([^@]+)@(.+)/)
    if (!cloudinaryUrlParts) {
      throw new Error('Invalid CLOUDINARY_URL format')
    }

    const [, apiKey, apiSecret, cloudName] = cloudinaryUrlParts

    const timestamp = Math.round((new Date()).getTime() / 1000)
    const params = {
      timestamp: timestamp.toString(),
      upload_preset: CLOUDINARY_UPLOAD_PRESET,
    }

    const signature = generateSignature(params, apiSecret)

    const formData = new FormData()
    formData.append('file', imageUrl)
    formData.append('timestamp', timestamp.toString())
    formData.append('api_key', apiKey)
    formData.append('signature', signature)
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Cloudinary upload failed:', errorData)
      throw new Error(`Failed to upload image to Cloudinary: ${response.statusText}. Details: ${errorData}`)
    }

    const result = await response.json()
    console.log('Cloudinary upload result:', result)
    return result.secure_url
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error)
    throw error
  }
}

function generateSignature(params: Record<string, string>, apiSecret: string) {
  const sortedKeys = Object.keys(params).sort()
  const sortedParams = sortedKeys.map(key => `${key}=${params[key]}`).join('&')
  return crypto.createHash('sha256').update(sortedParams + apiSecret).digest('hex')
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
      console.log('Checking status for car:', car.id, 'with replicateId:', car.replicateId)
      // Check the status of the Replicate job
      const result = await pollForResult(car.replicateId)
      
      if (result) {
        console.log('Replicate job completed, uploading to Cloudinary')
        // Job is complete, upload to Cloudinary
        const cloudinaryUrl = await uploadToCloudinary(result.output[0])

        console.log('Updating car with Cloudinary URL:', cloudinaryUrl)
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
        console.log('Replicate job still in progress')
        // Job is still in progress
        return NextResponse.json({
          id: car.id,
          status: 'PENDING',
          message: 'Car generation in progress',
        })
      }
    }

    // If the car is already completed or failed, just return its current status
    console.log('Returning current car status:', car.status)
    return NextResponse.json({
      id: car.id,
      status: car.status,
      imageUrl: car.imageUrl,
      title: car.title,
      description: car.description,
    })
  } catch (error) {
    console.error('Error checking car status:', error)
    return NextResponse.json({ error: 'Failed to check car status', details: (error as Error).message }, { status: 500 })
  }
}