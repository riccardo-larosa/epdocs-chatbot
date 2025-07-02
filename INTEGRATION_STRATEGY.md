# 🔄 Integration Strategy Implementation

This document outlines the new integration strategy for the Elastic Path Chatbot, implementing prioritized search and content restrictions based on access mode.

## 📋 Integration Strategy Overview

### RFP Mode - Priority Search Strategy
```
1. 🏆 FIRST PRIORITY: RFP Collection
   └── RFP-specific responses, pricing, implementation details

2. 📚 SECOND PRIORITY: Documentation Collection  
   └── General documentation, guides, tutorials (filtered to exclude website content)

3. ⚙️ THIRD PRIORITY: API Documentation Collection
   └── Technical specifications, API references, integration details

4. 🌐 LAST RESORT: Website Content (via scraping)
   └── Live website content with source attribution and quality filtering
```

### EPCC/EPSM Mode - Curated Content Only
```
✅ ALLOWED:
   - Documentation Collection (curated docs only)
   - API Documentation Collection
   
❌ RESTRICTED:
   - Website Content (no web scraping)
   - Content marked as scraped from external sources
```

## 🔧 Implementation Details

### 1. Enhanced MongoDB Retriever (`src/lib/mongoDbRetriever.ts`)

#### Priority Search for RFP Mode
```typescript
// RFP Mode: Multi-collection priority search
if (mode === 'rfp') {
    // 1. Search RFP collection (3 results)
    const rfpResults = await searchCollection('rfp_docs_prod', 3);
    
    // 2. Supplement with documentation (2 results, filtered)
    if (allResults.length < 5) {
        const docsResults = await searchCollection('chat_docs_prod', 2);
        const filtered = docsResults.filter(doc => !isWebsiteContent(doc.source));
    }
}
```

#### Content Filtering for EPCC/EPSM
```typescript
// EPCC/EPSM: Filter out website content
const filteredResults = results.filter(doc => {
    const source = doc.metadata?.source || '';
    return !isWebsiteContent(source);
});
```

#### Website Content Detection
```typescript
function isWebsiteContent(source: string): boolean {
    const websitePatterns = [
        /^https?:\/\//i,           // URL format
        /\.com\//, /\.org\//, /\.net\//,  // Common domains
        /elasticpath\.dev/i,       // EP website
        /scraped-/i,               // Scraped prefix
    ];
    return websitePatterns.some(pattern => pattern.test(source));
}
```

### 2. Enhanced Web Scraper (`src/lib/webScraper.ts`)

#### Source Attribution
```typescript
interface ScrapedContent {
    title: string;
    content: string;         // Includes attribution prefix
    domain: string;          // Extracted domain
    sourceAttribution: string; // "Content scraped from domain.com (url)"
}

function createSourceAttribution(url: string, domain: string): string {
    return `Content scraped from ${domain} (${url})`;
}
```

#### Quality Control Filtering
```typescript
function extractTextContent(html: string): string {
    // Remove navigation and footer elements
    text = text
        .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
        .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
        .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
        .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '');
    
    // Remove low-value content patterns
    text = text
        .replace(/^\s*(?:copyright|©|terms|privacy)[\w\s]*$/gmi, '')
        .replace(/^\s*(?:home|contact|about|login|menu)[\s\|]*$/gmi, '')
        .replace(/^\s*(?:read more|click here|share|tweet)[\s\|]*$/gmi, '');
    
    // Filter lines by quality (length > 10, not just numbers/punctuation)
    const lines = text.split('\n').filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 10 && 
               !(/^\s*[\d\w\s]{1,20}\s*$/.test(trimmed));
    });
}
```

#### Quality Validation
```typescript
// Ensure minimum content quality
if (wordCount < 50) {
    throw new Error(`Insufficient content quality: only ${wordCount} words extracted`);
}
```

### 3. Updated Chat API Tools (`src/app/api/chat/route.ts`)

#### Mode-Specific Tool Availability
```typescript
// RFP Mode: All tools available
tools: {
    getContent: tool({ /* RFP priority search */ }),
    getTechnicalContent: tool({ /* API docs */ }),
    ...(mode === 'rfp' ? {
        scrapeWebPage: tool({ /* Last resort web scraping */ })
    } : {})
}

// EPCC/EPSM Mode: No web scraping
tools: {
    getContent: tool({ /* Documentation only */ }),
    getTechnicalContent: tool({ /* API docs only */ })
    // No scrapeWebPage tool
}
```

#### Enhanced Tool Descriptions
```typescript
// RFP Mode
description: 'Search with RFP priority: 1) RFP content, 2) Documentation, 3) Guides'

// EPCC/EPSM Mode  
description: 'Search documentation and guides. Does NOT include website content'

// Web scraping (RFP only)
description: 'LAST RESORT: Scrape whitelisted websites ONLY when curated content insufficient'
```

### 4. Updated Prompts (`src/constants/prompts.ts`)

#### RFP Integration Strategy
```typescript
const PROMPT_RFP_WITH_TOOLS = `
INTEGRATION STRATEGY - Follow this search priority strictly:
1. FIRST PRIORITY: Search RFP collection
2. SECOND PRIORITY: Search documentation and guides  
3. THIRD PRIORITY: Search API documentation
4. LAST RESORT: Use web scraping ONLY when curated content insufficient

SOURCE ATTRIBUTION REQUIREMENTS:
- Clearly identify content sources: [RFP], [Documentation], [API]
- When using scraped content: "scraped from [domain]"
- Indicate which collection provided each piece of information
`;
```

#### EPCC/EPSM Content Restrictions
```typescript
const PROMPT_EPCC_DOCS_WITH_TOOLS = `
CONTENT RESTRICTIONS FOR EPCC/EPSM MODES:
- EPCC and EPSM modes do NOT have access to website content
- Only search curated documentation and API references
- Website content is ONLY available in RFP mode

When using tools:
- Use getContent for general documentation and guides
- Use getTechnicalContent for API references
- Web scraping tools are NOT available in EPCC/EPSM modes
`;
```

## 📊 Source Attribution Examples

### RFP Mode Response Format
```
Based on the available information:

[RFP] Elastic Path Commerce Cloud pricing starts at $2,000/month for the Starter plan...

[Documentation] The PXM system supports product variations through the variations API...

[API] The Products API endpoint accepts the following parameters...

[Scraped from elasticpath.com] Additional enterprise features include...
```

### EPCC Mode Response Format
```
Based on the curated documentation:

[Documentation] Commerce Manager provides a user-friendly interface...

[API Documentation] The authentication endpoint requires...

Note: Website content is not available in EPCC mode. Only curated documentation is accessed.
```

## 🔒 Security & Quality Assurance

### Content Quality Control
- ✅ Navigation elements filtered out
- ✅ Footer content removed  
- ✅ Low-value content (copyright, social sharing) excluded
- ✅ Minimum 50 words required for scraped content
- ✅ Short lines and navigation text filtered

### Source Attribution
- ✅ Clear domain identification for scraped content
- ✅ Collection source marked in all responses
- ✅ URL preserved in attribution string
- ✅ Content prefixed with attribution information

### Mode-Based Access Control
- ✅ RFP mode: Full access to all content types
- ✅ EPCC/EPSM mode: Curated content only
- ✅ Website content restricted to RFP mode only
- ✅ Web scraping tools unavailable in EPCC/EPSM

## 🚀 Usage Guidelines

### For RFP Responses
1. Start with RFP-specific content search
2. Supplement with documentation if needed
3. Add technical details from API docs
4. Use web scraping only as last resort
5. Always include source attribution

### For EPCC/EPSM Support  
1. Search curated documentation first
2. Use API documentation for technical details
3. Do not attempt to access website content
4. Focus on official, curated information only

### For Development/Testing
- Set `DEBUG_AUTH=true` for enhanced logging
- Check console logs for search priority execution
- Verify source attribution in responses
- Monitor content filtering effectiveness

## 🎯 Benefits

1. **Improved Accuracy**: Priority search ensures best content is found first
2. **Better Attribution**: Clear source identification improves trust
3. **Quality Control**: Filtered content reduces noise and irrelevant information  
4. **Mode-Appropriate Access**: Different content access based on use case
5. **Enhanced Security**: Restricted web access prevents unauthorized scraping 