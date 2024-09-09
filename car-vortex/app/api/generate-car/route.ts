/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

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

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!REPLICATE_API_TOKEN) {
      return NextResponse.json({ error: 'Replicate API token not configured' }, { status: 500 })
    }

    const { type, style, environment, details } = await req.json()

    if (!type || !style || !environment) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    })

    if (!user || user.credits < 1) {
      return NextResponse.json({ error: 'Not enough credits' }, { status: 400 })
    }

    console.log('Initiating car generation with data:', { type, style, environment, details })

    // Create a pending car entry
    const pendingCar = await prisma.car.create({
      data: {
        title: `${style} ${type} in ${environment}`,
        description: `A ${style} ${type} car designed for a ${environment} environment. ${details}`,
        type,
        style,
        environment,
        userId,
        status: 'PENDING',
        imageUrl: '', // Add the imageUrl property here
      },
    })

    // Deduct credits
    await prisma.user.update({
      where: { id: userId },
      data: { credits: { decrement: 1 } },
    })

    // Start the car generation process
    const fullPrompt = `A highly detailed, professional photograph of a ${type} car, ${style} style, in a ${environment} environment, with these additional details: ${details}. 8k resolution, realistic lighting, intricate details`
    const negativePrompt = "low quality, blurry, distorted, unrealistic, cartoon, anime, sketch, drawing"

    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
        input: {
          prompt: fullPrompt,
          negative_prompt: negativePrompt,
          width: 1024,
          height: 1024,
          num_outputs: 1,
          num_inference_steps: 50,
          guidance_scale: 7.5,
          scheduler: "K_EULER_ANCESTRAL",
        }
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to generate image')
    }

    const prediction = await response.json()

    // Update the car with the Replicate prediction ID
    await prisma.car.update({
      where: { id: pendingCar.id },
      data: { replicateId: prediction.id },
    })

    // Return the pending car ID immediately
    return NextResponse.json({ 
      id: pendingCar.id,
      status: 'PENDING',
      message: 'Car generation started',
    })

  } catch (error) {
    console.error('Error initiating car generation:', error)
    let errorMessage = 'Failed to initiate car generation'
    const statusCode = 500

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      errorMessage = `Database error: ${error.message}`
    } else if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      errorMessage = `Unknown database error: ${error.message}`
    } else if (error instanceof Error) {
      errorMessage = error.message
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}