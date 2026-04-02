'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import ThemeToggle from '@/components/ThemeToggle'

type Tab = 'crawl' | 'exclusions' | 'hidden' | 'rfp' | 'users'

interface CrawlRoute {
  _id: string
  urlPrefix: string
  targetCollection: string
  label: string
  enabled: boolean
}

interface CrawlJob {
  _id: string
  status: string
  sitemapUrl: string
  totalUrls: number
  processedUrls: number
  skippedUrls: number
  failedUrls: number
  errors: string[]
  startedAt: string
  completedAt?: string
  cancelRequested?: boolean
}

interface CrawlResult {
  _id: string
  url: string
  pathname: string
  status: 'processed' | 'skipped' | 'failed'
  reason?: string
  targetCollection?: string
  chunksCreated?: number
  title?: string
  timestamp: string
}

interface CollectionStat {
  name: string
  label: string
  count: number
  latestCrawledAt?: string
}

interface Exclusion {
  _id: string
  pattern: string
  type: string
  createdAt: string
}

interface HiddenSource {
  _id: string
  url: string
  createdAt: string
}

interface RfpUpload {
  _id: string
  filename: string
  originalName: string
  fileSize: number
  chunksCreated: number
  uploadedBy: string
  uploadedAt: string
}

interface User {
  username: string
  role: string
  active: boolean
  createdAt: string
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h2>
      {children}
    </section>
  )
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    gray: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors[color] || colors.gray}`}>
      {children}
    </span>
  )
}

function ErrorBanner({ message }: { message: string }) {
  if (!message) return null
  return (
    <p className="mb-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
      {message}
    </p>
  )
}

const btnPrimary =
  'px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium'
const btnDanger =
  'px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed'
const btnSecondary =
  'px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'
const btnLink =
  'px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50'
const inputCls =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm disabled:opacity-50'

// ---------------------------------------------------------------------------
// Tab: Crawl
// ---------------------------------------------------------------------------

function CrawlTab() {
  const [routes, setRoutes] = useState<CrawlRoute[]>([])
  const [jobs, setJobs] = useState<CrawlJob[]>([])
  const [loading, setLoading] = useState(true)
  const [crawling, setCrawling] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState('')
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Route form
  const [rPrefix, setRPrefix] = useState('')
  const [rCollection, setRCollection] = useState('')
  const [rLabel, setRLabel] = useState('')

  const activeJob = jobs.find(j => j.status === 'running' || j.status === 'pending')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [routeRes, jobRes] = await Promise.all([
        fetch('/api/admin/crawl/config'),
        fetch('/api/admin/crawl/status'),
      ])
      if (routeRes.status === 403 || jobRes.status === 403) {
        window.location.href = '/rfp/login?next=/admin'
        return
      }
      const routeData = await routeRes.json()
      const jobData = await jobRes.json()
      setRoutes(routeData.routes ?? [])
      setJobs(jobData.jobs ?? [])
    } catch {
      setError('Failed to load crawl data')
    } finally {
      setLoading(false)
    }
  }, [])

  // Poll every 5s while a job is running
  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/crawl/status')
      if (!res.ok) return
      const data = await res.json()
      setJobs(data.jobs ?? [])
    } catch {
      // ignore poll errors
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (activeJob) {
      pollRef.current = setInterval(fetchJobs, 5000)
    } else {
      if (pollRef.current) clearInterval(pollRef.current)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [activeJob, fetchJobs])

  const triggerCrawl = async () => {
    setCrawling(true)
    setError('')
    try {
      const res = await fetch('/api/admin/crawl/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to trigger crawl')
        return
      }
      // Refresh routes (may have been auto-seeded) and jobs
      await fetchData()
    } catch {
      setError('Failed to trigger crawl')
    } finally {
      setCrawling(false)
    }
  }

  const stopCrawl = async () => {
    setCancelling(true)
    setError('')
    try {
      const res = await fetch('/api/admin/crawl/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to stop crawl')
      } else {
        // Immediately mark running/pending jobs as cancelled in local state so the
        // UI clears without waiting for the next poll cycle.
        setJobs(prev =>
          prev.map(j =>
            j.status === 'running' || j.status === 'pending'
              ? { ...j, status: 'cancelled', cancelRequested: true }
              : j
          )
        )
        // Then sync with the real server state
        await fetchJobs()
      }
    } catch {
      setError('Failed to stop crawl')
    } finally {
      setCancelling(false)
    }
  }

  const addRoute = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const res = await fetch('/api/admin/crawl/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urlPrefix: rPrefix, targetCollection: rCollection, label: rLabel, enabled: true }),
      })
      if (res.ok) { setRPrefix(''); setRCollection(''); setRLabel(''); fetchData() }
      else { const d = await res.json(); setError(d.error || 'Failed to add route') }
    } catch { setError('Failed to add route') }
  }

  const removeRoute = async (id: string) => {
    try {
      await fetch('/api/admin/crawl/config', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      fetchData()
    } catch { setError('Failed to delete route') }
  }

  if (loading) return <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>

  return (
    <div className="space-y-6">
      <ErrorBanner message={error} />

      <SectionCard title="Trigger Crawl">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Fetch the sitemap, apply routing rules and exclusions, then crawl and index all matching pages.
          If no routing rules exist yet, defaults will be seeded automatically (/docs/ and /guides/).
        </p>
        {routes.length === 0 && (
          <p className="mb-3 text-sm text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-2 rounded-lg">
            No routing rules configured. Starting a crawl will auto-seed default rules for /docs/ and /guides/.
          </p>
        )}
        {activeJob && (
          <p className="mb-3 text-sm text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
            Crawl in progress — {activeJob.processedUrls} processed, {activeJob.skippedUrls} skipped, {activeJob.failedUrls} failed of {activeJob.totalUrls} total. Auto-refreshing every 5s.
          </p>
        )}
        <div className="flex gap-3 items-center">
          <button
            onClick={triggerCrawl}
            disabled={crawling || !!activeJob}
            className={btnPrimary}
          >
            {crawling ? 'Starting...' : activeJob ? 'Crawl Running...' : 'Start Crawl'}
          </button>
          {activeJob && (
            <button
              onClick={stopCrawl}
              disabled={cancelling}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {cancelling ? 'Stopping...' : activeJob.cancelRequested ? 'Force Stop' : 'Stop Crawl'}
            </button>
          )}
        </div>
      </SectionCard>

      <SectionCard title="URL Routing Rules">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Map URL path prefixes from the sitemap to MongoDB collections.
        </p>
        <form onSubmit={addRoute} className="flex flex-wrap gap-3 items-end mb-4">
          <div className="flex-1 min-w-[140px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL Prefix</label>
            <input value={rPrefix} onChange={e => setRPrefix(e.target.value)} placeholder="/docs/" className={inputCls} required />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Collection</label>
            <input value={rCollection} onChange={e => setRCollection(e.target.value)} placeholder="openapis_prod" className={inputCls} required />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Label</label>
            <input value={rLabel} onChange={e => setRLabel(e.target.value)} placeholder="API Docs" className={inputCls} required />
          </div>
          <button type="submit" className={btnPrimary}>Add</button>
        </form>
        {routes.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No routing rules configured yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 pr-4 font-medium text-gray-700 dark:text-gray-300">Prefix</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-700 dark:text-gray-300">Collection</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-700 dark:text-gray-300">Label</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-700 dark:text-gray-300">Status</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {routes.map(r => (
                <tr key={r._id} className="border-b border-gray-100 dark:border-gray-700/50">
                  <td className="py-2 pr-4 font-mono text-gray-900 dark:text-white">{r.urlPrefix}</td>
                  <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">{r.targetCollection}</td>
                  <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">{r.label}</td>
                  <td className="py-2 pr-4"><Badge color={r.enabled ? 'green' : 'gray'}>{r.enabled ? 'enabled' : 'disabled'}</Badge></td>
                  <td className="py-2 text-right">
                    <button onClick={() => removeRoute(r._id)} className={btnDanger}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      <SectionCard title="Recent Crawl Jobs">
        {jobs.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No crawl jobs yet.</p>
        ) : (
          <div className="space-y-3">
            {jobs.map(j => (
              <JobCard key={j._id} job={j} />
            ))}
          </div>
        )}
      </SectionCard>

      <CollectionStatsSection />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Job card with inline results viewer
// ---------------------------------------------------------------------------

type ResultFilter = 'all' | 'processed' | 'skipped' | 'failed'

function JobCard({ job: j }: { job: CrawlJob }) {
  const [expanded, setExpanded] = useState(false)
  const [filter, setFilter] = useState<ResultFilter>('all')
  const [results, setResults] = useState<CrawlResult[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loadingResults, setLoadingResults] = useState(false)

  const fetchResults = useCallback(async (f: ResultFilter, p: number) => {
    setLoadingResults(true)
    try {
      const params = new URLSearchParams({ jobId: j._id, page: String(p), limit: '50' })
      if (f !== 'all') params.set('status', f)
      const res = await fetch(`/api/admin/crawl/results?${params}`)
      const data = await res.json()
      setResults(data.results ?? [])
      setTotal(data.total ?? 0)
      setTotalPages(data.totalPages ?? 1)
    } finally {
      setLoadingResults(false)
    }
  }, [j._id])

  const handleExpand = () => {
    const next = !expanded
    setExpanded(next)
    if (next) fetchResults(filter, 1)
  }

  const handleFilter = (f: ResultFilter) => {
    setFilter(f)
    setPage(1)
    fetchResults(f, 1)
  }

  const handlePage = (p: number) => {
    setPage(p)
    fetchResults(filter, p)
  }

  const statusColor = j.status === 'completed' ? 'green' : j.status === 'running' ? 'blue' : j.status === 'failed' ? 'red' : j.status === 'cancelled' ? 'gray' : 'yellow'

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge color={statusColor}>{j.status}</Badge>
            <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(j.startedAt).toLocaleString()}</span>
          </div>
          <button
            onClick={handleExpand}
            className={btnLink.replace('text-sm', 'text-xs')}
          >
            {expanded ? 'Hide results' : 'View results'}
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2 text-sm">
          <div><span className="text-gray-500 dark:text-gray-400">Total:</span> {j.totalUrls}</div>
          <div><span className="text-emerald-600 dark:text-emerald-400">Processed:</span> {j.processedUrls}</div>
          <div><span className="text-gray-500 dark:text-gray-400">Skipped:</span> {j.skippedUrls}</div>
          <div><span className="text-red-500">Failed:</span> {j.failedUrls}</div>
        </div>
        {j.errors.length > 0 && (
          <details className="mt-2">
            <summary className="text-xs text-red-600 dark:text-red-400 cursor-pointer">
              {j.errors.length} error(s)
            </summary>
            <ul className="mt-1 text-xs text-red-500 space-y-1">
              {j.errors.slice(0, 10).map((e, i) => <li key={i} className="truncate">{e}</li>)}
            </ul>
          </details>
        )}
      </div>

      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          {/* Filter tabs */}
          <div className="flex gap-1 px-4 pt-3 pb-0 border-b border-gray-200 dark:border-gray-700">
            {(['all', 'processed', 'skipped', 'failed'] as ResultFilter[]).map(f => (
              <button
                key={f}
                onClick={() => handleFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors capitalize ${
                  filter === f
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
              >
                {f}
              </button>
            ))}
            <span className="ml-auto self-center text-xs text-gray-400 pr-1">{total} results</span>
          </div>

          {/* Results table */}
          <div className="overflow-x-auto">
            {loadingResults ? (
              <p className="p-4 text-sm text-gray-500 dark:text-gray-400">Loading...</p>
            ) : results.length === 0 ? (
              <p className="p-4 text-sm text-gray-500 dark:text-gray-400">No results for this filter.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <th className="text-left py-2 px-4 font-medium text-gray-700 dark:text-gray-300 w-12">Status</th>
                    <th className="text-left py-2 px-4 font-medium text-gray-700 dark:text-gray-300">URL / Title</th>
                    <th className="text-left py-2 px-4 font-medium text-gray-700 dark:text-gray-300 w-40">Collection</th>
                    <th className="text-left py-2 px-4 font-medium text-gray-700 dark:text-gray-300 w-28">Reason / Chunks</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(r => (
                    <tr key={r._id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-white dark:hover:bg-gray-800/50">
                      <td className="py-2 px-4">
                        <Badge color={r.status === 'processed' ? 'green' : r.status === 'failed' ? 'red' : 'gray'}>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="py-2 px-4">
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline block truncate max-w-lg"
                          title={r.url}
                        >
                          {r.title || r.pathname}
                        </a>
                        {r.title && (
                          <span className="text-gray-400 truncate block max-w-lg">{r.pathname}</span>
                        )}
                      </td>
                      <td className="py-2 px-4 text-gray-600 dark:text-gray-400 truncate">
                        {r.targetCollection || '—'}
                      </td>
                      <td className="py-2 px-4 text-gray-500 dark:text-gray-400">
                        {r.status === 'processed'
                          ? `${r.chunksCreated} chunk${r.chunksCreated === 1 ? '' : 's'}`
                          : r.reason || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePage(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePage(page + 1)}
                  disabled={page >= totalPages}
                  className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Collection stats panel
// ---------------------------------------------------------------------------

function CollectionStatsSection() {
  const [stats, setStats] = useState<CollectionStat[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchStats = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/crawl/collections')
      const data = await res.json()
      setStats(data.stats ?? [])
    } catch {
      setError('Failed to load collection stats')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStats() }, [])

  return (
    <SectionCard title="Collection Stats">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Current document counts in each MongoDB collection.
        </p>
        <button onClick={fetchStats} disabled={loading} className={btnLink.replace('text-sm', 'text-xs')}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
      {loading && stats.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 pr-4 font-medium text-gray-700 dark:text-gray-300">Collection</th>
              <th className="text-left py-2 pr-4 font-medium text-gray-700 dark:text-gray-300">Name</th>
              <th className="text-right py-2 pr-4 font-medium text-gray-700 dark:text-gray-300">Documents</th>
              <th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">Last Crawled</th>
            </tr>
          </thead>
          <tbody>
            {stats.map(s => (
              <tr key={s.name} className="border-b border-gray-100 dark:border-gray-700/50">
                <td className="py-2 pr-4 text-gray-900 dark:text-white font-medium">{s.label}</td>
                <td className="py-2 pr-4 font-mono text-gray-500 dark:text-gray-400 text-xs">{s.name}</td>
                <td className="py-2 pr-4 text-right">
                  <span className={`font-semibold ${s.count > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
                    {s.count.toLocaleString()}
                  </span>
                </td>
                <td className="py-2 text-gray-500 dark:text-gray-400 text-xs">
                  {s.latestCrawledAt ? new Date(s.latestCrawledAt).toLocaleString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </SectionCard>
  )
}

// ---------------------------------------------------------------------------
// Tab: Exclusions
// ---------------------------------------------------------------------------

function ExclusionsTab() {
  const [exclusions, setExclusions] = useState<Exclusion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pattern, setPattern] = useState('')
  const [type, setType] = useState<'exact' | 'prefix' | 'glob' | 'regex'>('glob')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/crawl/exclusions')
      const data = await res.json()
      setExclusions(data.exclusions ?? [])
    } catch { setError('Failed to load exclusions') } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const addExclusion = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const res = await fetch('/api/admin/crawl/exclusions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pattern, type }),
      })
      if (res.ok) { setPattern(''); fetchData() }
      else { const d = await res.json(); setError(d.error) }
    } catch { setError('Failed to add exclusion') }
  }

  const remove = async (id: string) => {
    try {
      await fetch('/api/admin/crawl/exclusions', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      fetchData()
    } catch { setError('Failed to delete') }
  }

  if (loading) return <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>

  return (
    <div className="space-y-6">
      <ErrorBanner message={error} />
      <SectionCard title="URL Exclusions">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
          URLs matching these patterns will be skipped during crawl. Patterns can be full URLs or path-only (e.g. <code className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">/docs/tags/*</code>).
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          <strong>Glob:</strong> <code className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">*</code> matches within a segment &nbsp;·&nbsp;
          <code className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">**</code> matches across segments &nbsp;·&nbsp;
          <strong>Prefix:</strong> matches any URL starting with the value &nbsp;·&nbsp;
          <strong>Regex:</strong> full regular expression
        </p>
        <form onSubmit={addExclusion} className="flex flex-wrap gap-3 items-end mb-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pattern</label>
            <input
              value={pattern}
              onChange={e => setPattern(e.target.value)}
              placeholder={
                type === 'glob'   ? '/docs/tags/*  or  /docs/legacy/**' :
                type === 'prefix' ? '/docs/legacy/' :
                type === 'exact'  ? 'https://elasticpath.dev/docs/legacy/old-page' :
                                    '/docs/tags/.*'
              }
              className={inputCls}
              required
            />
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
            <select value={type} onChange={e => setType(e.target.value as any)} className={inputCls}>
              <option value="glob">Glob</option>
              <option value="prefix">Prefix</option>
              <option value="exact">Exact</option>
              <option value="regex">Regex</option>
            </select>
          </div>
          <button type="submit" className={btnPrimary}>Add Exclusion</button>
        </form>
        {exclusions.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No exclusions configured.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 pr-4 font-medium text-gray-700 dark:text-gray-300">Pattern</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-700 dark:text-gray-300">Type</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-700 dark:text-gray-300">Created</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {exclusions.map(ex => (
                <tr key={ex._id} className="border-b border-gray-100 dark:border-gray-700/50">
                  <td className="py-2 pr-4 font-mono text-gray-900 dark:text-white truncate max-w-xs">{ex.pattern}</td>
                  <td className="py-2 pr-4"><Badge color="gray">{ex.type}</Badge></td>
                  <td className="py-2 pr-4 text-gray-500 dark:text-gray-400">{new Date(ex.createdAt).toLocaleDateString()}</td>
                  <td className="py-2 text-right"><button onClick={() => remove(ex._id)} className={btnDanger}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab: Hidden Sources
// ---------------------------------------------------------------------------

function HiddenSourcesTab() {
  const [sources, setSources] = useState<HiddenSource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [url, setUrl] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/crawl/hidden')
      const data = await res.json()
      setSources(data.sources ?? [])
    } catch { setError('Failed to load hidden sources') } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const res = await fetch('/api/admin/crawl/hidden', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      if (res.ok) { setUrl(''); fetchData() }
      else { const d = await res.json(); setError(d.error) }
    } catch { setError('Failed to add') }
  }

  const remove = async (id: string) => {
    try {
      await fetch('/api/admin/crawl/hidden', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      fetchData()
    } catch { setError('Failed to delete') }
  }

  if (loading) return <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>

  return (
    <div className="space-y-6">
      <ErrorBanner message={error} />
      <SectionCard title="Hidden Sources">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Content from these URLs is indexed and searchable, but the source link is hidden from chat responses.
        </p>
        <form onSubmit={add} className="flex gap-3 items-end mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL</label>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://elasticpath.dev/docs/internal-page" className={inputCls} required />
          </div>
          <button type="submit" className={btnPrimary}>Hide Source</button>
        </form>
        {sources.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No hidden sources configured.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 pr-4 font-medium text-gray-700 dark:text-gray-300">URL</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-700 dark:text-gray-300">Created</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {sources.map(s => (
                <tr key={s._id} className="border-b border-gray-100 dark:border-gray-700/50">
                  <td className="py-2 pr-4 font-mono text-gray-900 dark:text-white truncate max-w-md">{s.url}</td>
                  <td className="py-2 pr-4 text-gray-500 dark:text-gray-400">{new Date(s.createdAt).toLocaleDateString()}</td>
                  <td className="py-2 text-right"><button onClick={() => remove(s._id)} className={btnDanger}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab: RFP Uploads
// ---------------------------------------------------------------------------

function RfpTab() {
  const [uploads, setUploads] = useState<RfpUpload[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/rfp/documents')
      const data = await res.json()
      setUploads(data.uploads ?? [])
    } catch { setError('Failed to load uploads') } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleUpload = async () => {
    const files = fileRef.current?.files
    if (!files || files.length === 0) return
    setUploading(true)
    setError('')
    setSuccessMsg('')
    try {
      const formData = new FormData()
      for (const file of Array.from(files)) {
        formData.append('files', file)
      }
      const res = await fetch('/api/admin/rfp/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (res.ok) {
        const total = data.results?.reduce((s: number, r: any) => s + r.chunks, 0) ?? 0
        setSuccessMsg(`Uploaded ${data.results?.length} file(s), ${total} chunks created.`)
        if (fileRef.current) fileRef.current.value = ''
        fetchData()
      } else {
        setError(data.error || 'Upload failed')
      }
    } catch { setError('Upload failed') } finally { setUploading(false) }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this upload and all associated document chunks?')) return
    try {
      const res = await fetch('/api/admin/rfp/documents', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      if (res.ok) fetchData()
      else { const d = await res.json(); setError(d.error) }
    } catch { setError('Failed to delete') }
  }

  if (loading) return <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>

  return (
    <div className="space-y-6">
      <ErrorBanner message={error} />
      {successMsg && (
        <p className="mb-4 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-lg">
          {successMsg}
        </p>
      )}

      <SectionCard title="Upload RFP Documents">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Upload .md, .mdx, or .txt files. They will be chunked, embedded, and stored in the RFP collection.
        </p>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".md,.mdx,.txt"
              disabled={uploading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300 disabled:opacity-50"
            />
          </div>
          <button onClick={handleUpload} disabled={uploading} className={btnPrimary}>
            {uploading ? 'Uploading...' : 'Upload & Process'}
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Uploaded RFP Documents">
        {uploads.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No uploads yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 pr-4 font-medium text-gray-700 dark:text-gray-300">Filename</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-700 dark:text-gray-300">Size</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-700 dark:text-gray-300">Chunks</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-700 dark:text-gray-300">Uploaded</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {uploads.map(u => (
                <tr key={u._id} className="border-b border-gray-100 dark:border-gray-700/50">
                  <td className="py-2 pr-4 text-gray-900 dark:text-white">{u.originalName}</td>
                  <td className="py-2 pr-4 text-gray-500 dark:text-gray-400">{(u.fileSize / 1024).toFixed(1)} KB</td>
                  <td className="py-2 pr-4 text-gray-500 dark:text-gray-400">{u.chunksCreated}</td>
                  <td className="py-2 pr-4 text-gray-500 dark:text-gray-400">{new Date(u.uploadedAt).toLocaleDateString()}</td>
                  <td className="py-2 text-right"><button onClick={() => remove(u._id)} className={btnDanger}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab: Users (reuses existing user management logic)
// ---------------------------------------------------------------------------

function UsersTab() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user')
  const [formLoading, setFormLoading] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/rfp/users')
      const data = await res.json()
      setUsers(data.users ?? [])
    } catch { setError('Failed to load users') } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const addUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/rfp/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole }),
      })
      if (res.ok) { setNewUsername(''); setNewPassword(''); setNewRole('user'); fetchUsers() }
      else { const d = await res.json(); setError(d.error) }
    } catch { setError('Failed to add user') } finally { setFormLoading(false) }
  }

  const deleteUser = async (username: string) => {
    if (!confirm(`Delete user "${username}"?`)) return
    try {
      await fetch('/api/admin/rfp/users', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username }) })
      fetchUsers()
    } catch { setError('Failed to delete user') }
  }

  if (loading) return <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>

  return (
    <div className="space-y-6">
      <ErrorBanner message={error} />
      <SectionCard title="Add User">
        <form onSubmit={addUser} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
            <input value={newUsername} onChange={e => setNewUsername(e.target.value)} className={inputCls} required disabled={formLoading} />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputCls} required disabled={formLoading} />
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
            <select value={newRole} onChange={e => setNewRole(e.target.value as any)} className={inputCls} disabled={formLoading}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button type="submit" disabled={formLoading} className={btnPrimary}>{formLoading ? 'Adding...' : 'Add User'}</button>
        </form>
      </SectionCard>

      <SectionCard title="Users">
        {users.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No users yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 pr-4 font-medium text-gray-700 dark:text-gray-300">Username</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-700 dark:text-gray-300">Role</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-700 dark:text-gray-300">Status</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-700 dark:text-gray-300">Created</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.username} className="border-b border-gray-100 dark:border-gray-700/50">
                  <td className="py-2 pr-4 text-gray-900 dark:text-white font-medium">{u.username}</td>
                  <td className="py-2 pr-4"><Badge color={u.role === 'admin' ? 'purple' : 'gray'}>{u.role}</Badge></td>
                  <td className="py-2 pr-4"><Badge color={u.active ? 'green' : 'red'}>{u.active ? 'active' : 'inactive'}</Badge></td>
                  <td className="py-2 pr-4 text-gray-500 dark:text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="py-2 text-right"><button onClick={() => deleteUser(u.username)} className={btnDanger}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Admin Page
// ---------------------------------------------------------------------------

const TABS: { id: Tab; label: string }[] = [
  { id: 'crawl', label: 'Crawl' },
  { id: 'exclusions', label: 'Exclusions' },
  { id: 'hidden', label: 'Hidden Sources' },
  { id: 'rfp', label: 'RFP Uploads' },
  { id: 'users', label: 'Users' },
]

export default function AdminPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('crawl')

  const handleLogout = async () => {
    await fetch('/api/auth/rfp/logout', { method: 'POST' })
    router.push('/rfp/login')
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Admin Dashboard</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Documentation crawl, RFP management &amp; users</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/rfp')} className={btnLink}>
              RFP Chat
            </button>
            <ThemeToggle />
            <button onClick={handleLogout} className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              Sign out
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-4">
          <nav className="flex gap-1 -mb-px">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.id
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto w-full px-4 py-8">
        {tab === 'crawl' && <CrawlTab />}
        {tab === 'exclusions' && <ExclusionsTab />}
        {tab === 'hidden' && <HiddenSourcesTab />}
        {tab === 'rfp' && <RfpTab />}
        {tab === 'users' && <UsersTab />}
      </main>
    </div>
  )
}
