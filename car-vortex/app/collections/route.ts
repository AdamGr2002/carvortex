/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const collections = await prisma.collection.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { cars: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(collections)
  } catch (error) {
    console.error('Error fetching collections:', error)
    return NextResponse.json({ error: 'Failed to fetch collections' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, description } = await req.json()

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const newCollection = await prisma.collection.create({
      data: {
        title,
        description,
        userId
      }
    })

    return NextResponse.json(newCollection, { status: 201 })
  } catch (error) {
    console.error('Error creating collection:', error)
    return NextResponse.json({ error: 'Failed to create collection' }, { status: 500 })
  }
}