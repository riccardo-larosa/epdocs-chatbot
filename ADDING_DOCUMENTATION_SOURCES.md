# 📚 Adding Additional Documentation Sources

This guide shows you how to add new documentation sources to your Elastic Path chatbot.

## 🎯 Current Documentation Sources

Your chatbot currently supports these documentation sources:

| Source | Script | Directory | Collection | Description |
|--------|--------|-----------|------------|-------------|
| **General Docs** | `npm run update-docs` | `./docs` | `documents` | General documentation |
| **API Docs** | `npm run update-api-docs` | `./api-docs` | `api_documents` | API reference material |
| **Guides** | `npm run update-guides` | `./elastic-path-guides` | `documents` | Learning guides |
| **EPCC Docs** | `npm run update-epcc-docs` | `./epcc-docs` | `documents` | EPCC-specific content |
| **EPSM Docs** | `npm run update-epsm-docs` | `./epsm-docs` | `documents` | EPSM-specific content |
| **RFP Docs** | `npm run update-rfp-docs` | `./rfp` | `documents` | Request for Proposal information |

## 🚀 Adding a New Documentation Source

### Step 1: Create the Directory

```bash
mkdir -p your-new-source
```

### Step 2: Add the NPM Script

Edit `package.json` and add a new script:

```json
{
  "scripts": {
    "update-your-new-source": "COLLECTION_OVERRIDE=your-new-source tsx scripts/updateDatabase.ts"
  }
}
```

### Step 3: Update the Database Script

Edit `scripts/updateDatabase.ts` and add your new source:

```typescript
// In the main() function, add this condition:
} else if (process.env.COLLECTION_OVERRIDE === 'your-new-source') {
  docsPath = process.env.YOUR_NEW_SOURCE_PATH || './your-new-source';
}
```

### Step 4: Add Environment Variable

Add to your `.env.local`:

```bash
YOUR_NEW_SOURCE_PATH=./your-new-source
```

### Step 5: Add Documentation Files

Create markdown files in your new directory:

```bash
# Example structure
your-new-source/
├── getting-started.md
├── advanced-features.md
└── troubleshooting.md
```

### Step 6: Index Your Content

```bash
npm run update-your-new-source
```

## 📝 Example: Adding RFP Documentation

Here's a complete example of adding RFP documentation:

### 1. Create Directory and Files

```bash
mkdir -p rfp
```

Create `rfp/getting-started-with-pxm.md`:

```markdown
# Frequently Asked Questions

## How do I reset my password?

To reset your password:
1. Go to the login page
2. Click "Forgot Password"
3. Enter your email address
4. Check your email for reset instructions

## How do I contact support?

You can contact support by:
- Email: support@elasticpath.com
- Phone: 1-800-ELASTIC
- Live chat: Available in Commerce Manager
```

### 2. Add NPM Script

```json
{
  "scripts": {
    "update-rfp": "COLLECTION_OVERRIDE=rfp tsx scripts/updateDatabase.ts"
  }
}
```

### 3. Update Database Script

```typescript
} else if (process.env.COLLECTION_OVERRIDE === 'rfp') {
  docsPath = process.env.RFP_PATH || './rfp';
}
```

### 4. Add Environment Variable

```bash
RFP_PATH=./rfp
```

### 5. Index RFP Content

```bash
npm run update-rfp
```

## 🔧 Advanced Configuration

### Custom Collection Names

To use a separate collection for your new source:

```typescript
// In scripts/updateDatabase.ts
if (process.env.COLLECTION_OVERRIDE === 'your-new-source') {
  collectionName = process.env.MONGODB_YOUR_NEW_SOURCE_COLLECTION_NAME || 'your_new_source_prod';
}
```

Add to `.env.local`:

```bash
MONGODB_YOUR_NEW_SOURCE_COLLECTION_NAME=your_new_source_prod
```

### Custom Processing

For special processing needs, you can modify the `processMarkdownFiles` method:

```typescript
async processMarkdownFiles(docsPath: string, sourceType?: string): Promise<DocumentChunk[]> {
  // Add custom logic based on sourceType
  if (sourceType === 'rfp') {
    // Special processing for RFP files
    return this.processRFPFiles(docsPath);
  }
  
  // Default processing
  return this.processStandardFiles(docsPath);
}
```

### Metadata Enhancement

Add custom metadata to your documents:

```typescript
// In the document chunk creation
chunks.push({
  pageContent: chunk,
  metadata: {
    source: relativePath,
    _id: chunkId,
    id: chunkId,
    last_commit_date: new Date().toISOString(),
    chunk: index,
    sourceType: process.env.COLLECTION_OVERRIDE, // Add source type
    ...frontmatter
  }
});
```

## 📊 Best Practices

### Directory Organization

```
project-root/
├── docs/                    # General documentation
├── api-docs/               # API reference
├── tutorials/              # Step-by-step guides
├── faq/                    # Frequently asked questions
├── release-notes/          # Version updates
├── best-practices/         # Best practices guides
└── troubleshooting/        # Troubleshooting guides
```

### File Naming

Use descriptive, consistent file names:

```bash
# Good examples
getting-started-with-pxm.md
api-authentication-guide.md
troubleshooting-common-issues.md

# Avoid
doc1.md
temp.md
untitled.md
```

### Content Structure

Use consistent markdown structure:

```markdown
---
title: "Your Document Title"
category: "your-category"
product: "relevant-product"
---

# Main Heading

## Section Heading

Content here...

### Subsection

More content...

## Another Section

- Bullet points
- For easy reading
```

## 🧪 Testing Your New Source

### 1. Test the Script

```bash
# Test with your new source
npm run update-your-new-source
```

### 2. Verify in MongoDB

Check that documents were indexed:

```bash
# Connect to MongoDB and check your collection
db.documents.find({"metadata.source": {$regex: "your-new-source"}})
```

### 3. Test the Chatbot

```bash
npm run dev
```

Ask questions related to your new content to verify it's being found.

## 🐛 Troubleshooting

### Common Issues

**Script Not Found**
- Check that you added the script to `package.json`
- Verify the script name matches your command

**No Documents Indexed**
- Check the directory path in your environment variable
- Verify markdown files exist in the directory
- Check for file permissions

**Documents Not Found in Search**
- Verify the collection name is correct
- Check that the vector index includes your collection
- Ensure documents have proper metadata

### Debug Commands

```bash
# Test with verbose output
DEBUG=true npm run update-your-new-source

# Check environment variables
npm run check-env

# Test database connection
npm run db:test
```

## 🎯 Next Steps

After adding your new documentation source:

1. **Add more content** to your new directory
2. **Test search functionality** with your new content
3. **Optimize chunk sizes** if needed for your content type
4. **Add to your CI/CD pipeline** for automated updates
5. **Monitor search performance** and adjust as needed

---

**Need Help?** Check the [VECTOR_SEARCH_SETUP.md](./VECTOR_SEARCH_SETUP.md) for the complete setup guide. 