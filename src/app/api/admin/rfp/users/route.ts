import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/rfpAuth'
import { listUsers, createUser, deleteUser } from '@/lib/rfpUsers'

async function requireAdmin(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get('rfp_session')?.value
  if (!token) return false
  try {
    const payload = await verifyToken(token)
    return payload.role === 'admin'
  } catch {
    return false
  }
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const users = await listUsers()
    return NextResponse.json({ users })
  } catch (err) {
    console.error('[admin/rfp/users GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const body = await request.json()
    const { username, password, role = 'user' } = body ?? {}

    if (!username || !password) {
      return NextResponse.json({ error: 'username and password are required' }, { status: 400 })
    }

    if (role !== 'user' && role !== 'admin') {
      return NextResponse.json({ error: 'role must be "user" or "admin"' }, { status: 400 })
    }

    await createUser(username, password, role)
    return NextResponse.json({ ok: true, message: `User "${username}" created` })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    const isConflict = message.includes('already exists')
    console.error('[admin/rfp/users POST]', err)
    return NextResponse.json({ error: message }, { status: isConflict ? 409 : 500 })
  }
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const body = await request.json()
    const { username } = body ?? {}

    if (!username) {
      return NextResponse.json({ error: 'username is required' }, { status: 400 })
    }

    const deleted = await deleteUser(username)
    if (!deleted) {
      return NextResponse.json({ error: `User "${username}" not found` }, { status: 404 })
    }
    return NextResponse.json({ ok: true, message: `User "${username}" deleted` })
  } catch (err) {
    console.error('[admin/rfp/users DELETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
