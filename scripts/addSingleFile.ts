import { MongoClient } from 'mongodb';
import { OpenAIEmbeddings } from '@langchain/openai';
import fs from 'fs';
import path from 'path';
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

class SingleFileAdder {
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
   * Process a single markdown file and create document chunks
   */
  async processSingleFile(filePath: string, basePath?: string): Promise<DocumentChunk[]> {
    console.log(`📁 Processing single file: ${filePath}`);
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const { data: frontmatter, content: markdownContent } = matter(content);
      
      // Get relative path for source
      const relativePath = basePath ? path.relative(basePath, filePath) : path.basename(filePath);
      
      // Split content into chunks
      const textChunks = await this.textSplitter.splitText(markdownContent);
      
      // Create document chunks
      const chunks: DocumentChunk[] = [];
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
      return chunks;
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error);
      throw error;
    }
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
   * Add documents to MongoDB collection (incremental update)
   */
  async addToCollection(
    documents: any[], 
    collectionName: string = 'documents'
  ) {
    console.log(`📤 Adding ${documents.length} documents to ${collectionName} collection...`);

    const db = this.client.db(process.env.MONGODB_DATABASE_NAME!);
    const collection = db.collection(collectionName);

    // Remove existing documents with the same source to avoid duplicates
    const sources = [...new Set(documents.map(doc => doc.metadata.source))];
    for (const source of sources) {
      const deleteResult = await collection.deleteMany({ 'metadata.source': source });
      console.log(`🗑️ Removed ${deleteResult.deletedCount} existing documents for ${source}`);
    }

    // Insert new documents in batches
    const batchSize = 100;
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      await collection.insertMany(batch);
      console.log(`📥 Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(documents.length/batchSize)}`);
    }

    console.log(`✅ Successfully added documents to ${collectionName} collection`);
  }

  /**
   * Add a single file to the database
   */
  async addSingleFile(
    filePath: string, 
    collectionName: string = 'documents',
    basePath?: string
  ) {
    try {
      await this.connect();

      // Process the single file
      const chunks = await this.processSingleFile(filePath, basePath);
      
      if (chunks.length === 0) {
        console.log('⚠️ No content found in file to process');
        return;
      }

      // Generate embeddings
      const documents = await this.generateEmbeddings(chunks);

      // Add to database
      await this.addToCollection(documents, collectionName);

      console.log(`🎉 Successfully added file to ${collectionName} with ${documents.length} documents!`);
    } catch (error) {
      console.error('❌ Error adding file:', error);
    } finally {
      await this.disconnect();
    }
  }
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: npm run add-file <file-path> [collection-name] [base-path]');
    console.log('Example: npm run add-file /path/to/file.md rfp_docs_prod /path/to/base');
    process.exit(1);
  }

  const filePath = args[0];
  const collectionName = args[1] || process.env.MONGODB_COLLECTION_NAME || 'documents';
  const basePath = args[2]; // Optional base path for relative source paths

  console.log('🚀 Starting single file addition...');
  console.log(`📁 File path: ${filePath}`);
  console.log(`🗄️ Collection: ${collectionName}`);
  if (basePath) {
    console.log(`📂 Base path: ${basePath}`);
  }

  const adder = new SingleFileAdder();
  await adder.addSingleFile(filePath, collectionName, basePath);
}

// Export for programmatic use
export { SingleFileAdder };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
} 