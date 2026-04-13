import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { getCrawlJob, listCrawlJobs } from '@/lib/crawlConfig'

export async function GET(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const jobId = request.nextUrl.searchParams.get('jobId')

    if (jobId) {
      const job = await getCrawlJob(jobId)
      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 })
      }
      return NextResponse.json({ job })
    }

    const jobs = await listCrawlJobs(20)
    return NextResponse.json({ jobs })
  } catch (err) {
    console.error('[admin/crawl/status GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
