import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { listHiddenSources, addHiddenSource, deleteHiddenSource } from '@/lib/crawlConfig'

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const sources = await listHiddenSources()
    return NextResponse.json({ sources })
  } catch (err) {
    console.error('[admin/crawl/hidden GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const body = await request.json()
    const { url } = body ?? {}

    if (!url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 })
    }

    await addHiddenSource(url, 'admin')
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/crawl/hidden POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const body = await request.json()
    const { id } = body ?? {}

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const deleted = await deleteHiddenSource(id)
    if (!deleted) {
      return NextResponse.json({ error: 'Hidden source not found' }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/crawl/hidden DELETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
