import { MongoClient, ObjectId } from 'mongodb'

let _client: MongoClient | null = null

async function getClient(): Promise<MongoClient> {
  if (!_client) {
    _client = new MongoClient(process.env.MONGODB_CONNECTION_URI!)
    await _client.connect()
  }
  return _client
}

function getDb() {
  return getClient().then(c => c.db(process.env.MONGODB_DATABASE_NAME!))
}

// ---------------------------------------------------------------------------
// Crawl Config (URL-prefix to collection routing)
// ---------------------------------------------------------------------------

export interface CrawlRoute {
  _id?: string
  urlPrefix: string
  targetCollection: string
  label: string
  enabled: boolean
  createdAt: string
}

const CRAWL_CONFIG_COLLECTION = 'crawl_config'

export async function listCrawlRoutes(): Promise<CrawlRoute[]> {
  const db = await getDb()
  return db.collection<CrawlRoute>(CRAWL_CONFIG_COLLECTION).find().toArray() as unknown as CrawlRoute[]
}

export async function upsertCrawlRoute(route: Omit<CrawlRoute, '_id' | 'createdAt'>): Promise<void> {
  const db = await getDb()
  await db.collection(CRAWL_CONFIG_COLLECTION).updateOne(
    { urlPrefix: route.urlPrefix },
    { $set: { ...route, createdAt: new Date().toISOString() } },
    { upsert: true }
  )
}

export async function deleteCrawlRoute(id: string): Promise<boolean> {
  const db = await getDb()
  const result = await db.collection(CRAWL_CONFIG_COLLECTION).deleteOne({ _id: new ObjectId(id) })
  return result.deletedCount > 0
}

// ---------------------------------------------------------------------------
// Crawl Exclusions (URLs / patterns to skip during crawl)
// ---------------------------------------------------------------------------

export interface CrawlExclusion {
  _id?: string
  pattern: string
  type: 'exact' | 'prefix' | 'glob' | 'regex'
  createdAt: string
  createdBy: string
}

const CRAWL_EXCLUSIONS_COLLECTION = 'crawl_exclusions'

export async function listExclusions(): Promise<CrawlExclusion[]> {
  const db = await getDb()
  return db.collection<CrawlExclusion>(CRAWL_EXCLUSIONS_COLLECTION).find().toArray() as unknown as CrawlExclusion[]
}

export async function addExclusion(exclusion: Omit<CrawlExclusion, '_id' | 'createdAt'>): Promise<void> {
  const db = await getDb()
  await db.collection(CRAWL_EXCLUSIONS_COLLECTION).insertOne({
    ...exclusion,
    createdAt: new Date().toISOString(),
  })
}

export async function deleteExclusion(id: string): Promise<boolean> {
  const db = await getDb()
  const result = await db.collection(CRAWL_EXCLUSIONS_COLLECTION).deleteOne({ _id: new ObjectId(id) })
  return result.deletedCount > 0
}

export function isUrlExcluded(url: string, exclusions: CrawlExclusion[]): boolean {
  // Extract pathname so users can write path-only patterns (e.g. /docs/tags/*)
  // instead of having to include the full origin.
  let pathname = url
  try { pathname = new URL(url).pathname } catch { /* use url as-is */ }

  return exclusions.some(ex => {
    switch (ex.type) {
      case 'exact':
        return url === ex.pattern || pathname === ex.pattern
      case 'prefix':
        return url.startsWith(ex.pattern) || pathname.startsWith(ex.pattern)
      case 'glob': {
        // * matches anything within a single path segment (no slashes)
        // ** matches anything including slashes (across segments)
        const regexStr = ex.pattern
          .replace(/[.+^${}()|[\]\\]/g, '\\$&') // escape regex metacharacters
          .replace(/\*\*/g, '\x00')              // temporarily hold ** as null byte
          .replace(/\*/g, '[^/]*')               // * → within-segment wildcard
          .replace(/\x00/g, '.*')               // ** → cross-segment wildcard
        try {
          const re = new RegExp(`^${regexStr}$`)
          return re.test(url) || re.test(pathname)
        } catch { return false }
      }
      case 'regex':
        try {
          const re = new RegExp(ex.pattern)
          return re.test(url) || re.test(pathname)
        } catch { return false }
      default:
        return false
    }
  })
}

// ---------------------------------------------------------------------------
// Hidden Sources (content indexed but link hidden from chat responses)
// ---------------------------------------------------------------------------

export interface HiddenSource {
  _id?: string
  url: string
  createdAt: string
  createdBy: string
}

const HIDDEN_SOURCES_COLLECTION = 'hidden_sources'

export async function listHiddenSources(): Promise<HiddenSource[]> {
  const db = await getDb()
  return db.collection<HiddenSource>(HIDDEN_SOURCES_COLLECTION).find().toArray() as unknown as HiddenSource[]
}

export async function addHiddenSource(url: string, createdBy: string): Promise<void> {
  const db = await getDb()
  await db.collection(HIDDEN_SOURCES_COLLECTION).updateOne(
    { url },
    { $set: { url, createdBy, createdAt: new Date().toISOString() } },
    { upsert: true }
  )
}

export async function deleteHiddenSource(id: string): Promise<boolean> {
  const db = await getDb()
  const result = await db.collection(HIDDEN_SOURCES_COLLECTION).deleteOne({ _id: new ObjectId(id) })
  return result.deletedCount > 0
}

export async function getHiddenSourceUrls(): Promise<Set<string>> {
  const sources = await listHiddenSources()
  return new Set(sources.map(s => s.url))
}

// ---------------------------------------------------------------------------
// Crawl Jobs (track crawl runs)
// ---------------------------------------------------------------------------

export type CrawlJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface CrawlJob {
  _id?: string
  status: CrawlJobStatus
  sitemapUrl: string
  totalUrls: number
  processedUrls: number
  skippedUrls: number
  failedUrls: number
  errors: string[]
  startedAt: string
  completedAt?: string
  triggeredBy: string
  cancelRequested?: boolean
}

const CRAWL_JOBS_COLLECTION = 'crawl_jobs'

export async function createCrawlJob(sitemapUrl: string, triggeredBy: string): Promise<string> {
  const db = await getDb()
  const result = await db.collection(CRAWL_JOBS_COLLECTION).insertOne({
    status: 'pending',
    sitemapUrl,
    totalUrls: 0,
    processedUrls: 0,
    skippedUrls: 0,
    failedUrls: 0,
    errors: [],
    startedAt: new Date().toISOString(),
    triggeredBy,
  })
  return result.insertedId.toString()
}

export async function updateCrawlJob(id: string, update: Partial<CrawlJob>): Promise<void> {
  const db = await getDb()
  await db.collection(CRAWL_JOBS_COLLECTION).updateOne(
    { _id: new ObjectId(id) },
    { $set: update }
  )
}

export async function getCrawlJob(id: string): Promise<CrawlJob | null> {
  const db = await getDb()
  return db.collection<CrawlJob>(CRAWL_JOBS_COLLECTION).findOne(
    { _id: new ObjectId(id) } as any
  ) as unknown as CrawlJob | null
}

export async function requestCancelCrawlJob(id: string): Promise<boolean> {
  const db = await getDb()
  // Match any job that is still running/pending regardless of whether cancelRequested
  // was already set — handles stale jobs left by a server restart.
  const result = await db.collection(CRAWL_JOBS_COLLECTION).updateOne(
    { _id: new ObjectId(id), status: { $in: ['pending', 'running'] } },
    {
      $set: {
        cancelRequested: true,
        status: 'cancelled',
        completedAt: new Date().toISOString(),
      },
    }
  )
  return result.matchedCount > 0
}

export async function listCrawlJobs(limit = 10): Promise<CrawlJob[]> {
  const db = await getDb()
  return db.collection<CrawlJob>(CRAWL_JOBS_COLLECTION)
    .find()
    .sort({ startedAt: -1 })
    .limit(limit)
    .toArray() as unknown as CrawlJob[]
}

// ---------------------------------------------------------------------------
// Crawl Results (per-URL log of what each job processed/skipped/failed)
// ---------------------------------------------------------------------------

export type CrawlResultStatus = 'processed' | 'skipped' | 'failed'
export type SkipReason = 'excluded' | 'no_route' | 'crawl_failed' | 'insufficient_content' | 'embed_failed'

export interface CrawlResult {
  _id?: string
  jobId: string
  url: string
  pathname: string
  status: CrawlResultStatus
  reason?: SkipReason | string
  targetCollection?: string
  chunksCreated?: number
  title?: string
  timestamp: string
}

const CRAWL_RESULTS_COLLECTION = 'crawl_results'

export async function insertCrawlResults(results: Omit<CrawlResult, '_id'>[]): Promise<void> {
  if (results.length === 0) return
  const db = await getDb()
  await db.collection(CRAWL_RESULTS_COLLECTION).insertMany(results)
}

export async function getCrawlResults(
  jobId: string,
  status?: CrawlResultStatus,
  page = 1,
  limit = 50
): Promise<{ results: CrawlResult[]; total: number }> {
  const db = await getDb()
  const filter: Record<string, unknown> = { jobId }
  if (status) filter.status = status
  const col = db.collection<CrawlResult>(CRAWL_RESULTS_COLLECTION)
  const [results, total] = await Promise.all([
    col.find(filter).sort({ timestamp: 1 }).skip((page - 1) * limit).limit(limit).toArray(),
    col.countDocuments(filter),
  ])
  return { results: results as unknown as CrawlResult[], total }
}

// ---------------------------------------------------------------------------
// Collection stats
// ---------------------------------------------------------------------------

export async function getCollectionStats(): Promise<
  { name: string; label: string; count: number; latestCrawledAt?: string }[]
> {
  const db = await getDb()
  const routes = await listCrawlRoutes()

  // Gather unique collections from routes + well-known env-configured ones
  const known = new Map<string, string>([
    [process.env.MONGODB_COLLECTION_NAME || 'chat_docs_prod', 'Main Docs'],
    [process.env.MONGODB_API_COLLECTION_NAME || 'openapis_prod', 'API Documentation'],
    [process.env.MONGODB_EPCC_COLLECTION_NAME || 'epcc_docs_prod', 'EPCC Documentation'],
    [process.env.MONGODB_RFP_COLLECTION_NAME || 'rfp_docs_prod', 'RFP Documents'],
    [process.env.MONGODB_WEBSITE_COLLECTION_NAME || 'website_content_prod', 'Website Content'],
  ])
  for (const r of routes) {
    if (!known.has(r.targetCollection)) known.set(r.targetCollection, r.label)
  }

  const stats = await Promise.all(
    Array.from(known.entries()).map(async ([name, label]) => {
      try {
        const col = db.collection(name)
        const count = await col.countDocuments({})
        const latest = await col.findOne(
          { 'metadata.crawledAt': { $exists: true } },
          { sort: { 'metadata.crawledAt': -1 }, projection: { 'metadata.crawledAt': 1 } }
        )
        return {
          name,
          label,
          count,
          latestCrawledAt: (latest as any)?.metadata?.crawledAt,
        }
      } catch {
        return { name, label, count: 0 }
      }
    })
  )
  return stats
}
// ---------------------------------------------------------------------------

export interface RfpUpload {
  _id?: string
  filename: string
  originalName: string
  fileSize: number
  chunksCreated: number
  uploadedBy: string
  uploadedAt: string
}

const RFP_UPLOADS_COLLECTION = 'rfp_uploads'

export async function trackRfpUpload(upload: Omit<RfpUpload, '_id'>): Promise<string> {
  const db = await getDb()
  const result = await db.collection(RFP_UPLOADS_COLLECTION).insertOne(upload)
  return result.insertedId.toString()
}

export async function listRfpUploads(): Promise<RfpUpload[]> {
  const db = await getDb()
  return db.collection<RfpUpload>(RFP_UPLOADS_COLLECTION)
    .find()
    .sort({ uploadedAt: -1 })
    .toArray() as unknown as RfpUpload[]
}

export async function deleteRfpUpload(id: string): Promise<boolean> {
  const db = await getDb()
  const upload = await db.collection<RfpUpload>(RFP_UPLOADS_COLLECTION)
    .findOne({ _id: new ObjectId(id) } as any) as unknown as RfpUpload | null
  if (!upload) return false

  const rfpCollection = process.env.MONGODB_RFP_COLLECTION_NAME || 'rfp_docs_prod'
  await db.collection(rfpCollection).deleteMany({ 'metadata.uploadId': id })
  await db.collection(RFP_UPLOADS_COLLECTION).deleteOne({ _id: new ObjectId(id) })
  return true
}
