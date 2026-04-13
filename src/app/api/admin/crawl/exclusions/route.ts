import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { listExclusions, addExclusion, deleteExclusion } from '@/lib/crawlConfig'

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const exclusions = await listExclusions()
    return NextResponse.json({ exclusions })
  } catch (err) {
    console.error('[admin/crawl/exclusions GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const body = await request.json()
    const { pattern, type } = body ?? {}

    if (!pattern || !['exact', 'prefix', 'regex'].includes(type)) {
      return NextResponse.json(
        { error: 'pattern and type (exact|prefix|regex) are required' },
        { status: 400 }
      )
    }

    await addExclusion({ pattern, type, createdBy: 'admin' })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/crawl/exclusions POST]', err)
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

    const deleted = await deleteExclusion(id)
    if (!deleted) {
      return NextResponse.json({ error: 'Exclusion not found' }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/crawl/exclusions DELETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
