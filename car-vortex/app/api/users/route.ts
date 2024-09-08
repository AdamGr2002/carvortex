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

    let user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      // If the user doesn't exist in our database, create them
      user = await prisma.user.create({
        data: {
          id: userId,
          email: 'placeholder@example.com', // You might want to get this from Clerk
          credits: 10, // Give new users some starting credits
        },
      })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error in GET /api/users:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}