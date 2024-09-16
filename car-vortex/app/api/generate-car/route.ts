import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import cloudinary from '@/lib/cloudinary'

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN
const REPLICATE_MODEL_VERSION = "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b"
const CLOUDINARY_UPLOAD_URL = process.env.CLOUDINARY_UPLOAD_URL

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!REPLICATE_API_TOKEN) {
      throw new Error('Replicate API token not configured')
    }

    if (!CLOUDINARY_UPLOAD_URL) {
      throw new Error('Cloudinary upload URL not configured')
    }

    const { 
      type, 
      style,  
      bodyColor, 
      wheelSize, 
      spoiler, 
      lowered, 
      backgroundScene, 
      timeOfDay, 
      
      collectionId, 
      additionalDetails 
    } = await req.json()

    if (!type || !style ) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true, name: true },
    })

    if (!user || user.credits < 1) {
      return NextResponse.json({ error: 'Not enough credits' }, { status: 400 })
    }

    console.log('Initiating car generation with data:', { 
      type, 
      style, 
      bodyColor, 
      wheelSize, 
      spoiler, 
      lowered, 
      backgroundScene, 
      timeOfDay, 
      collectionId, 
      additionalDetails 
    })

    // Handle default collection
    let actualCollectionId: string
    if (!collectionId || collectionId === 'default') {
      const defaultCollection = await prisma.collection.findFirst({
        where: { userId, title: 'Default Collection' },
      })

      if (defaultCollection) {
        actualCollectionId = defaultCollection.id
      } else {
        const newDefaultCollection = await prisma.collection.create({
          data: { 
            title: 'Default Collection', 
            description: 'Default collection for uncategorized cars',
            userId 
          },
        })
        actualCollectionId = newDefaultCollection.id
      }
    } else {
      actualCollectionId = collectionId
    }

    // Create a pending car entry
    const pendingCar = await prisma.car.create({
      data: {
        title: `${style} ${type}`,
        description: `A ${style} ${type} car designed ${additionalDetails}`,
        type,
        style,
        bodyColor,
        wheelSize,
        spoiler,
        lowered,
        backgroundScene,
        timeOfDay,
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

    console.log('Created pending car:', pendingCar)

    // Deduct credits
    await prisma.user.update({
      where: { id: userId },
      data: { credits: { decrement: 1 } },
    })

    console.log('Deducted credit from user')

    // Start the car generation process
    const fullPrompt = `A highly detailed, professional photograph of a ${type} car, ${style} style. 
    Body color: ${bodyColor}. Wheel size: ${wheelSize} inches. 
    ${spoiler ? 'With a spoiler.' : 'Without a spoiler.'} 
    ${lowered ? 'Lowered suspension.' : 'Standard suspension.'} 
    Background: ${backgroundScene}. Time of day: ${timeOfDay}. 
    Additional details: ${additionalDetails}. 
    8k resolution, realistic lighting, intricate details`

    const negativePrompt = "low quality, blurry, distorted, unrealistic, cartoon, anime, sketch, drawing"

    console.log('Sending request to Replicate API')

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
    console.log('Received prediction from Replicate:', prediction)

    // Update the car with the Replicate prediction ID
    await prisma.car.update({
      where: { id: pendingCar.id },
      data: { replicateId: prediction.id },
    })

    console.log('Updated car with Replicate prediction ID')

    // Start a background process to check the prediction status and update the car
    checkPredictionStatus(pendingCar.id, prediction.id)

    // Return the pending car data immediately
    return NextResponse.json({ 
      id: pendingCar.id,
      status: 'PENDING',
      message: 'Car generation started',
      car: {
        ...pendingCar,
        user: { name: user.name },
        imageUrl: pendingCar.imageUrl, // Make sure this is included
      },
    })

  } catch (error) {
    console.error('Error initiating car generation:', error)
    return NextResponse.json({ error: 'Failed to generate car' }, { status: 500 })
  }
}

async function checkPredictionStatus(carId: string, predictionId: string) {
  try {
    console.log(`Checking prediction status for car ${carId}, prediction ${predictionId}`)

    const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: {
        Authorization: `Token ${REPLICATE_API_TOKEN}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch prediction status')
    }

    const prediction = await response.json()
    console.log('Prediction status:', prediction.status)

    if (prediction.status === 'succeeded') {
      const imageUrl = prediction.output[0]
      console.log('Generated image URL:', imageUrl)
      
      try {
        const uploadResult = await cloudinary.uploader.upload(imageUrl, {
          folder: 'car-vortex', // Specify the folder in your Cloudinary account
          resource_type: 'auto', // Automatically detect resource type
        })
        console.log('Cloudinary upload result:', uploadResult)

        const updatedCar = await prisma.car.update({
          where: { id: carId },
          data: {
            imageUrl: uploadResult.secure_url,
            status: 'COMPLETED',
          },
        })
        console.log('Updated car with Cloudinary URL:', updatedCar)
        await notifyClientImageReady(carId, uploadResult.secure_url)
      } catch (cloudinaryError) {
        console.error('Cloudinary upload error:', cloudinaryError)
        throw new Error('Failed to upload image to Cloudinary')
      }
    } else if (prediction.status === 'failed') {
      console.log('Prediction failed')
      await prisma.car.update({
        where: { id: carId },
        data: { status: 'FAILED' },
      })
    } else {
      // If still processing, check again after a delay
      console.log('Prediction still processing, checking again in 5 seconds')
      setTimeout(() => checkPredictionStatus(carId, predictionId), 5000)
    }
  } catch (error) {
    console.error('Error checking prediction status:', error)
    await prisma.car.update({
      where: { id: carId },
      data: { status: 'FAILED' },
    })
  }
}

async function notifyClientImageReady(carId: string, imageUrl: string) {
  // In a real-world scenario, you'd use WebSockets or Server-Sent Events here
  // For now, we'll just update the car status
  await prisma.car.update({
    where: { id: carId },
    data: { status: 'COMPLETED', imageUrl: imageUrl },
  })
}