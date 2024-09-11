import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN
const REPLICATE_MODEL_VERSION = "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b"

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!REPLICATE_API_TOKEN) {
      throw new Error('Replicate API token not configured')
    }

    const { type, style, environment, details, collectionId } = await req.json()

    if (!type || !style || !environment) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true, name: true },
    })

    if (!user || user.credits < 1) {
      return NextResponse.json({ error: 'Not enough credits' }, { status: 400 })
    }

    console.log('Initiating car generation with data:', { type, style, environment, details, collectionId })

    // Handle default collection
    let actualCollectionId = collectionId
    if (collectionId === 'default') {
      const defaultCollection = await prisma.collection.findFirst({
        where: { title: 'Default Collection' },
      })

      if (defaultCollection) {
        actualCollectionId = defaultCollection.id
      } else {
        const newDefaultCollection = await prisma.collection.create({
          data: { 
            title: 'Default Collection', 
            description: 'Default collection for uncategorized cars',
          },
        })
        actualCollectionId = newDefaultCollection.id
      }
    }

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
        imageUrl: null,
        collectionId: actualCollectionId,
        likes: 0,
        featured: false,
        votes: 0,
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
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
        version: REPLICATE_MODEL_VERSION,
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
      const errorData = await response.json()
      console.error('Replicate API error:', errorData)
      throw new Error(`Failed to generate image: ${errorData.detail || 'Unknown error'}`)
    }

    const prediction = await response.json()

    // Update the car with the Replicate prediction ID
    await prisma.car.update({
      where: { id: pendingCar.id },
      data: { replicateId: prediction.id },
    })

    // Return the pending car data immediately
    return NextResponse.json({ 
      id: pendingCar.id,
      status: 'PENDING',
      message: 'Car generation started',
      car: {
        ...pendingCar,
        user: { name: user.name },
      },
    })

  } catch (error) {
    console.error('Error initiating car generation:', error)
    let errorMessage = 'Failed to initiate car generation'
    let statusCode = 500

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      errorMessage = `Database error: ${error.message}`
      statusCode = 400
    } else if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      errorMessage = `Unknown database error: ${error.message}`
    } else if (error instanceof Error) {
      errorMessage = error.message
      if (errorMessage.includes('Unauthorized')) {
        statusCode = 401
      } else if (errorMessage.includes('Not enough credits')) {
        statusCode = 400
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}