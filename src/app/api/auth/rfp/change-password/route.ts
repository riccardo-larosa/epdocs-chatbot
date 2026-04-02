import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/rfpAuth'
import { verifyUserPassword, updatePassword } from '@/lib/rfpUsers'

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('rfp_session')?.value
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    const username = payload.sub
    if (!username) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const body = await request.json()
    const { currentPassword, newPassword } = body ?? {}

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'currentPassword and newPassword are required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters' },
        { status: 400 }
      )
    }

    const valid = await verifyUserPassword(username, currentPassword)
    if (!valid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })
    }

    await updatePassword(username, newPassword)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[auth/rfp/change-password]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
