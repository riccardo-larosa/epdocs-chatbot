# 🚀 Quick Start: Vector Search Setup

Get MongoDB Atlas Vector Search running in 5 minutes!

## ⚡ Quick Setup (5 minutes)

### 1. **Set Environment Variables**

Create `.env.local` with your credentials:

```bash
# MongoDB Atlas
MONGODB_CONNECTION_URI=mongodb+srv://username:password@cluster.mongodb.net/
MONGODB_DATABASE_NAME=epdocs_chatbot
MONGODB_COLLECTION_NAME=documents
MONGODB_API_COLLECTION_NAME=api_documents
VECTOR_SEARCH_INDEX_NAME=vector_index

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key
```

### 2. **Run Setup Script**

```bash
npm run setup-vector-search
```

This will:
- ✅ Test MongoDB connection
- ✅ Test OpenAI API
- ✅ Create vector search index
- ✅ Verify everything works

### 3. **Add Your Documentation**

```bash
# Create docs directory
mkdir docs

# Add your markdown files
echo "# My Documentation" > docs/example.md
```

### 4. **Index Your Content**

```bash
npm run update-docs
```

### 5. **Test the Chatbot**

```bash
npm run dev
```

Visit `http://localhost:3000/ask` and ask questions!

## 🔧 Manual Setup (if needed)

### MongoDB Atlas Setup

1. **Create Cluster**: [MongoDB Atlas](https://cloud.mongodb.com)
2. **Get Connection String**: Click "Connect" → "Connect your application"
3. **Create Vector Index**: Search tab → "Create Search Index" → JSON Editor:

```json
{
  "mappings": {
    "dynamic": true,
    "fields": {
      "embedding": {
        "dimensions": 1536,
        "similarity": "cosine",
        "type": "knnVector"
      }
    }
  }
}
```

## 📁 Directory Structure

```
project-root/
├── docs/                    # Your documentation
│   ├── guides/
│   ├── tutorials/
│   └── concepts/
├── api-docs/               # API documentation
└── .env.local              # Environment variables
```

## 🧪 Test Everything

```bash
# Test database connection
npm run db:test

# Test environment variables
npm run check-env

# Setup vector search
npm run setup-vector-search

# Index documentation
npm run update-docs

# Start chatbot
npm run dev
```

## 🐛 Common Issues

**Connection Failed?**
- Check your MongoDB connection string
- Ensure IP is whitelisted in Atlas

**API Key Error?**
- Verify OpenAI API key is valid
- Check billing/credits

**No Search Results?**
- Run `npm run update-docs` to index content
- Check MongoDB Atlas for documents

## 📚 Next Steps

1. **Add more documentation** to `./docs/`
2. **Customize chunk settings** in `scripts/updateDatabase.ts`
3. **Add API documentation** with `npm run update-api-docs`
4. **Deploy to production** with your hosting provider

---

**Need Help?** See the full [VECTOR_SEARCH_SETUP.md](./VECTOR_SEARCH_SETUP.md) guide. 