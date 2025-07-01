import { z } from 'zod';

// Whitelist of allowed domains and URLs
const ALLOWED_URLS = process.env.ALLOWED_SCRAPE_URLS?.split(',').map(url => url.trim()) || [];
const ALLOWED_DOMAINS = process.env.ALLOWED_SCRAPE_DOMAINS?.split(',').map(domain => domain.trim()) || [];

// Schema for URL validation
const urlSchema = z.string().url();

interface ScrapedContent {
  title: string;
  content: string;
  url: string;
  timestamp: string;
  wordCount: number;
}

/**
 * Check if a URL is allowed to be scraped based on whitelist
 */
function isUrlAllowed(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    const domain = parsedUrl.hostname;
    
    // Check exact URL whitelist
    if (ALLOWED_URLS.includes(url)) {
      return true;
    }
    
    // Check domain whitelist
    if (ALLOWED_DOMAINS.includes(domain)) {
      return true;
    }
    
    // Check if URL starts with any whitelisted URL (for subpaths)
    const isSubpath = ALLOWED_URLS.some(allowedUrl => {
      try {
        const allowedParsed = new URL(allowedUrl);
        return domain === allowedParsed.hostname && 
               parsedUrl.pathname.startsWith(allowedParsed.pathname);
      } catch {
        return false;
      }
    });
    
    return isSubpath;
  } catch (error) {
    console.error('Error parsing URL for whitelist check:', error);
    return false;
  }
}

/**
 * Clean and extract text content from HTML
 */
function extractTextContent(html: string): string {
  // Remove script and style elements
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '');
  
  // Remove HTML tags but preserve line breaks
  text = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<[^>]*>/g, '');
  
  // Clean up whitespace
  text = text
    .replace(/\n\s*\n/g, '\n\n')
    .replace(/\s+/g, ' ')
    .trim();
  
  return text;
}

/**
 * Extract title from HTML
 */
function extractTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    return titleMatch[1].trim();
  }
  
  // Fallback to h1
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match) {
    return h1Match[1].trim();
  }
  
  return 'Untitled';
}

/**
 * Scrape content from a whitelisted URL
 */
export async function scrapeWebPage(url: string): Promise<ScrapedContent> {
  // Validate URL format
  const validatedUrl = urlSchema.parse(url);
  
  // Check if URL is allowed
  if (!isUrlAllowed(validatedUrl)) {
    throw new Error(`URL ${url} is not in the allowed whitelist. Only specified URLs can be scraped for security reasons.`);
  }
  
  try {
    console.log(`Scraping allowed URL: ${url}`);
    
    // Fetch the webpage with a reasonable timeout
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'ElasticPath-Chatbot/1.0 (Web Scraper)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('text/html')) {
      throw new Error(`Unsupported content type: ${contentType}. Only HTML pages can be scraped.`);
    }
    
    const html = await response.text();
    const title = extractTitle(html);
    const content = extractTextContent(html);
    const wordCount = content.split(/\s+/).length;
    
    const scrapedContent: ScrapedContent = {
      title,
      content,
      url: validatedUrl,
      timestamp: new Date().toISOString(),
      wordCount
    };
    
    console.log(`Successfully scraped ${url}: ${wordCount} words`);
    return scrapedContent;
    
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    throw new Error(`Failed to scrape ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get the current whitelist configuration for debugging
 */
export function getWhitelistInfo() {
  return {
    allowedUrls: ALLOWED_URLS,
    allowedDomains: ALLOWED_DOMAINS,
    totalAllowedUrls: ALLOWED_URLS.length,
    totalAllowedDomains: ALLOWED_DOMAINS.length
  };
}

/**
 * Get a user-friendly description of available scraping targets
 */
export function getAvailableScrapingTargets(): string {
  if (!isWebScrapingEnabled()) {
    return "Web scraping is not enabled. No external URLs can be scraped.";
  }
  
  const targets = [];
  
  if (ALLOWED_URLS.length > 0) {
    targets.push(`Specific URLs: ${ALLOWED_URLS.join(', ')}`);
  }
  
  if (ALLOWED_DOMAINS.length > 0) {
    targets.push(`Entire domains: ${ALLOWED_DOMAINS.join(', ')}`);
  }
  
  return `Available scraping targets: ${targets.join('; ')}`;
}

/**
 * Check if a topic might be available on whitelisted URLs
 */
export function isTopicLikelyAvailable(topic: string): boolean {
  if (!isWebScrapingEnabled()) {
    return false;
  }
  
  const topicLower = topic.toLowerCase();
  
  // Check if topic matches any URL patterns
  const urlMatches = ALLOWED_URLS.some(url => {
    const urlLower = url.toLowerCase();
    return urlLower.includes(topicLower) || 
           (topicLower.includes('pricing') && urlLower.includes('pricing')) ||
           (topicLower.includes('docs') && urlLower.includes('docs')) ||
           (topicLower.includes('api') && urlLower.includes('api')) ||
           (topicLower.includes('features') && urlLower.includes('features'));
  });
  
  // Check if topic matches any domain patterns
  const domainMatches = ALLOWED_DOMAINS.some(domain => {
    const domainLower = domain.toLowerCase();
    return domainLower.includes(topicLower) || 
           (topicLower.includes('elasticpath') && domainLower.includes('elasticpath'));
  });
  
  return urlMatches || domainMatches;
}

/**
 * Check if web scraping is enabled
 */
export function isWebScrapingEnabled(): boolean {
  return ALLOWED_URLS.length > 0 || ALLOWED_DOMAINS.length > 0;
} 