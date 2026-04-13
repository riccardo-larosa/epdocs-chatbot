import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { runCrawlJob } from '@/lib/sitemapCrawler'
import { listCrawlJobs, listCrawlRoutes, upsertCrawlRoute } from '@/lib/crawlConfig'

// Default routing rules seeded from env vars if nothing is configured yet
const DEFAULT_ROUTES = [
  {
    urlPrefix: '/docs/',
    targetCollection: process.env.MONGODB_API_COLLECTION_NAME || 'openapis_prod',
    label: 'API Documentation',
    enabled: true,
  },
  {
    urlPrefix: '/guides/',
    targetCollection: process.env.MONGODB_EPCC_COLLECTION_NAME || 'epcc_docs_prod',
    label: 'EPCC Documentation',
    enabled: true,
  },
]

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const sitemapUrl = body.sitemapUrl || process.env.DOCS_SITEMAP_URL

    if (!sitemapUrl) {
      return NextResponse.json(
        { error: 'sitemapUrl is required (or set DOCS_SITEMAP_URL env var)' },
        { status: 400 }
      )
    }

    // Block if a crawl is already running or pending
    const recentJobs = await listCrawlJobs(5)
    const activeJob = recentJobs.find(j => j.status === 'running' || j.status === 'pending')
    if (activeJob) {
      return NextResponse.json(
        { error: 'A crawl is already in progress', jobId: activeJob._id },
        { status: 409 }
      )
    }

    // Auto-seed default routing rules if none exist yet
    const existingRoutes = await listCrawlRoutes()
    if (existingRoutes.length === 0) {
      for (const route of DEFAULT_ROUTES) {
        await upsertCrawlRoute(route)
      }
    }

    const jobId = await runCrawlJob(sitemapUrl, 'admin')

    return NextResponse.json({
      ok: true,
      jobId,
      message: 'Crawl job started. Poll /api/admin/crawl/status?jobId=<id> for progress.',
    })
  } catch (err) {
    console.error('[admin/crawl/trigger POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
