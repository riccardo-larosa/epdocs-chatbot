# EP Docs Chatbot

An AI-powered chatbot that helps users find and understand Elastic Path documentation. Built with Next.js 13, OpenAI GPT-4, and MongoDB Vector Search.

## Features

- 🤖 Natural language interactions with documentation
- 🔍 Semantic search across EP Commerce Cloud (EPCC) and Subscription Management (EPSM) docs
- 🛠️ Built-in tools for API reference and technical content retrieval
- 📊 DataDog integration for LLM observability
- ⚡ Real-time streaming responses
- 🎨 Clean, modern UI with syntax highlighting

## Tech Stack

- **Framework**: Next.js 13 (App Router)
- **Language**: TypeScript
- **AI/LLM**: OpenAI GPT-4
- **Database**: MongoDB Atlas (Vector Search)
- **Styling**: Tailwind CSS
- **Monitoring**: DataDog

## Getting Started

1. Clone the repository:

```bash
git clone https://github.com/elasticpath/ep-docs-chatbot.git
cd ep-docs-chatbot
```

2. Install dependencies:

```bash
npm install
```

3. Set up your environment variables:

```bash
cp .env.example .env
```

4. Add your API keys to the `.env` file:

```bash
OPENAI_API_KEY=your_openai_api_key
MONGODB_URI=your_mongodb_connection_string
NEXT_PUBLIC_SITE=EPCC
DD_API_KEY=your_datadog_api_key
```

5. Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start chatting!

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key
- `MONGODB_URI`: MongoDB connection string
- `NEXT_PUBLIC_SITE`: Site to search ('EPCC' or 'EPSM')
- `DD_API_KEY`: DataDog API key (optional)

## Updating Documentation Database

To update the chatbot's knowledge base with new documentation:

```bash
# Test database connection
npm run db:test

# Update general documentation 
npm run update-docs

# Update API documentation
npm run update-api-docs
```

For detailed instructions, see [DATABASE_UPDATE_GUIDE.md](DATABASE_UPDATE_GUIDE.md).

## Contributing

1. Create a new branch
2. Make your changes
3. Submit a pull request

## License

[MIT License](LICENSE)

# Elastic Path Documentation Chatbot

A Next.js-based chatbot that provides intelligent responses to questions about Elastic Path documentation, APIs, and products.

## Features

- **Multiple Chatbot Interfaces**: 
  - **Documentation Assistant** (`/ask`) - General documentation and technical support (default)
  - **RFP Assistant** (`/rfp`) - Specialized for Request for Proposal responses
- **Specialized Prompts**: Different system prompts for EPCC, EPSM, and RFP modes
- **Vector Search**: MongoDB Atlas Vector Search for semantic content retrieval
- **Web Scraping**: Secure whitelist-based web scraping for external content
- **API Support**: RESTful API endpoints for external integrations
- **Real-time Streaming**: Live response streaming for better user experience
- **Security**: API key validation, rate limiting, and URL whitelisting
- **Dark Mode**: Theme toggle support

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env.local` file with your configuration:

```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# MongoDB Atlas Configuration
MONGODB_URI=your_mongodb_atlas_connection_string
MONGODB_DATABASE_NAME=your_database_name
MONGODB_COLLECTION_NAME=chat_docs_prod
MONGODB_API_COLLECTION_NAME=openapis_prod

# Vector Search Configuration
VECTOR_SEARCH_INDEX_NAME=default
VECTOR_SEARCH_DIMENSIONS=1536

# API Security
REQUIRE_API_KEY=true
VALID_API_KEYS=your_api_key_1,your_api_key_2

# Web Scraping Configuration (Optional)
# Comma-separated list of specific URLs that can be scraped
ALLOWED_SCRAPE_URLS=https://elasticpath.dev/docs/getting-started,https://elasticpath.com/pricing
# Comma-separated list of domains that can be scraped (all pages on these domains)
ALLOWED_SCRAPE_DOMAINS=elasticpath.dev,elasticpath.com

# Documentation Paths
DOCS_PATH=./docs
API_DOCS_PATH=./api-docs
GUIDES_PATH=./elastic-path-guides
EPCC_DOCS_PATH=./epcc-docs
EPSM_DOCS_PATH=./epsm-docs
RFP_PATH=./rfp
```

### 3. Set Up Vector Search

Create a MongoDB Atlas Vector Search index with this configuration:

```json
{
  "mappings": {
    "dynamic": true,
    "fields": {
      "content": {
        "type": "string"
      },
      "contentVector": {
        "dimensions": 1536,
        "similarity": "cosine",
        "type": "knnVector"
      },
      "metadata": {
        "type": "document",
        "dynamic": true
      },
      "source": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "url": {
        "type": "string"
      }
    }
  }
}
```

### 4. Index Your Documentation

```bash
# Index all documentation
npm run update-docs

# Index specific sources
npm run update-api-docs
npm run update-guides
npm run update-epcc-docs
npm run update-epsm-docs
npm run update-rfp
```

### 5. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to access the chatbot.

## Usage

### Web Interface

- **Main Page**: `http://localhost:3000` - Redirects to Documentation Assistant
- **Documentation Assistant**: `http://localhost:3000/ask` - General documentation help (default)
- **RFP Assistant**: `http://localhost:3000/rfp` - Specialized RFP responses

### API Endpoints

- **Chat API**: `POST /api/chat` - Main chat endpoint
- **Health Check**: `GET /api/chat` - Returns 405 with helpful message

### Example API Usage

```bash
# Documentation Assistant
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_api_key" \
  -d '{
    "message": "How do I create a product?",
    "history": []
  }'

# RFP Assistant
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_api_key" \
  -d '{
    "message": "What are the key capabilities of PXM?",
    "history": [],
    "mode": "rfp"
  }'
```

## RFP Assistant Features

The RFP Assistant (`/rfp`) provides specialized responses for Request for Proposal scenarios:

- **RFP-Focused Content**: Prioritizes RFP-specific information
- **Professional Responses**: Tailored for rfp answers
- **Comprehensive Coverage**: Product capabilities, pricing, implementation, security
- **Customer Success**: Case studies and success metrics

### RFP Content Sources

- **RFP Content** (`./rfp`) - Main RFP-specific information
- **Product Documentation** - Technical specifications and capabilities
- **Implementation Guides** - Timeline and process information
- **Pricing Information** - Licensing and cost structures
- **Security & Compliance** - Certifications and standards

## Web Scraping Features

The chatbot includes secure web scraping capabilities for accessing external content:

- **Whitelist-Based Security**: Only specified URLs and domains can be scraped
- **Content Extraction**: Automatically extracts and cleans text content from web pages
- **Title Detection**: Extracts page titles and headings
- **Timeout Protection**: 30-second timeout to prevent hanging requests
- **Content Type Validation**: Only scrapes HTML pages

### Web Scraping Configuration

```bash
# Configure specific URLs that can be scraped
ALLOWED_SCRAPE_URLS=https://elasticpath.dev/docs/getting-started,https://elasticpath.com/pricing

# Configure entire domains that can be scraped
ALLOWED_SCRAPE_DOMAINS=elasticpath.dev,elasticpath.com
```

### Enhanced Web Scraping Behavior

The chatbot will **ALWAYS utilize web scraping** when relevant content is available:

- **Proactive Usage**: Automatically scrapes whitelisted URLs when topics are mentioned
- **Smart Topic Detection**: Recognizes when questions relate to available content
- **Current Information**: Prioritizes up-to-date information from web sources
- **Source Citation**: Always cites the source URL when using scraped content

### Web Scraping Usage Examples

The chatbot will automatically scrape when users ask:
- "What are the current pricing plans?" → Scrapes pricing page
- "Show me the latest API documentation" → Scrapes docs
- "What features does Elastic Path offer?" → Scrapes relevant pages
- "Tell me about the company" → Scrapes company information
- "What does the pricing page say about enterprise plans?" → Scrapes pricing page
- "Can you check the latest documentation on the API reference page?" → Scrapes API docs

**No manual intervention required** - the chatbot intelligently determines when web scraping is appropriate and automatically uses the `scrapeWebPage` tool for whitelisted URLs.

### Security Considerations

- **Disabled by Default**: Web scraping is disabled unless URLs/domains are configured
- **Whitelist Only**: No URLs outside the whitelist can be scraped
- **Rate Limiting**: Built-in timeout and error handling
- **Content Validation**: Only HTML pages are processed
- **User Agent**: Proper user agent identification for responsible scraping

## Scripts

### Development

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
```

### Content Management

```bash
npm run update-docs      # Update all documentation
npm run update-api-docs  # Update API documentation
npm run update-guides    # Update guides
npm run update-epcc-docs # Update EPCC documentation
npm run update-epsm-docs # Update EPSM documentation
npm run update-rfp       # Update RFP content
```

### Adding additional RFP documentation

In your .env.local file, add in the location for your local storage of RFP docs:

```bash 
RFP_PATH=/Users/yourname/elasticpath-rfp #Example
```

Your RFP information needs to be in markdown. If the docs are in Word or PDF format, do the following:

# macOS
```brew install pandoc```
```brew install pdftoipe``` 

# Convert DOCX to Markdown
```pandoc "RFP Pricing.docx" -f docx -t gfm -o "pricing.md"```

```pandoc "Implementation Guide.docx" -f docx -t gfm -o "implementation-guide.md" --extract-media=./media``` # Docx contains media
   
# Convert PDF to Markdown
```pdftotext "Proposal Template.pdf" "Proposal Template.txt"```

```pandoc "Proposal Template.txt" -o "proposal-template.md"```

Adding a single file:

```npm run add-file "/Users/davidjstover/elasticpath-rfp/new-rfp-file.md" "rfp_docs_prod" "/Users/davidjstover/elasticpath-rfp"```

### Testing and Maintenance

```bash
npm run db:test          # Test MongoDB connection
npm run check-env        # Verify environment configuration
npm run setup-vector-search  # Set up vector search index
npm run configure-web-scraping  # Configure web scraping whitelist
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key | Required |
| `MONGODB_URI` | MongoDB Atlas connection string | Required |
| `MONGODB_DATABASE_NAME` | Database name | Required |
| `MONGODB_COLLECTION_NAME` | Main collection | `chat_docs_prod` |
| `MONGODB_API_COLLECTION_NAME` | API collection | `openapis_prod` |
| `MONGODB_RFP_COLLECTION_NAME` | RFP collection | `rfp_docs_prod` |
| `MONGODB_EPCC_COLLECTION_NAME` | EPCC collection | `epcc_docs_prod` |
| `MONGODB_EPSM_COLLECTION_NAME` | EPSM collection | `epsm_docs_prod` |
| `VECTOR_SEARCH_INDEX_NAME` | Vector search index | `default` |
| `REQUIRE_API_KEY` | Require API key for external requests | `true` |
| `VALID_API_KEYS` | Comma-separated list of valid API keys | Required |
| `ALLOWED_SCRAPE_URLS` | Comma-separated list of URLs that can be scraped | Optional |
| `ALLOWED_SCRAPE_DOMAINS` | Comma-separated list of domains that can be scraped | Optional |

### Content Structure

The chatbot supports multiple content sources:

- **Main Documentation** (`./docs`) - General Elastic Path documentation
- **API Documentation** (`./api-docs`) - API reference and guides
- **Guides** (`./elastic-path-guides`) - How-to guides and tutorials
- **EPCC Documentation** (`./epcc-docs`) - Commerce Cloud documentation
- **EPSM Documentation** (`./epsm-docs`) - Subscription Management docs
- **RFP Documentation** (`./rfp`) - Request for Proposal information

## Troubleshooting

### Common Issues

**Connection Errors:**
- Verify MongoDB Atlas connection string
- Check network access settings
- Ensure database user has proper permissions

**Content Not Found:**
- Verify content is in the correct directories
- Check that indexing completed successfully
- Review MongoDB collection for indexed documents

**API Key Issues:**
- Ensure `VALID_API_KEYS` contains your API key
- Check that `REQUIRE_API_KEY` is set correctly
- Verify the Authorization header format

### Debug Commands

```bash
# Test database connection
npm run db:test

# Check environment variables
npm run check-env

# View indexed documents
mongosh "your_connection_string" --eval "db.chat_docs_prod.find().limit(5)"
```

## Production Deployment

### Build for Production

```bash
npm run build
```

### Environment Setup

Ensure all production environment variables are set:

```bash
NODE_ENV=production
OPENAI_API_KEY=your_production_key
MONGODB_URI=your_production_mongodb_uri
VALID_API_KEYS=your_production_api_keys
```

### Start Production Server

```bash
npm run start
```

## Security Considerations

- Use strong, unique API keys
- Restrict MongoDB Atlas network access
- Implement rate limiting in production
- Use HTTPS in production environments
- Regularly rotate API keys

## Support

For issues and questions:

1. Check the troubleshooting section above
2. Review MongoDB Atlas logs
3. Check the application logs
4. Contact the development team

## License

This project is proprietary to Elastic Path.
