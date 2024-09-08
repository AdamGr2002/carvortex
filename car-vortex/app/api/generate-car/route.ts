/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import cloudinary from '@/lib/cloudinary'

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN

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

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!REPLICATE_API_TOKEN) {
      return NextResponse.json({ error: 'Replicate API token not configured' }, { status: 500 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    })

    if (!user || user.credits < 1) {
      return NextResponse.json({ error: 'Not enough credits' }, { status: 400 })
    }

    const { type, style, environment, details } = await req.json()

    if (!type || !style || !environment) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    console.log('Generating car with data:', { type, style, environment, details })

    const fullPrompt = `A highly detailed, professional photograph of a ${type} car, ${style} style, in a ${environment} environment, with these additional details: ${details}. 8k resolution, realistic lighting, intricate details`
    const negativePrompt = "low quality, blurry, distorted, unrealistic, cartoon, anime, sketch, drawing"

    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b", // Stable Diffusion XL
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
      const error = await response.json()
      console.error('Replicate API error:', error)
      return NextResponse.json({ error: 'Image generation failed' }, { status: 500 })
    }

    const prediction = await response.json()
    const result = await pollForResult(prediction.id)

    const uploadResponse = await cloudinary.uploader.upload(result.output[0], {
      folder: 'ai-cars',
    })

    const newCar = await prisma.car.create({
      data: {
        imageUrl: uploadResponse.secure_url,
        title: `${style} ${type} in ${environment}`,
        description: `A ${style} ${type} car designed for a ${environment} environment. ${details}`,
        type,
        style,
        environment,
        userId,
        featured: false, // Set featured to false by default
      },
    })

    // Deduct credits after successful generation
    await prisma.user.update({
      where: { id: userId },
      data: { credits: { decrement: 1 } },
    })

    return NextResponse.json({ 
      id: newCar.id,
      imageUrl: newCar.imageUrl,
      title: newCar.title,
      description: newCar.description,
      type: newCar.type,
      style: newCar.style,
      environment: newCar.environment,
    })
  } catch (error) {
    console.error('Error generating car:', error)
    return NextResponse.json({ error: 'Failed to generate car', details: (error as Error).message }, { status: 500 })
  }
}