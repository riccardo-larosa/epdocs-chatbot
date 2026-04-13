import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { requestCancelCrawlJob, listCrawlJobs } from '@/lib/crawlConfig'

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    let jobId: string | undefined = body.jobId

    // If no jobId provided, cancel the currently active job
    if (!jobId) {
      const jobs = await listCrawlJobs(5)
      const active = jobs.find(j => j.status === 'running' || j.status === 'pending')
      if (!active?._id) {
        return NextResponse.json({ error: 'No active crawl job found' }, { status: 404 })
      }
      jobId = active._id
    }

    const cancelled = await requestCancelCrawlJob(jobId)
    if (!cancelled) {
      return NextResponse.json(
        { error: 'Job not found or not in a cancellable state' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ok: true,
      jobId,
      message: 'Cancel requested. The job will stop after the current batch completes.',
    })
  } catch (err) {
    console.error('[admin/crawl/cancel POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
