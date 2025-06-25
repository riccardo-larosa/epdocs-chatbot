# 📊 Database Update Guide

This guide explains how to update the chatbot's knowledge base with the latest Elastic Path documentation.

## 🔍 Overview

The EP Docs Chatbot uses **MongoDB Atlas Vector Search** with two main collections:

- **`chat_docs_prod`** (or `documents`): General documentation including guides, tutorials, concepts, EPCC docs, EPSM docs
- **`openapis_prod`** (or `api_documents`): API reference material (endpoints, schemas, examples)

Each document is processed into chunks, converted to vector embeddings using OpenAI's `text-embedding-3-small` model, and stored in MongoDB for semantic search.

## ⚠️ **IMPORTANT: Missing Documentation Sources**

**Current Status:** The chatbot is only indexing local tutorial files (`./docs/`) but is missing the actual Elastic Path documentation that users need.

**What's Missing:**
- **Guides Content** (`/guides/` URLs): Learning-Center, Getting-Started, key-concepts, How-To
- **API Documentation** (`/docs/` URLs): REST API references, schemas, examples
- **Product-Specific Docs**: EPCC guides, EPSM documentation

**Required Setup:**
1. Obtain actual Elastic Path documentation files (markdown format)
2. Set up proper directory structure (see below)
3. Update indexing configuration

## 📁 **Proper Documentation Structure Setup**

To properly support `/guides/` and `/docs/` URLs, set up directories like this:

```
project-root/
├── docs/                    # Tutorial content (current - chatbot docs)
├── elastic-path-guides/     # NEW: Guides content (/guides/ URLs)
│   ├── Learning-Center/
│   │   └── getting-started-with-pxm/
│   ├── Getting-Started/
│   │   └── api-reference/
│   ├── key-concepts/
│   │   └── product-experience-manager/
│   └── How-To/
├── elastic-path-docs/       # NEW: API documentation (/docs/ URLs)
│   ├── api/
│   ├── pxm/
│   └── commerce/
├── epcc-docs/              # EPCC-specific content
└── epsm-docs/              # EPSM-specific content
```

## 🚀 **Updated Quick Start for Proper Setup**

### 1. **Obtain Documentation Sources**

```bash
# Example: Clone or download actual Elastic Path documentation
# (Replace with actual source locations)
git clone <elastic-path-guides-repo> elastic-path-guides
git clone <elastic-path-docs-repo> elastic-path-docs
```

### 2. **Configure Environment for Multiple Sources**

```bash
# .env.local
DOCS_PATH=./docs                           # Tutorial content
GUIDES_PATH=./elastic-path-guides          # Guides content (/guides/ URLs)  
API_DOCS_PATH=./elastic-path-docs          # API docs (/docs/ URLs)
EPCC_DOCS_PATH=./epcc-docs                 # EPCC-specific
EPSM_DOCS_PATH=./epsm-docs                 # EPSM-specific
```

### 3. **Index All Content Types**

```bash
# Index guides content (will use /guides/ URLs) - goes into chat_docs_prod
COLLECTION_OVERRIDE=guides npm run update-guides

# Index API documentation (will use /docs/ URLs) - goes into openapis_prod
npm run update-api-docs

# Index EPCC-specific content - goes into chat_docs_prod
COLLECTION_OVERRIDE=epcc npm run update-epcc-docs

# Index EPSM-specific content - goes into chat_docs_prod
COLLECTION_OVERRIDE=epsm npm run update-epsm-docs
```

## 🚀 Quick Start

### 1. **Install Dependencies**

```bash
npm install
```

### 2. **Test Database Connection**

```bash
npm run db:test
```

### 3. **Update Documentation**

```bash
# Update general documentation
npm run update-docs

# Update API documentation  
npm run update-api-docs
```

## 📝 Detailed Usage

### **Environment Setup**

Ensure you have the following environment variables in your `.env` file:

```bash
# Required MongoDB Configuration
MONGODB_CONNECTION_URI=mongodb+srv://...
MONGODB_DATABASE_NAME=rag_db
MONGODB_COLLECTION_NAME=chat_docs_prod
MONGODB_API_COLLECTION_NAME=openapis_prod
VECTOR_SEARCH_INDEX_NAME=vector_index
OPENAI_API_KEY=sk-...

# Optional: Clear existing documents before update
CLEAR_EXISTING=false

# Optional: Custom documentation paths (if different from defaults)
DOCS_PATH=./docs
API_DOCS_PATH=./api-docs
EPCC_DOCS_PATH=./epcc-docs
EPSM_DOCS_PATH=./epsm-docs

# Optional: Exclude patterns to prevent duplication (comma-separated)
# EXCLUDE_PATTERNS=**/api/**,**/node_modules/**,**/build/**
```

### **Update General Documentation**

```bash
# Update from default ./docs directory
npm run update-docs

# Or specify a custom path
npx tsx scripts/updateDatabase.ts /path/to/your/docs documents
```

### **Update API Documentation**

```bash
# Update API documentation
npm run update-api-docs

# Or specify custom path and collection
npx tsx scripts/updateDatabase.ts /path/to/api-docs api_documents
```

### **Manual Script Usage**

For more control, you can use the script directly:

```bash
# Basic usage
npx tsx scripts/updateDatabase.ts <docs-path> <collection-name>

# Examples
npx tsx scripts/updateDatabase.ts ./elastic-path-docs documents
npx tsx scripts/updateDatabase.ts ./api-reference api_documents
npx tsx scripts/updateDatabase.ts ./epcc-docs documents
npx tsx scripts/updateDatabase.ts ./epsm-docs documents
```

## 🔧 Configuration Options

### **Environment Variables**

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `MONGODB_CONNECTION_URI` | ✅ | MongoDB Atlas connection string | - |
| `MONGODB_DATABASE_NAME` | ✅ | Database name | `rag_db` |
| `MONGODB_COLLECTION_NAME` | ✅ | Collection for general docs | `chat_docs_prod` |
| `MONGODB_API_COLLECTION_NAME` | ✅ | Collection for API docs | `openapis_prod` |
| `VECTOR_SEARCH_INDEX_NAME` | ✅ | Vector search index name | `vector_index` |
| `OPENAI_API_KEY` | ✅ | OpenAI API key for embeddings | - |
| `CLEAR_EXISTING` | ❌ | Clear existing docs before update | `false` |

### **Document Processing Settings**

The script processes markdown files with these settings:

- **Chunk Size**: 1000 characters
- **Chunk Overlap**: 200 characters  
- **Embedding Model**: `text-embedding-3-small`
- **Supported Formats**: `.md`, `.mdx`

## 📁 File Structure Requirements

Your documentation should be organized as markdown files:

```
docs/
├── getting-started/
│   ├── introduction.md
│   └── quick-start.md
├── guides/
│   ├── authentication.md
│   └── products.md
├── api/
│   ├── endpoints.md
│   └── schemas.md
└── tutorials/
    └── first-store.md
```

### **Supported Frontmatter**

The script supports YAML frontmatter in markdown files:

```yaml
---
title: "Getting Started with EPCC"
description: "Complete guide to Elastic Path Commerce Cloud"
category: "guides"
tags: ["epcc", "getting-started"]
---

# Your content here...
```

## 🔄 Update Strategies

### **Full Replacement (Recommended)**

Set `CLEAR_EXISTING=true` to completely replace all documents:

```bash
CLEAR_EXISTING=true npm run update-docs
```

**Pros:**
- ✅ Ensures no stale content
- ✅ Clean slate for major updates
- ✅ Consistent document IDs

**Cons:**
- ⚠️ Temporary downtime during update
- ⚠️ Higher processing time

### **Incremental Updates**

Set `CLEAR_EXISTING=false` to add new documents alongside existing ones:

```bash
CLEAR_EXISTING=false npm run update-docs  
```

**Pros:**
- ✅ Faster updates
- ✅ No downtime

**Cons:**
- ⚠️ May create duplicate content
- ⚠️ Requires manual cleanup of old docs

## 🔍 Vector Search Index

After the first upload, ensure your MongoDB Atlas collection has a vector search index:

### **Automatic Index Creation**

The script attempts to create the index automatically:

```typescript
{
  name: "vector_index",
  type: "vectorSearch", 
  definition: {
    fields: [{
      type: "vector",
      path: "embedding",
      numDimensions: 1536,
      similarity: "cosine"
    }]
  }
}
```

### **Manual Index Creation (MongoDB Atlas UI)**

If automatic creation fails:

1. Go to MongoDB Atlas → Your Cluster → Search
2. Click "Create Search Index"
3. Choose "JSON Editor"
4. Use this configuration:

```json
{
  "mappings": {
    "dynamic": true,
    "fields": {
      "embedding": {
        "type": "knnVector",
        "dimensions": 1536,
        "similarity": "cosine"
      }
    }
  }
}
```

## 📊 Monitoring & Validation

### **Check Upload Success**

```bash
# Test connection and view stats
npm run db:test
```

### **Test Search Functionality**

After updating, test the chatbot to ensure it can find relevant content:

1. Start the development server: `npm run dev`
2. Ask questions related to your updated documentation
3. Check console logs for search results

### **Troubleshooting**

Common issues and solutions:

| Issue | Cause | Solution |
|-------|-------|----------|
| "Invalid API key" | Wrong OpenAI key | Check `OPENAI_API_KEY` |
| "Connection timeout" | MongoDB URI issues | Verify `MONGODB_CONNECTION_URI` |
| "No documents found" | Wrong path | Check docs directory path |
| "Index not found" | Missing vector index | Create vector search index |
| "Rate limit exceeded" | Too many API calls | The script includes rate limiting |

## 🔄 Automation Options

### **GitHub Actions**

Create `.github/workflows/update-docs.yml`:

```yaml
name: Update Documentation Database

on:
  push:
    paths:
      - 'docs/**'
  workflow_dispatch:

jobs:
  update-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm install
        
      - name: Update documentation database
        env:
          MONGODB_CONNECTION_URI: ${{ secrets.MONGODB_CONNECTION_URI }}
          MONGODB_DATABASE_NAME: ${{ secrets.MONGODB_DATABASE_NAME }}
          MONGODB_COLLECTION_NAME: ${{ secrets.MONGODB_COLLECTION_NAME }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          CLEAR_EXISTING: "true"
        run: npm run update-docs
```

### **Scheduled Updates**

Add a cron schedule to update docs regularly:

```yaml
on:
  schedule:
    - cron: '0 2 * * 0'  # Weekly on Sunday at 2 AM
```

## 🚫 **Preventing Documentation Duplication**

### **Problem**: Overlapping Directories
If your API docs are inside your main docs directory:
```
docs/
├── getting-started.md
├── guides/
└── api/              ← API docs inside main docs
    └── endpoints.md
```

Running both `npm run update-docs` and `npm run update-api-docs` could index the same files twice.

### **Solution 1: Separate Directories (Recommended)**
```
your-project/
├── docs/           ← General docs only
├── api-docs/       ← API docs only  
├── epcc-docs/      ← EPCC-specific docs
└── epsm-docs/      ← EPSM-specific docs
```

### **Solution 2: Use Exclude Patterns**
If you must keep API docs inside main docs, add to `.env.local`:
```bash
EXCLUDE_PATTERNS=**/api/**,**/reference/**
```

This prevents the main docs scan from including API subdirectories.

### **Solution 3: Manual Collection Management**
```bash
# Clear and update only specific collections
CLEAR_EXISTING=true npm run update-docs
CLEAR_EXISTING=true npm run update-api-docs
```

## 💡 Best Practices

1. **📋 Test First**: Always run `npm run db:test` before updates
2. **🔄 Use Full Replacement**: For major updates, clear existing docs
3. **📊 Monitor Embedding Costs**: Each document chunk costs ~$0.0001 to embed
4. **🔍 Validate Search**: Test chatbot functionality after updates
5. **📱 Update Both Collections**: Keep general and API docs in sync
6. **⚡ Rate Limiting**: The script includes automatic rate limiting
7. **🗂️ Organize Files**: Use clear directory structure in your docs

## 🎯 Next Steps

After updating your database:

1. **Test the chatbot** with questions about new content
2. **Monitor search results** in console logs
3. **Update prompts** if needed (in `src/constants/prompts.ts`)
4. **Consider automation** for regular updates
5. **Monitor usage** and embedding costs

Your chatbot is now ready with the latest documentation! 🎉 