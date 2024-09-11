/* eslint-disable @typescript-eslint/no-unused-vars */
// app/api/collections/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const collections = await prisma.collection.findMany({
      include: {
        cars: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
            likes: true,
          },
        },
      },
    })

    return NextResponse.json(collections)
  } catch (error) {
    console.error('Error fetching collections:', error)
    return NextResponse.json({ error: 'Failed to fetch collections' }, { status: 500 })
  }
}