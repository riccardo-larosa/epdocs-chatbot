import { MongoClient } from 'mongodb';
import { OpenAIEmbeddings } from '@langchain/openai';
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import matter from 'gray-matter';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import dotenv from 'dotenv';

// Load .env.local file explicitly for local development
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
// Also load .env as fallback
dotenv.config();

interface DocumentChunk {
  pageContent: string;
  metadata: {
    source: string;
    _id: string;
    id: string;
    last_commit_date: string;
    chunk?: number;
  };
}

class DatabaseUpdater {
  private client: MongoClient;
  private embeddings: OpenAIEmbeddings;
  private textSplitter: RecursiveCharacterTextSplitter;

  constructor() {
    this.client = new MongoClient(process.env.MONGODB_CONNECTION_URI!);
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY!,
      modelName: "text-embedding-3-small",
    });
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
  }

  async connect() {
    await this.client.connect();
    console.log('✅ Connected to MongoDB');
  }

  async disconnect() {
    await this.client.close();
    console.log('✅ Disconnected from MongoDB');
  }

  /**
   * Process markdown files and create document chunks
   */
  async processMarkdownFiles(docsPath: string): Promise<DocumentChunk[]> {
    console.log(`📁 Processing markdown files from: ${docsPath}`);
    
    // Optional: exclude certain subdirectories to avoid duplication
    const excludePatterns = process.env.EXCLUDE_PATTERNS ? 
      process.env.EXCLUDE_PATTERNS.split(',').map(p => p.trim()) : [];
    
    const markdownFiles = await glob('**/*.{md,mdx}', { 
      cwd: docsPath,
      absolute: true,
      ignore: excludePatterns
    });

    console.log(`📄 Found ${markdownFiles.length} markdown files`);

    const chunks: DocumentChunk[] = [];

    for (const filePath of markdownFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const { data: frontmatter, content: markdownContent } = matter(content);
        
        // Get relative path for source
        const relativePath = path.relative(docsPath, filePath);
        
        // Split content into chunks
        const textChunks = await this.textSplitter.splitText(markdownContent);
        
        // Create document chunks
        textChunks.forEach((chunk, index) => {
          const chunkId = `${relativePath}:${index}`;
          chunks.push({
            pageContent: chunk,
            metadata: {
              source: relativePath,
              _id: chunkId,
              id: chunkId,
              last_commit_date: new Date().toISOString(),
              chunk: index,
              ...frontmatter // Include any frontmatter metadata
            }
          });
        });

        console.log(`📝 Processed ${textChunks.length} chunks from ${relativePath}`);
      } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error);
      }
    }

    return chunks;
  }

  /**
   * Generate embeddings for document chunks
   */
  async generateEmbeddings(chunks: DocumentChunk[]): Promise<any[]> {
    console.log(`🔢 Generating embeddings for ${chunks.length} chunks...`);
    
    const documents = [];
    const batchSize = 50; // Process in batches to avoid rate limits

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(chunks.length/batchSize)}`);

      for (const chunk of batch) {
        try {
          const embedding = await this.embeddings.embedQuery(chunk.pageContent);
          documents.push({
            ...chunk,
            embedding: embedding
          });
        } catch (error) {
          console.error(`❌ Error generating embedding for chunk ${chunk.metadata._id}:`, error);
        }
      }

      // Rate limiting delay
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`✅ Generated embeddings for ${documents.length} documents`);
    return documents;
  }

  /**
   * Update MongoDB collection with new documents
   */
  async updateCollection(
    documents: any[], 
    collectionName: string = 'documents'
  ) {
    console.log(`📤 Updating ${collectionName} collection with ${documents.length} documents...`);

    const db = this.client.db(process.env.MONGODB_DATABASE_NAME!);
    const collection = db.collection(collectionName);

    // Clear existing documents (optional - remove this for incremental updates)
    const clearExisting = process.env.CLEAR_EXISTING === 'true';
    if (clearExisting) {
      await collection.deleteMany({});
      console.log('🗑️ Cleared existing documents');
    }

    // Insert new documents in batches
    const batchSize = 100;
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      await collection.insertMany(batch);
      console.log(`📥 Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(documents.length/batchSize)}`);
    }

    console.log(`✅ Successfully updated ${collectionName} collection`);
  }

  /**
   * Create vector search index (run this once after first upload)
   */
  async createVectorIndex(collectionName: string = process.env.MONGODB_COLLECTION_NAME || 'documents') {
    console.log(`🔍 Creating vector search index for ${collectionName}...`);
    
    const db = this.client.db(process.env.MONGODB_DATABASE_NAME!);
    const collection = db.collection(collectionName);

    try {
      await collection.createSearchIndex({
        name: process.env.VECTOR_SEARCH_INDEX_NAME || "vector_index",
        type: "vectorSearch",
        definition: {
          fields: [
            {
              type: "vector",
              path: "embedding",
              numDimensions: 1536, // OpenAI text-embedding-3-small dimensions
              similarity: "cosine"
            }
          ]
        }
      });
      console.log('✅ Vector search index created successfully');
    } catch (error) {
      console.error('❌ Error creating vector index:', error);
      console.log('ℹ️ Index may already exist or you may need to create it manually in MongoDB Atlas');
    }
  }

  /**
   * Full update process
   */
  async updateDocumentation(docsPath: string, collectionName: string = process.env.MONGODB_COLLECTION_NAME || 'documents') {
    try {
      await this.connect();

      // Process markdown files
      const chunks = await this.processMarkdownFiles(docsPath);
      
      if (chunks.length === 0) {
        console.log('⚠️ No documents found to process');
        return;
      }

      // Generate embeddings
      const documents = await this.generateEmbeddings(chunks);

      // Update database
      await this.updateCollection(documents, collectionName);

      console.log(`🎉 Successfully updated ${collectionName} with ${documents.length} documents!`);
    } catch (error) {
      console.error('❌ Error updating documentation:', error);
    } finally {
      await this.disconnect();
    }
  }
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);
  
  // Determine docs path based on collection override or argument or default
  let docsPath = args[0];
  if (!docsPath) {
    if (process.env.COLLECTION_OVERRIDE === 'api') {
      docsPath = process.env.API_DOCS_PATH || './api-docs';
    } else if (process.env.COLLECTION_OVERRIDE === 'guides') {
      docsPath = process.env.GUIDES_PATH || './elastic-path-guides';
    } else if (process.env.COLLECTION_OVERRIDE === 'epcc') {
      docsPath = process.env.EPCC_DOCS_PATH || './epcc-docs';
    } else if (process.env.COLLECTION_OVERRIDE === 'epsm') {
      docsPath = process.env.EPSM_DOCS_PATH || './epsm-docs';
    } else if (process.env.COLLECTION_OVERRIDE === 'rfp') {
      docsPath = process.env.RFP_PATH || './rfp';
    } else {
      docsPath = process.env.DOCS_PATH || './docs';
    }
  }
  
  // Determine collection name based on override or argument or default
  let collectionName = args[1];
  if (!collectionName) {
    if (process.env.COLLECTION_OVERRIDE === 'api') {
      collectionName = process.env.MONGODB_API_COLLECTION_NAME || 'openapis_prod';
    } else if (process.env.COLLECTION_OVERRIDE === 'epcc') {
      collectionName = process.env.MONGODB_EPCC_COLLECTION_NAME || 'epcc_docs_prod';
    } else if (process.env.COLLECTION_OVERRIDE === 'epsm') {
      collectionName = process.env.MONGODB_EPSM_COLLECTION_NAME || 'epsm_docs_prod';
    } else if (process.env.COLLECTION_OVERRIDE === 'rfp') {
      collectionName = process.env.MONGODB_RFP_COLLECTION_NAME || 'rfp_docs_prod';
    } else {
      // Main docs and guides go into the main collection
      collectionName = process.env.MONGODB_COLLECTION_NAME || 'chat_docs_prod';
    }
  }

  console.log('🚀 Starting database update...');
  console.log(`📁 Documentation path: ${docsPath}`);
  console.log(`🗄️ Collection: ${collectionName}`);

  const updater = new DatabaseUpdater();
  await updater.updateDocumentation(docsPath, collectionName);
}

// Export for programmatic use
export { DatabaseUpdater };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
} 