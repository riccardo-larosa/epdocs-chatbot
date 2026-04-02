import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { getCollectionStats } from '@/lib/crawlConfig'

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const stats = await getCollectionStats()
    return NextResponse.json({ stats })
  } catch (err) {
    console.error('[admin/crawl/collections GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
