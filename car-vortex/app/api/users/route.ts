/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'

export async function GET(req: NextRequest) {
  try {
    const { userId } = auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        credits: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error in GET /api/users route:', error)
    return NextResponse.json({ error: 'Internal Server Error', details: (error as Error).message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { credits } = body

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        credits: {
          increment: credits,
        },
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error in PATCH /api/users route:', error)
    return NextResponse.json({ error: 'Internal Server Error', details: (error as Error).message }, { status: 500 })
  }
}