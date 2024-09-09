import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    })

    if (!user) {
      // Create a new user record if not found
      const newUser = await prisma.user.create({
        data: {
          id: userId,
          email: 'example@example.com', // Add a valid email address
          credits: 5, // Start with 5 credits for new users
        },
      })
      return NextResponse.json({ credits: newUser.credits })
    }

    return NextResponse.json({ credits: user.credits })
  } catch (error) {
    console.error('Error fetching or creating user credits:', error)
    return NextResponse.json({ error: 'Failed to fetch or create user credits' }, { status: 500 })
  }
}