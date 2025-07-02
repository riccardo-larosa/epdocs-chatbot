import { z } from 'zod';

// Whitelist of allowed domains and URLs - use functions to read env vars when needed
function getAllowedUrls(): string[] {
  return process.env.ALLOWED_SCRAPE_URLS?.split(',').map(url => url.trim()) || [];
}

function getAllowedDomains(): string[] {
  return process.env.ALLOWED_SCRAPE_DOMAINS?.split(',').map(domain => domain.trim()) || [];
}

console.log('RAW ALLOWED_SCRAPE_URLS:', JSON.stringify(process.env.ALLOWED_SCRAPE_URLS));
console.log('RAW ALLOWED_SCRAPE_DOMAINS:', JSON.stringify(process.env.ALLOWED_SCRAPE_DOMAINS));
// Schema for URL validation
const urlSchema = z.string().url();

interface ScrapedContent {
  title: string;
  content: string;
  url: string;
  domain: string;
  timestamp: string;
  wordCount: number;
  sourceAttribution: string;
}

/**
 * Check if a URL is allowed to be scraped based on whitelist
 */
function isUrlAllowed(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    const domain = parsedUrl.hostname;
    
    // Check exact URL whitelist
    if (getAllowedUrls().includes(url)) {
      return true;
    }
    
    // Check domain whitelist
    if (getAllowedDomains().includes(domain)) {
      return true;
    }
    
    // Check if URL starts with any whitelisted URL (for subpaths)
    const isSubpath = getAllowedUrls().some(allowedUrl => {
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
 * Enhanced content cleaning to filter out navigation, footers, and low-value content
 */
function extractTextContent(html: string): string {
  // Remove script and style elements
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '');
  
  // Remove common navigation and footer elements by class/id
  text = text
    .replace(/<[^>]*(?:class|id)="[^"]*(?:nav|menu|header|footer|sidebar|breadcrumb|pagination|cookie|banner|advertisement|ad-|ads-)[^"]*"[^>]*>[\s\S]*?<\/[^>]*>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '');
  
  // Remove common low-value elements
  text = text
    .replace(/<[^>]*(?:class|id)="[^"]*(?:share|social|comment|related|tag|author|meta|date|time|button|btn|link)[^"]*"[^>]*>[\s\S]*?<\/[^>]*>/gi, '');
  
  // Remove HTML tags but preserve line breaks
  text = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/td>/gi, ' | ')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<[^>]*>/g, '');
  
  // Clean up whitespace and remove low-value content patterns
  text = text
    .replace(/\n\s*\n/g, '\n\n')
    .replace(/\s+/g, ' ')
    .replace(/^\s*[\w\s]*(?:copyright|©|terms|privacy|cookies?)[\w\s]*$/gmi, '') // Remove copyright/legal lines
    .replace(/^\s*(?:home|contact|about|login|register|search|menu)[\s\|]*$/gmi, '') // Remove navigation text
    .replace(/^\s*(?:read more|learn more|click here|see more)[\s\|]*$/gmi, '') // Remove call-to-action text
    .replace(/^\s*(?:share|tweet|like|follow)[\s\|]*$/gmi, '') // Remove social sharing text
    .trim();
  
  // Filter out very short content (likely navigation or low-value)
  const lines = text.split('\n').filter(line => {
    const trimmed = line.trim();
    return trimmed.length > 10 && // Minimum length
           !(/^\s*[\d\w\s]{1,20}\s*$/.test(trimmed)) && // Not just short words/numbers
           !(trimmed.match(/^[^\w]*$/)); // Not just punctuation
  });
  
  return lines.join('\n');
}

/**
 * Extract title from HTML with fallbacks
 */
function extractTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    return titleMatch[1].replace(/\s*\|\s*.*$/, '').trim(); // Remove site name after |
  }
  
  // Fallback to h1
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match) {
    return h1Match[1].trim();
  }
  
  // Fallback to meta title
  const metaTitleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i);
  if (metaTitleMatch) {
    return metaTitleMatch[1].trim();
  }
  
  return 'Untitled';
}

/**
 * Create source attribution string with domain information
 */
function createSourceAttribution(url: string, domain: string): string {
  return `Content scraped from ${domain} (${url})`;
}

/**
 * Scrape content from a whitelisted URL with enhanced attribution and quality filtering
 */
export async function scrapeWebPage(url: string): Promise<ScrapedContent> {
  // Validate URL format
  const validatedUrl = urlSchema.parse(url);
  
  // Check if URL is allowed
  if (!isUrlAllowed(validatedUrl)) {
    throw new Error(`URL ${url} is not in the allowed whitelist. Only specified URLs can be scraped for security reasons.`);
  }
  
  try {
    const parsedUrl = new URL(validatedUrl);
    const domain = parsedUrl.hostname;
    
    console.log(`🌐 Scraping allowed URL: ${url} from domain: ${domain}`);
    
    // Fetch the webpage with a reasonable timeout
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0',
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
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
    
    // Quality check: ensure we have meaningful content
    if (wordCount < 50) {
      throw new Error(`Insufficient content quality: only ${wordCount} words extracted. Page may be mostly navigation or have restricted content.`);
    }
    
    const sourceAttribution = createSourceAttribution(validatedUrl, domain);
    
    const scrapedContent: ScrapedContent = {
      title,
      content: `${sourceAttribution}\n\n${content}`, // Prepend attribution to content
      url: validatedUrl,
      domain,
      timestamp: new Date().toISOString(),
      wordCount,
      sourceAttribution
    };
    
    console.log(`✅ Successfully scraped ${domain}: ${wordCount} words of quality content`);
    console.log(`📝 Content preview: ${content.substring(0, 200)}...`);
    
    return scrapedContent;
    
  } catch (error) {
    console.error(`❌ Error scraping ${url}:`, error);
    throw new Error(`Failed to scrape ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get the current whitelist configuration for debugging
 */
export function getWhitelistInfo() {
  return {
    allowedUrls: getAllowedUrls(),
    allowedDomains: getAllowedDomains(),
    totalAllowedUrls: getAllowedUrls().length,
    totalAllowedDomains: getAllowedDomains().length
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
  
  if (getAllowedUrls().length > 0) {
    targets.push(`Specific URLs: ${getAllowedUrls().join(', ')}`);
  }
  
  if (getAllowedDomains().length > 0) {
    targets.push(`Entire domains: ${getAllowedDomains().join(', ')}`);
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
  const urlMatches = getAllowedUrls().some(url => {
    const urlLower = url.toLowerCase();
    return urlLower.includes(topicLower) || 
           (topicLower.includes('pricing') && urlLower.includes('pricing')) ||
           (topicLower.includes('docs') && urlLower.includes('docs')) ||
           (topicLower.includes('api') && urlLower.includes('api')) ||
           (topicLower.includes('features') && urlLower.includes('features'));
  });
  
  // Check if topic matches any domain patterns
  const domainMatches = getAllowedDomains().some(domain => {
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
  return getAllowedUrls().length > 0 || getAllowedDomains().length > 0;
} 