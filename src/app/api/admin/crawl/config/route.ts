import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { listCrawlRoutes, upsertCrawlRoute, deleteCrawlRoute } from '@/lib/crawlConfig'

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const routes = await listCrawlRoutes()
    return NextResponse.json({ routes })
  } catch (err) {
    console.error('[admin/crawl/config GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const body = await request.json()
    const { urlPrefix, targetCollection, label, enabled = true } = body ?? {}

    if (!urlPrefix || !targetCollection || !label) {
      return NextResponse.json(
        { error: 'urlPrefix, targetCollection, and label are required' },
        { status: 400 }
      )
    }

    await upsertCrawlRoute({ urlPrefix, targetCollection, label, enabled })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/crawl/config POST]', err)
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

    const deleted = await deleteCrawlRoute(id)
    if (!deleted) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/crawl/config DELETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
