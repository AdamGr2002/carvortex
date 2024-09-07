/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
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
  if (!REPLICATE_API_TOKEN) {
    return handleCORS(req, NextResponse.json({ error: 'Replicate API token not configured' }, { status: 500 }))
  }

  const { prompt, style, environment } = await req.json()

  try {
    const fullPrompt = `${prompt}, ${style} style, in a ${environment}`
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "ac732df83cea7fff18b8472768c88ad041fa750ff7682a21affe81863cbe77e4", // Stable Diffusion v2.1
        input: { prompt: fullPrompt }
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