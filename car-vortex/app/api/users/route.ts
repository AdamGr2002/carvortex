/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'

export async function GET() {
  try {
    console.log('Fetching user data...')
    const { userId } = auth()

    if (!userId) {
      console.log('Unauthorized: No user ID found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`Fetching data for user ID: ${userId}`)

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        credits: true,
      },
    })

    if (!user) {
      console.log(`User not found for ID: ${userId}`)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    console.log('User data fetched successfully')
    return NextResponse.json(user)
  } catch (error) {
    console.error('Error in GET /api/users route:', error)
    return NextResponse.json({ error: 'Internal Server Error', details: (error as any).message }, { status: 500 })
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
    return NextResponse.json({ error: 'Internal Server Error', details: (error as any).message }, { status: 500 })
  }
}