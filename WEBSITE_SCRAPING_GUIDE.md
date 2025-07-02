# 🌐 Website Content Scraping Guide

This guide explains how to scrape website content and store it in a dedicated collection for use by the RFP bot, keeping it separate from curated RFP content.

## 📋 Overview

The website scraping system allows you to:
- **Scrape** content from whitelisted URLs
- **Store** scraped content in a dedicated MongoDB collection (`website_content_prod`)
- **Search** pre-scraped content in RFP mode as supplementary information
- **Keep separation** between curated RFP content and scraped website content

## 🏗️ Architecture

```
RFP Mode Search Priority:
1. 🏆 RFP Collection (curated RFP responses)
2. 📚 Documentation Collection (filtered, no website content) 
3. 🌐 Website Collection (pre-scraped content)
4. 🔗 Live Web Scraping (last resort)
```

### Collection Structure

```
├── rfp_docs_prod (curated RFP content)
├── chat_docs_prod (documentation, guides)
├── api_documents (API documentation)
└── website_content_prod (scraped website content) ← NEW
```

## 🔧 Setup

### 1. Environment Configuration

Add to your `.env.local`:

```bash
# Website Collection (optional - defaults shown)
MONGODB_WEBSITE_COLLECTION_NAME=website_content_prod

# Web Scraping Whitelist (required for scraping)
ALLOWED_SCRAPE_URLS=https://elasticpath.dev/docs/getting-started,https://elasticpath.com/pricing
ALLOWED_SCRAPE_DOMAINS=elasticpath.dev,elasticpath.com

# Existing required variables
MONGODB_CONNECTION_URI=mongodb+srv://...
MONGODB_DATABASE_NAME=epdocs_chatbot
OPENAI_API_KEY=sk-...
```

### 2. Configure Web Scraping Whitelist

```bash
# Check current configuration
npm run configure-web-scraping

# Example whitelist configuration in .env.local:
ALLOWED_SCRAPE_URLS=https://elasticpath.dev/docs/api,https://elasticpath.com/features,https://elasticpath.com/pricing
ALLOWED_SCRAPE_DOMAINS=elasticpath.dev,elasticpath.com
```

## 🚀 Usage

### Basic Commands

```bash
# Scrape all whitelisted URLs
npm run scrape-websites

# Check collection statistics  
npm run scrape-website-stats

# Clear all website content
npm run scrape-website-clear

# Scrape specific URL
npm run scrape-websites -- --url https://elasticpath.dev/docs/getting-started

# Remove specific URL from collection
npm run scrape-websites -- --clear-url https://elasticpath.com/old-page
```

### Step-by-Step Workflow

#### 1. Configure Whitelist
```bash
# Edit .env.local to add URLs/domains
ALLOWED_SCRAPE_URLS=https://elasticpath.dev/docs/api,https://elasticpath.com/pricing

# Verify configuration
npm run configure-web-scraping
```

#### 2. Scrape Content
```bash
# Scrape all whitelisted URLs (with 2-second delays between requests)
npm run scrape-websites
```

#### 3. Verify Results
```bash
# Check what was scraped
npm run scrape-website-stats
```

Output example:
```
📊 Collection Statistics:
Total documents in website_content_prod: 45
Website documents: 45
Unique domains scraped: 2
Unique URLs scraped: 8

🌐 Scraped domains:
   1. elasticpath.dev
   2. elasticpath.com

📄 Scraped URLs:
   1. https://elasticpath.dev/docs/api
   2. https://elasticpath.com/pricing
   ...
```

### Advanced Usage

#### Batch Scraping with Custom URLs
```bash
# Scrape specific URLs not in whitelist (must add to whitelist first)
npm run scrape-websites -- --url https://elasticpath.dev/docs/commerce-manager
npm run scrape-websites -- --url https://elasticpath.com/features/pxm
```

#### Content Management
```bash
# Remove outdated content for a specific URL
npm run scrape-websites -- --clear-url https://elasticpath.com/old-pricing

# Re-scrape updated content
npm run scrape-websites -- --url https://elasticpath.com/new-pricing

# Clear everything and start fresh
npm run scrape-website-clear
npm run scrape-websites
```

## 📊 Content Structure

### Scraped Document Format
```json
{
  "pageContent": "Content scraped from elasticpath.com (url)\n\nActual page content...",
  "contentVector": [0.1, 0.2, ...], 
  "metadata": {
    "source": "scraped-elasticpath.com/pricing",
    "url": "https://elasticpath.com/pricing",
    "domain": "elasticpath.com", 
    "title": "Elastic Path Pricing Plans",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "wordCount": 245,
    "contentType": "website_scraped",
    "sourceAttribution": "Content scraped from elasticpath.com (https://elasticpath.com/pricing)",
    "chunkIndex": 0,
    "totalChunks": 3
  }
}
```

### Quality Control Features
- ✅ **Navigation Removal**: Headers, footers, nav menus filtered out
- ✅ **Low-Value Content**: Copyright, social sharing, ads removed  
- ✅ **Minimum Quality**: Requires 50+ words of meaningful content
- ✅ **Source Attribution**: Every document includes clear source information
- ✅ **Chunking**: Large pages split into searchable chunks (1000 chars, 200 overlap)

## 🔍 How RFP Bot Uses Website Content

### Search Integration
When in RFP mode (`/rfp`), the bot follows this priority:

1. **RFP Collection Search** (`getContent` tool)
   - Searches curated RFP responses first
   - Falls back to documentation (filtered)
   - Includes website collection if still needs more content

2. **Website Collection Search** (`getWebsiteContent` tool) 
   - Searches pre-scraped website content
   - Only available in RFP mode
   - Clearly marked as `[Website]` source

3. **Live Web Scraping** (`scrapeWebPage` tool)
   - Last resort for missing information
   - Real-time scraping with attribution

### Response Format
```
Based on the available information:

[RFP] Elastic Path Commerce Cloud starts at $2,000/month...

[Documentation] The PXM system supports variations...

[Website] elasticpath.com - Additional enterprise features include...

[Scraped from elasticpath.dev] Latest API documentation shows...
```

## 🔒 Security & Best Practices

### Security Features
- ✅ **Whitelist Only**: Only pre-approved URLs/domains can be scraped
- ✅ **Rate Limiting**: 2-second delays between requests
- ✅ **Timeout Protection**: 30-second request timeout
- ✅ **Content Validation**: HTML-only, quality checks
- ✅ **User Agent**: Proper identification as Elastic Path bot

### Best Practices

#### URL Management
```bash
# Be specific with URLs when possible
ALLOWED_SCRAPE_URLS=https://elasticpath.com/pricing,https://elasticpath.dev/docs/api

# Use domains sparingly (scrapes everything)
ALLOWED_SCRAPE_DOMAINS=docs.elasticpath.com  # Only docs subdomain
```

#### Content Freshness
```bash
# Regular update schedule (weekly/monthly)
npm run scrape-website-clear  # Clear old content
npm run scrape-websites       # Re-scrape fresh content

# Update specific pages as needed
npm run scrape-websites -- --clear-url https://elasticpath.com/pricing
npm run scrape-websites -- --url https://elasticpath.com/pricing
```

#### Monitoring
```bash
# Regular statistics checks
npm run scrape-website-stats

# Monitor logs for scraping issues
tail -f logs/scraping.log  # If you have logging configured
```

## 🐛 Troubleshooting

### Common Issues

#### "Web scraping is not enabled"
```bash
# Check configuration
npm run configure-web-scraping

# Add URLs/domains to .env.local
ALLOWED_SCRAPE_URLS=https://example.com
```

#### "URL not in whitelist"
```bash
# Add the URL to whitelist in .env.local
ALLOWED_SCRAPE_URLS=https://elasticpath.com/new-page,https://existing-page.com

# Or add the domain
ALLOWED_SCRAPE_DOMAINS=elasticpath.com
```

#### "Insufficient content quality"
- Page has too little text content (less than 50 words)
- Page is mostly navigation/ads
- Content is behind authentication/paywall

#### "Connection/timeout errors"
- Check internet connection
- Verify URL is accessible
- Some sites may block automated requests

### Debug Commands

```bash
# Test single URL scraping
npm run scrape-websites -- --url https://elasticpath.dev/docs/api

# Check MongoDB connection
npm run db:test

# Verify environment variables
npm run check-env

# Test web scraping configuration
npm run configure-web-scraping
```

## 📈 Monitoring & Analytics

### Collection Statistics
```bash
# View current stats
npm run scrape-website-stats

# Monitor growth over time
echo "$(date): $(npm run scrape-website-stats 2>/dev/null | grep 'Website documents')" >> scraping-log.txt
```

### MongoDB Atlas Monitoring
- **Search Queries**: Track vector search usage
- **Collection Size**: Monitor storage usage
- **Query Performance**: Response times for website searches

### Performance Optimization
- **Chunk Size**: Adjust in scraper (default 1000 chars)
- **Overlap**: Tune for better search results (default 200 chars)  
- **topK Results**: Modify search result limits
- **Embedding Model**: Consider upgrading to text-embedding-3-large

## 🚀 Advanced Configuration

### Custom Collection Name
```bash
# Use different collection name
MONGODB_WEBSITE_COLLECTION_NAME=my_custom_website_collection
```

### Custom Chunk Settings
Modify `scripts/scrape-to-website-collection.ts`:
```typescript
this.textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1500,    // Larger chunks
    chunkOverlap: 300,  // More overlap
});
```

### Selective Domain Scraping
```bash
# Script for scraping specific paths on a domain
npm run scrape-websites -- --url https://elasticpath.dev/docs/api
npm run scrape-websites -- --url https://elasticpath.dev/docs/pxm
npm run scrape-websites -- --url https://elasticpath.dev/docs/commerce
```

This approach gives you fine control over what gets scraped while keeping website content completely separate from your curated RFP collection. 