/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { handleCORS } from '@/lib/cors'

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
  const { userId } = auth()
  if (!userId) {
    return handleCORS(req, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
  }

  if (!REPLICATE_API_TOKEN) {
    return handleCORS(req, NextResponse.json({ error: 'Replicate API token not configured' }, { status: 500 }))
  }

  // Check if user has enough credits
  const creditsResponse = await fetch(`${req.nextUrl.origin}/api/credits`, {
    headers: {
      Authorization: req.headers.get('Authorization') || '',
    },
  })
  const { credits } = await creditsResponse.json()

  if (credits < 1) {
    return handleCORS(req, NextResponse.json({ error: 'Not enough credits' }, { status: 400 }))
  }

  const { prompt, style, environment } = await req.json()

  try {
    const fullPrompt = `A highly detailed, professional photograph of a ${prompt}, ${style} style, in a ${environment}, 8k resolution, realistic lighting, intricate details`
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

    if (response.status !== 201) {
      const error = await response.json()
      return handleCORS(req, NextResponse.json({ error: error.detail }, { status: 500 }))
    }

    const prediction = await response.json()
    const result = await pollForResult(prediction.id)

    // Generate a title and description
    const title = `${style.charAt(0).toUpperCase() + style.slice(1)} ${prompt} in ${environment}`
    const description = `This ${style} style car is a futuristic marvel designed for the ${environment}. It showcases innovative features and a sleek design that pushes the boundaries of automotive engineering.`

    // Deduct a credit
    await fetch(`${req.nextUrl.origin}/api/credits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: req.headers.get('Authorization') || '',
      },
      body: JSON.stringify({ credits: -1 }),
    })

    return handleCORS(req, NextResponse.json({ 
      imageUrl: result.output[0],
      title: title,
      description: description
    }))
  } catch (error) {
    console.error('Error generating image:', error)
    return handleCORS(req, NextResponse.json({ error: 'Failed to generate image' }, { status: 500 }))
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCORS(req, new NextResponse(null, { status: 204 }))
}