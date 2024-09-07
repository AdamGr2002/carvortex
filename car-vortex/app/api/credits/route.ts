import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { handleCORS } from '@/lib/cors'

// This is a mock database. In a real application, you'd use a proper database.
const userCredits: { [userId: string]: number } = {}

export async function GET(req: NextRequest) {
  const { userId } = auth()
  if (!userId) {
    return handleCORS(req, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
  }

  if (!(userId in userCredits)) {
    userCredits[userId] = 3 // Give 3 free credits when a user first logs in
  }

  return handleCORS(req, NextResponse.json({ credits: userCredits[userId] }))
}

export async function POST(req: NextRequest) {
  const { userId } = auth()
  if (!userId) {
    return handleCORS(req, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
  }

  const { credits } = await req.json()
  
  if (!(userId in userCredits)) {
    userCredits[userId] = 3 // Give 3 free credits if this is the user's first time
  }
  
  userCredits[userId] += credits

  return handleCORS(req, NextResponse.json({ credits: userCredits[userId] }))
}

export async function OPTIONS(req: NextRequest) {
  return handleCORS(req, new NextResponse(null, { status: 204 }))
}