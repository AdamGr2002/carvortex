import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { handleCORS } from '@/lib/cors'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    try {
      const { userId } = auth()
      if (!userId) {
        return handleCORS(req, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }
  
      let user = await prisma.user.findUnique({
        where: { id: userId },
      })
  
      if (!user) {
        const clerkUser = await currentUser()
        if (!clerkUser) {
          return handleCORS(req, NextResponse.json({ error: 'User not found' }, { status: 404 }))
        }
  
        user = await prisma.user.create({
          data: {
            id: userId,
            email: clerkUser.emailAddresses[0].emailAddress,
            // credits will be set to 10 by default as specified in the schema
          },
        })
      }
  
      return handleCORS(req, NextResponse.json(user))
    } catch (error) {
      console.error('Error in GET /api/users:', error)
      return handleCORS(req, NextResponse.json({ error: 'Internal Server Error' }, { status: 500 }))
    }
  }

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return handleCORS(req, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const { credits } = await req.json()

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        credits: {
          increment: credits,
        },
      },
    })

    return handleCORS(req, NextResponse.json(updatedUser))
  } catch (error) {
    console.error('Error in PATCH /api/users:', error)
    return handleCORS(req, NextResponse.json({ error: 'Internal Server Error' }, { status: 500 }))
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCORS(req, new NextResponse(null, { status: 204 }))
}