# 🚀 Quick Website Scraping Setup

5-minute guide to scrape website content and add it to a separate collection for RFP bot use.

## ⚡ Quick Start

### 1. Configure Whitelist (`.env.local`)
```bash
# Add these lines to your .env.local file:
MONGODB_WEBSITE_COLLECTION_NAME=website_content_prod
ALLOWED_SCRAPE_URLS=https://elasticpath.dev/docs/api,https://elasticpath.com/pricing
ALLOWED_SCRAPE_DOMAINS=elasticpath.dev,elasticpath.com
```

### 2. Restart Development Server
```bash
# Stop current server (Ctrl+C) and restart
npm run dev
```

### 3. Scrape Content
```bash
# Scrape all whitelisted URLs
npm run scrape-websites

# Check what was scraped
npm run scrape-website-stats
```

## 🎯 How It Works

### Collection Separation
- **`rfp_docs_prod`** - Your curated RFP content (unchanged)
- **`website_content_prod`** - Scraped website content (new, separate)

### RFP Mode Search Priority
```
1. 🏆 RFP Collection (your curated content)
2. 📚 Documentation (guides, docs) 
3. 🌐 Website Collection (scraped content)
4. 🔗 Live Web Scraping (last resort)
```

### Response Format
```
[RFP] Elastic Path pricing starts at $2,000/month...
[Documentation] PXM supports product variations...
[Website] elasticpath.com - Enterprise features include...
```

## 📋 Commands

| Command | Purpose |
|---------|---------|
| `npm run scrape-websites` | Scrape all whitelisted URLs |
| `npm run scrape-website-stats` | Show collection statistics |
| `npm run scrape-website-clear` | Clear all website content |
| `npm run scrape-websites -- --url <url>` | Scrape specific URL |
| `npm run configure-web-scraping` | Check current configuration |

## 🔒 Security Features

- ✅ **Whitelist Only** - Only approved URLs can be scraped
- ✅ **Rate Limited** - 2-second delays between requests
- ✅ **Quality Filtered** - Navigation/footer removal, 50+ word minimum
- ✅ **Source Attribution** - Clear domain marking in responses
- ✅ **Separate Storage** - No contamination of RFP collection

## 🧪 Test It

1. **Scrape test content:**
   ```bash
   npm run scrape-websites -- --url https://elasticpath.dev/docs/getting-started
   ```

2. **Check RFP bot in browser:**
   - Go to `/rfp` route
   - Ask: "What features does Elastic Path offer?"
   - Should see `[Website]` sources in response

3. **Verify separation:**
   ```bash
   npm run scrape-website-stats  # Shows website content only
   ```

## 📖 Full Documentation

See `WEBSITE_SCRAPING_GUIDE.md` for complete documentation including:
- Advanced configuration options
- Troubleshooting guide
- Content management workflows
- MongoDB Atlas integration
- Performance optimization tips

---

**Next Steps:** Configure your whitelist URLs and start scraping! 🚀 