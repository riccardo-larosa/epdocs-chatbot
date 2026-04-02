import { MongoClient } from 'mongodb'
import { OpenAIEmbeddings } from '@langchain/openai'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { XMLParser } from 'fast-xml-parser'
import {
  listCrawlRoutes,
  listExclusions,
  isUrlExcluded,
  createCrawlJob,
  updateCrawlJob,
  getCrawlJob,
  insertCrawlResults,
  type CrawlRoute,
  type CrawlExclusion,

} from './crawlConfig'

interface SitemapEntry {
  loc: string
  lastmod?: string
}

interface RoutedUrl {
  url: string
  pathname: string
  targetCollection: string
  label: string
  lastmod?: string
}

interface SkippedUrl {
  url: string
  pathname: string
  reason: 'excluded' | 'no_route'
}

// Reuse the HTML content extraction from the existing web scraper
function extractTextContent(html: string): string {
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')

  text = text
    .replace(/<[^>]*(?:class|id)="[^"]*(?:nav|menu|header|footer|sidebar|breadcrumb|pagination|cookie|banner|advertisement|ad-|ads-)[^"]*"[^>]*>[\s\S]*?<\/[^>]*>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')

  text = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/td>/gi, ' | ')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<[^>]*>/g, '')

  text = text
    .replace(/\n\s*\n/g, '\n\n')
    .replace(/\s+/g, ' ')
    .replace(/^\s*[\w\s]*(?:copyright|©|terms|privacy|cookies?)[\w\s]*$/gmi, '')
    .replace(/^\s*(?:home|contact|about|login|register|search|menu)[\s\|]*$/gmi, '')
    .trim()

  const lines = text.split('\n').filter(line => {
    const trimmed = line.trim()
    return trimmed.length > 10 &&
      !(/^\s*[\d\w\s]{1,20}\s*$/.test(trimmed)) &&
      !(trimmed.match(/^[^\w]*$/))
  })

  return lines.join('\n')
}

function extractTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (titleMatch) return titleMatch[1].replace(/\s*\|\s*.*$/, '').trim()

  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
  if (h1Match) return h1Match[1].trim()

  const metaMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i)
  if (metaMatch) return metaMatch[1].trim()

  return 'Untitled'
}

export async function fetchSitemap(sitemapUrl: string): Promise<SitemapEntry[]> {
  const response = await fetch(sitemapUrl, {
    headers: { 'User-Agent': 'EPDocsChatbot/1.0 (Sitemap Crawler)' },
    signal: AbortSignal.timeout(30000),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch sitemap: ${response.status} ${response.statusText}`)
  }

  const xml = await response.text()
  const parser = new XMLParser({ ignoreAttributes: false })
  const parsed = parser.parse(xml)

  const urlset = parsed.urlset?.url
  if (!urlset) {
    // Could be a sitemap index pointing to child sitemaps
    const sitemapIndex = parsed.sitemapindex?.sitemap
    if (sitemapIndex) {
      const entries: SitemapEntry[] = []
      const sitemaps = Array.isArray(sitemapIndex) ? sitemapIndex : [sitemapIndex]
      for (const sm of sitemaps) {
        const childEntries = await fetchSitemap(sm.loc)
        entries.push(...childEntries)
      }
      return entries
    }
    return []
  }

  const urls = Array.isArray(urlset) ? urlset : [urlset]
  return urls.map((entry: any) => ({
    loc: entry.loc,
    lastmod: entry.lastmod,
  }))
}

export function routeUrls(
  entries: SitemapEntry[],
  routes: CrawlRoute[],
  exclusions: CrawlExclusion[],
): { routed: RoutedUrl[]; skipped: SkippedUrl[] } {
  const routed: RoutedUrl[] = []
  const skipped: SkippedUrl[] = []
  const enabledRoutes = routes.filter(r => r.enabled)

  for (const entry of entries) {
    let pathname: string
    try {
      pathname = new URL(entry.loc).pathname
    } catch {
      skipped.push({ url: entry.loc, pathname: entry.loc, reason: 'no_route' })
      continue
    }

    if (isUrlExcluded(entry.loc, exclusions)) {
      skipped.push({ url: entry.loc, pathname, reason: 'excluded' })
      continue
    }

    const matchedRoute = enabledRoutes.find(r => pathname.startsWith(r.urlPrefix))
    if (matchedRoute) {
      routed.push({
        url: entry.loc,
        pathname,
        targetCollection: matchedRoute.targetCollection,
        label: matchedRoute.label,
        lastmod: entry.lastmod,
      })
    } else {
      skipped.push({ url: entry.loc, pathname, reason: 'no_route' })
    }
  }

  return { routed, skipped }
}

async function crawlPage(url: string): Promise<{ title: string; content: string } | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) return null

    const contentType = response.headers.get('content-type')
    if (!contentType?.includes('text/html')) return null

    const html = await response.text()
    const title = extractTitle(html)
    const content = extractTextContent(html)

    if (content.split(/\s+/).filter(w => w.length > 0).length < 50) return null

    return { title, content }
  } catch (error) {
    console.error(`Failed to crawl ${url}:`, error instanceof Error ? error.message : error)
    return null
  }
}

export async function runCrawlJob(
  sitemapUrl: string,
  triggeredBy: string
): Promise<string> {
  const jobId = await createCrawlJob(sitemapUrl, triggeredBy)

  // Run asynchronously so the API returns immediately
  ;(async () => {
    try {
      await updateCrawlJob(jobId, { status: 'running' })

      const [entries, routes, exclusions] = await Promise.all([
        fetchSitemap(sitemapUrl),
        listCrawlRoutes(),
        listExclusions(),
      ])

      const baseUrl = process.env.DOCS_BASE_URL || ''
      const { routed, skipped } = routeUrls(entries, routes, exclusions)

      await updateCrawlJob(jobId, {
        totalUrls: routed.length + skipped.length,
        skippedUrls: skipped.length,
      })

      // Bulk-insert skipped URL results upfront
      const now = new Date().toISOString()
      const BATCH = 500
      for (let i = 0; i < skipped.length; i += BATCH) {
        await insertCrawlResults(
          skipped.slice(i, i + BATCH).map(s => ({
            jobId,
            url: s.url,
            pathname: s.pathname,
            status: 'skipped' as const,
            reason: s.reason,
            timestamp: now,
          }))
        )
      }

      const client = new MongoClient(process.env.MONGODB_CONNECTION_URI!)
      await client.connect()
      const db = client.db(process.env.MONGODB_DATABASE_NAME!)

      const embeddings = new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY!,
        modelName: 'text-embedding-3-small',
      })

      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      })

      let processedUrls = 0
      let failedUrls = 0
      const errors: string[] = []

      // Group URLs by target collection for batch operations
      const byCollection = new Map<string, RoutedUrl[]>()
      for (const r of routed) {
        const list = byCollection.get(r.targetCollection) || []
        list.push(r)
        byCollection.set(r.targetCollection, list)
      }

      for (const [collectionName, urls] of byCollection) {
        const collection = db.collection(collectionName)

        for (const routedUrl of urls) {
          try {
            const page = await crawlPage(routedUrl.url)
            if (!page) {
              failedUrls++
              errors.push(routedUrl.url)
              await insertCrawlResults([{
                jobId,
                url: routedUrl.url,
                pathname: routedUrl.pathname,
                status: 'failed',
                reason: 'crawl_failed',
                targetCollection: routedUrl.targetCollection,
                timestamp: new Date().toISOString(),
              }])
              continue
            }

            // Remove existing docs for this URL to avoid duplicates
            await collection.deleteMany({ 'metadata.url': routedUrl.url })

            const chunks = await textSplitter.splitText(page.content)

            for (let i = 0; i < chunks.length; i++) {
              const embedding = await embeddings.embedQuery(chunks[i])
              await collection.insertOne({
                pageContent: chunks[i],
                metadata: {
                  source: routedUrl.pathname,
                  url: routedUrl.url,
                  title: page.title,
                  crawledAt: new Date().toISOString(),
                  lastmod: routedUrl.lastmod,
                  chunkIndex: i,
                  totalChunks: chunks.length,
                  crawlJobId: jobId,
                },
                embedding,
              })
            }

            await insertCrawlResults([{
              jobId,
              url: routedUrl.url,
              pathname: routedUrl.pathname,
              status: 'processed',
              targetCollection: routedUrl.targetCollection,
              chunksCreated: chunks.length,
              title: page.title,
              timestamp: new Date().toISOString(),
            }])

            processedUrls++

            // Persist progress and check for cancellation every 10 URLs
            if (processedUrls % 10 === 0) {
              await updateCrawlJob(jobId, { processedUrls, failedUrls })
              const job = await getCrawlJob(jobId)
              if (job?.cancelRequested || job?.status === 'cancelled') {
                await client.close()
                // Only write cancelled if not already set by a force-stop
                if (job.status !== 'cancelled') {
                  await updateCrawlJob(jobId, {
                    status: 'cancelled',
                    processedUrls,
                    failedUrls,
                    errors: errors.slice(0, 50),
                    completedAt: new Date().toISOString(),
                  })
                }
                return
              }
            }

            // Rate limiting between pages
            await new Promise(resolve => setTimeout(resolve, 500))
          } catch (error) {
            failedUrls++
            const msg = error instanceof Error ? error.message : 'Unknown error'
            errors.push(`${routedUrl.url}: ${msg}`)
            await insertCrawlResults([{
              jobId,
              url: routedUrl.url,
              pathname: routedUrl.pathname,
              status: 'failed',
              reason: msg,
              targetCollection: routedUrl.targetCollection,
              timestamp: new Date().toISOString(),
            }])
          }
        }
      }

      await client.close()

      await updateCrawlJob(jobId, {
        status: 'completed',
        processedUrls,
        failedUrls,
        errors: errors.slice(0, 50),
        completedAt: new Date().toISOString(),
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      await updateCrawlJob(jobId, {
        status: 'failed',
        errors: [msg],
        completedAt: new Date().toISOString(),
      })
    }
  })()

  return jobId
}
