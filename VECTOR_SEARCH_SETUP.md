# 🚀 MongoDB Atlas Vector Search Setup Guide

This guide will help you set up MongoDB Atlas Vector Search for the Elastic Path documentation chatbot.

## 📋 Prerequisites

- ✅ MongoDB Atlas account with a cluster
- ✅ Node.js and npm installed
- ✅ Access to your Elastic Path documentation

## 🔧 Step 1: MongoDB Atlas Setup

### 1.1 Create MongoDB Atlas Cluster

1. **Sign up/Login** to [MongoDB Atlas](https://cloud.mongodb.com)
2. **Create a new cluster** (M0 Free tier works for development)
3. **Set up database access**:
   - Create a database user with read/write permissions
   - Note down username and password
4. **Set up network access** (IP whitelist or 0.0.0.0/0 for development)

### 1.2 Get Connection String

1. In Atlas dashboard, click **"Connect"** on your cluster
2. Choose **"Connect your application"**
3. Copy the connection string (replace `<password>` with your actual password)

### 1.3 Enable Vector Search

1. In Atlas dashboard, go to **"Search"** tab
2. Click **"Create Search Index"**
3. Choose **"JSON Editor"** and paste this configuration:

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

4. Name the index: `default`
5. Click **"Create"**

## 🔧 Step 2: Environment Configuration

Create `.env.local` in your project root:

```bash
# MongoDB Configuration
MONGODB_CONNECTION_URI=mongodb+srv://username:password@cluster.mongodb.net/
MONGODB_DATABASE_NAME=epdocs_chatbot
MONGODB_COLLECTION_NAME=documents
MONGODB_API_COLLECTION_NAME=api_documents
VECTOR_SEARCH_INDEX_NAME=vector_index

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key

# Document Processing
CLEAR_EXISTING=false
DOCS_PATH=./docs
API_DOCS_PATH=./api-docs
TUTORIALS_PATH=./tutorials

# Optional: Exclude patterns
EXCLUDE_PATTERNS=**/node_modules/**,**/build/**,**/.git/**

# MongoDB Atlas Configuration
MONGODB_URI=your_mongodb_atlas_connection_string
MONGODB_DATABASE_NAME=your_database_name
MONGODB_COLLECTION_NAME=chat_docs_prod
MONGODB_API_COLLECTION_NAME=openapis_prod

# Documentation Paths
DOCS_PATH=./docs
API_DOCS_PATH=./api-docs
GUIDES_PATH=./elastic-path-guides
EPCC_DOCS_PATH=./epcc-docs
EPSM_DOCS_PATH=./epsm-docs
RFP_PATH=./rfp

# Vector Search Configuration
VECTOR_SEARCH_INDEX_NAME=default
VECTOR_SEARCH_DIMENSIONS=1536
```

## 🔧 Step 3: Install Dependencies

```bash
npm install
```

## 🔧 Step 4: Test Database Connection

```bash
npm run db:test
```

This should show: `✅ Connected to MongoDB`

## 🔧 Step 5: Prepare Documentation Files

### 5.1 Directory Structure

Set up your documentation directories:

```
project-root/
├── docs/                    # General documentation
│   ├── guides/
│   ├── tutorials/
│   └── concepts/
├── api-docs/               # API documentation
│   ├── endpoints/
│   ├── schemas/
│   └── examples/
├── tutorials/              # Step-by-step tutorials
│   ├── getting-started/
│   ├── advanced-topics/
│   └── troubleshooting/
└── elastic-path-docs/      # Elastic Path specific docs
    ├── epcc/
    ├── epsm/
    └── pxm/
```

### 5.2 Document Format

Ensure your markdown files have proper frontmatter:

```markdown
---
title: "Product Experience Manager Guide"
category: "guides"
product: "pxm"
---

# Product Experience Manager

Your content here...
```

## 🔧 Step 6: Index Your Documentation

### 6.1 Index General Documentation

```bash
# Index from ./docs directory
npm run update-docs

# Or specify custom path
npx tsx scripts/updateDatabase.ts ./your-docs-path documents
```

### 6.2 Index API Documentation

```bash
# Index API docs to separate collection
npm run update-api-docs

# Or specify custom path
npx tsx scripts/updateDatabase.ts ./api-docs api_documents
```

### 6.3 Index Specific Content Types

```bash
# Index guides content
npm run update-guides

# Index EPCC-specific content
npm run update-epcc-docs

# Index EPSM-specific content
npm run update-epsm-docs

# Index tutorials content
npm run update-tutorials
```

## 🔧 Step 7: Verify Vector Search

### 7.1 Check Index Creation

The script will automatically create the vector search index. Verify in MongoDB Atlas:

1. Go to **"Search"** tab
2. You should see `vector_index` listed
3. Status should be **"Active"**

### 7.2 Test Vector Search

Start your development server and test:

```bash
npm run dev
```

Visit `http://localhost:3000/ask` and ask a question. Check the console for:

```
calling findRelevantContent with question: your question
Content sources: -----------------------
path/to/relevant/doc.md
```

## 🔧 Step 8: Advanced Configuration

### 8.1 Custom Embedding Model

To use a different embedding model, update `src/lib/mongoDbRetriever.ts`:

```typescript
const embeddings = new OpenAIEmbeddings({
    openAIApiKey: config.openaiApiKey,
    modelName: "text-embedding-3-large", // or "text-embedding-ada-002"
});
```

**Note**: If changing models, update the vector dimensions in MongoDB Atlas:
- `text-embedding-3-small`: 1536 dimensions
- `text-embedding-3-large`: 3072 dimensions
- `text-embedding-ada-002`: 1536 dimensions

### 8.2 Custom Chunk Settings

Update chunk size and overlap in `scripts/updateDatabase.ts`:

```typescript
this.textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1500,    // Default: 1000
    chunkOverlap: 300,  // Default: 200
});
```

### 8.3 Multiple Collections

For different content types, use separate collections:

```bash
# Environment variables
MONGODB_COLLECTION_NAME=general_docs
MONGODB_API_COLLECTION_NAME=api_docs
MONGODB_GUIDES_COLLECTION_NAME=guides_docs

# Index to different collections
COLLECTION_OVERRIDE=guides npm run update-docs
COLLECTION_OVERRIDE=api npm run update-docs
```

## 🔧 Step 9: Production Deployment

### 9.1 Environment Variables

Set these in your production environment (Vercel/Netlify/etc.):

```bash
MONGODB_CONNECTION_URI=mongodb+srv://...
MONGODB_DATABASE_NAME=epdocs_chatbot
MONGODB_COLLECTION_NAME=documents
MONGODB_API_COLLECTION_NAME=api_documents
VECTOR_SEARCH_INDEX_NAME=vector_index
OPENAI_API_KEY=sk-...
```

### 9.2 Index Production Data

Run indexing scripts in production:

```bash
# Build and deploy first
npm run build
npm run start

# Then index your production documentation
npm run update-docs
npm run update-api-docs
```

## 🐛 Troubleshooting

### Common Issues

**1. Connection Failed**
```bash
# Check your connection string
npm run db:test
```

**2. Vector Index Not Found**
```bash
# Recreate the index
npx tsx scripts/updateDatabase.ts ./docs documents --create-index
```

**3. Embedding Generation Fails**
```bash
# Check OpenAI API key
echo $OPENAI_API_KEY
```

**4. No Search Results**
```bash
# Check if documents were indexed
# In MongoDB Atlas, go to Collections tab
# Verify documents exist with embedding field
```

### Debug Commands

```bash
# Test database connection
npm run db:test

# Check environment variables
npm run check-env

# Test with specific collection
COLLECTION_OVERRIDE=test npx tsx scripts/updateDatabase.ts ./test-docs test_collection
```

## 📊 Monitoring

### MongoDB Atlas Metrics

Monitor these in Atlas dashboard:
- **Search Queries**: Number of vector searches
- **Query Performance**: Response times
- **Index Size**: Storage usage

### Application Logs

Check for these log messages:
```
✅ Connected to MongoDB
📁 Processing markdown files from: ./docs
📄 Found 150 markdown files
🔢 Generating embeddings for 750 chunks...
✅ Generated embeddings for 750 documents
📤 Updating documents collection with 750 documents...
✅ Successfully updated documents collection
```

## 🎯 Next Steps

1. **Add more documentation sources**
2. **Optimize chunk sizes** for your content
3. **Implement caching** for frequently asked questions
4. **Add analytics** to track search performance
5. **Set up automated indexing** with webhooks

---

**Need Help?** Check the [DATABASE_UPDATE_GUIDE.md](./DATABASE_UPDATE_GUIDE.md) for more detailed information. 