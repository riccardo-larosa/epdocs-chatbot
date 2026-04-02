import { NextResponse } from 'next/server'
import { verifyUserPassword } from '@/lib/rfpUsers'
import { signToken, RFP_COOKIE_NAME, sessionCookieOptions } from '@/lib/rfpAuth'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, password } = body ?? {}

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }

    const user = await verifyUserPassword(username, password)
    if (!user) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
    }

    const token = await signToken(user.username, user.role)
    const opts = sessionCookieOptions()

    const response = NextResponse.json({ ok: true, role: user.role })
    response.cookies.set(RFP_COOKIE_NAME, token, opts)
    return response
  } catch (err) {
    console.error('[rfp/login]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
