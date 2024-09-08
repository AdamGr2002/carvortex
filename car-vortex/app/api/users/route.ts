/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth,currentUser } from '@clerk/nextjs/server'

export async function GET(req: NextRequest) {
  try {
    console.log('Fetching user data...')
    const { userId } = auth()

    if (!userId) {
      console.log('Unauthorized: No user ID found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`Fetching data for user ID: ${userId}`)

    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        credits: true,
      },
    })

    if (!user) {
      console.log(`User not found for ID: ${userId}. Creating new user.`)
      const clerkUser = await currentUser()
      
      if (!clerkUser || !clerkUser.emailAddresses || clerkUser.emailAddresses.length === 0) {
        return NextResponse.json({ error: 'No email found for user' }, { status: 400 })
      }

      const email = clerkUser.emailAddresses[0].emailAddress

      user = await prisma.user.create({
        data: {
          id: userId,
          email: email,
          credits: 10, // Default credits
        },
        select: {
          id: true,
          email: true,
          credits: true,
        },
      })
    }

    console.log('User data fetched or created successfully')
    return NextResponse.json(user)
  } catch (error) {
    console.error('Error in GET /api/users route:', error)
    return NextResponse.json({ error: 'Internal Server Error', details: (error as any).message }, { status: 500 })
  }
}
export async function POST(req: NextRequest) {
  try {
    const { userId } = auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { email } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 })
    }

    const newUser = await prisma.user.create({
      data: {
        id: userId,
        email: email,
        credits: 10, // Default credits
      },
    })

    return NextResponse.json(newUser)
  } catch (error) {
    console.error('Error in POST /api/users route:', error)
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

    if (typeof credits !== 'number') {
      return NextResponse.json({ error: 'Invalid credit value' }, { status: 400 })
    }

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
