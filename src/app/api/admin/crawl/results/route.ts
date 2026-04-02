import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { getCrawlResults, type CrawlResultStatus } from '@/lib/crawlConfig'

export async function GET(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const params = request.nextUrl.searchParams
    const jobId = params.get('jobId')
    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
    }

    const status = params.get('status') as CrawlResultStatus | null
    const page = Math.max(1, parseInt(params.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(params.get('limit') || '50', 10)))

    const { results, total } = await getCrawlResults(jobId, status ?? undefined, page, limit)

    return NextResponse.json({
      results,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (err) {
    console.error('[admin/crawl/results GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
