import { NextResponse } from 'next/server'
import { RFP_COOKIE_NAME } from '@/lib/rfpAuth'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(RFP_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  })
  return response
}
