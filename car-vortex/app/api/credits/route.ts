import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
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
      // Get the current user's email from Clerk
      const clerkUser = await currentUser()
      if (!clerkUser || !clerkUser.emailAddresses || clerkUser.emailAddresses.length === 0) {
        return NextResponse.json({ error: 'Unable to retrieve user email' }, { status: 400 })
      }

      const primaryEmail = clerkUser.emailAddresses[0].emailAddress

      // Create a new user record if not found
      const newUser = await prisma.user.create({
        data: {
          id: userId,
          email: primaryEmail,
          credits: 7,
          avatar:'', // Start with 5 credits for new users
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