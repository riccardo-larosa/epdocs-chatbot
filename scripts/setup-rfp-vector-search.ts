import { MongoClient } from 'mongodb';
import { OpenAIEmbeddings } from '@langchain/openai';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local file explicitly for local development
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
// Also load .env as fallback
dotenv.config();

interface SetupConfig {
  mongodbUri: string;
  dbName: string;
  collectionName: string;
  openaiApiKey: string;
  indexName: string;
}

class RfpVectorSearchSetup {
  private client: MongoClient;
  private embeddings: OpenAIEmbeddings;

  constructor(config: SetupConfig) {
    this.client = new MongoClient(config.mongodbUri);
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: config.openaiApiKey,
      modelName: "text-embedding-3-small",
    });
  }

  async connect() {
    try {
      await this.client.connect();
      console.log('✅ Connected to MongoDB Atlas');
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error);
      return false;
    }
  }

  async disconnect() {
    await this.client.close();
    console.log('✅ Disconnected from MongoDB');
  }

  async createVectorIndex(collectionName: string, indexName: string) {
    console.log(`🔍 Creating vector search index for RFP collection: ${indexName}`);
    
    const db = this.client.db(process.env.MONGODB_DATABASE_NAME);
    const collection = db.collection(collectionName);

    try {
      // Check if index already exists
      const indexes = await collection.listSearchIndexes().toArray();
      const existingIndex = indexes.find(index => index.name === indexName);
      
      if (existingIndex) {
        console.log(`ℹ️  Index '${indexName}' already exists in RFP collection`);
        return true;
      }

      // Create the vector search index
      await collection.createSearchIndex({
        name: indexName,
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
      
      console.log(`✅ Vector search index '${indexName}' created successfully for RFP collection`);
      return true;
    } catch (error) {
      console.error(`❌ Error creating vector index for RFP collection:`, error);
      return false;
    }
  }

  async testEmbeddingGeneration() {
    console.log('🧪 Testing embedding generation...');
    
    try {
      const testText = "This is a test document for RFP vector search.";
      const embedding = await this.embeddings.embedQuery(testText);
      
      console.log(`✅ Embedding generated successfully (${embedding.length} dimensions)`);
      return true;
    } catch (error) {
      console.error('❌ Failed to generate embedding:', error);
      return false;
    }
  }

  async testVectorSearch(collectionName: string) {
    console.log('🔍 Testing RFP vector search...');
    
    const db = this.client.db(process.env.MONGODB_DATABASE_NAME);
    const collection = db.collection(collectionName);

    try {
      // Test search query
      const testQuery = "RFP pricing implementation";
      const embedding = await this.embeddings.embedQuery(testQuery);
      
      const results = await collection.aggregate([
        {
          $search: {
            index: process.env.VECTOR_SEARCH_INDEX_NAME || "vector_index",
            knnBeta: {
              vector: embedding,
              path: "embedding",
              k: 5
            }
          }
        },
        {
          $project: {
            pageContent: 1,
            metadata: 1,
            score: { $meta: "searchScore" }
          }
        }
      ]).toArray();

      console.log(`✅ RFP vector search test successful (found ${results.length} results)`);
      if (results.length > 0) {
        console.log(`📄 Sample result source: ${results[0].metadata?.source || 'Unknown'}`);
      }
      return true;
    } catch (error) {
      console.error('❌ RFP vector search test failed:', error);
      return false;
    }
  }

  async checkEnvironment() {
    console.log('🔧 Checking RFP environment configuration...');
    
    const requiredVars = [
      'MONGODB_CONNECTION_URI',
      'MONGODB_DATABASE_NAME', 
      'MONGODB_RFP_COLLECTION_NAME',
      'OPENAI_API_KEY'
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      console.error('❌ Missing required environment variables:', missing);
      return false;
    }

    console.log('✅ All required RFP environment variables are set');
    return true;
  }

  async runSetup() {
    console.log('🚀 Starting RFP Vector Search Setup...\n');

    // Check environment
    if (!await this.checkEnvironment()) {
      return false;
    }

    // Connect to MongoDB
    if (!await this.connect()) {
      return false;
    }

    // Test embedding generation
    if (!await this.testEmbeddingGeneration()) {
      await this.disconnect();
      return false;
    }

    // Create vector index for RFP collection
    const collectionName = process.env.MONGODB_RFP_COLLECTION_NAME!;
    const indexName = process.env.VECTOR_SEARCH_INDEX_NAME || "vector_index";
    
    if (!await this.createVectorIndex(collectionName, indexName)) {
      await this.disconnect();
      return false;
    }

    // Test vector search
    try {
      await this.testVectorSearch(collectionName);
    } catch (error) {
      console.log('ℹ️  RFP vector search test failed, but index was created');
    }

    await this.disconnect();
    
    console.log('\n🎉 RFP Vector Search Setup Complete!');
    console.log('\n📝 Next Steps:');
    console.log('1. Test the RFP chatbot: npm run dev');
    console.log('2. Visit: http://localhost:3000/rfp');
    
    return true;
  }
}

async function main() {
  const config: SetupConfig = {
    mongodbUri: process.env.MONGODB_CONNECTION_URI!,
    dbName: process.env.MONGODB_DATABASE_NAME!,
    collectionName: process.env.MONGODB_RFP_COLLECTION_NAME!,
    openaiApiKey: process.env.OPENAI_API_KEY!,
    indexName: process.env.VECTOR_SEARCH_INDEX_NAME || "vector_index"
  };

  const setup = new RfpVectorSearchSetup(config);
  const success = await setup.runSetup();
  
  process.exit(success ? 0 : 1);
}

main().catch(console.error); 