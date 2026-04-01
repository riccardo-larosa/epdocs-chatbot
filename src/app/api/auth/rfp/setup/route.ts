import { NextResponse } from 'next/server'
import { createUser, hasAnyAdmin } from '@/lib/rfpUsers'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, password, setupKey } = body ?? {}

    if (!username || !password || !setupKey) {
      return NextResponse.json(
        { error: 'username, password, and setupKey are required' },
        { status: 400 }
      )
    }

    const expectedKey = process.env.RFP_ADMIN_SETUP_KEY
    if (!expectedKey || setupKey !== expectedKey) {
      return NextResponse.json({ error: 'Invalid setup key' }, { status: 403 })
    }

    const adminExists = await hasAnyAdmin()
    if (adminExists) {
      return NextResponse.json(
        { error: 'An admin account already exists. Use the admin UI to manage users.' },
        { status: 409 }
      )
    }

    await createUser(username, password, 'admin')
    return NextResponse.json({ ok: true, message: `Admin user "${username}" created` })
  } catch (err) {
    console.error('[rfp/setup]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
