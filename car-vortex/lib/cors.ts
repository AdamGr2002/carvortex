import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function corsHeaders(req: NextRequest) {
  const origin = req.headers.get('origin') || '*'
  const headers = new Headers({
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  })

  return headers
}

export function handleCORS(req: NextRequest, res: NextResponse) {
  const headers = corsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers })
  }

  for (const [key, value] of headers.entries()) {
    res.headers.set(key, value)
  }

  return res
}