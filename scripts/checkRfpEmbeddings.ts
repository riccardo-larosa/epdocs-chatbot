import { MongoClient } from 'mongodb';
import { OpenAIEmbeddings } from '@langchain/openai';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local file explicitly for local development
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
// Also load .env as fallback
dotenv.config();

async function checkRfpEmbeddings() {
    console.log('🔍 Checking RFP Collection Embeddings...');
    
    const client = new MongoClient(process.env.MONGODB_CONNECTION_URI!);
    
    try {
        await client.connect();
        console.log('✅ Successfully connected to MongoDB');
        
        const db = client.db(process.env.MONGODB_DATABASE_NAME!);
        const rfpCollection = db.collection(process.env.MONGODB_RFP_COLLECTION_NAME || 'rfp_docs_prod');
        
        // Check document count
        const docCount = await rfpCollection.countDocuments();
        console.log(`📊 Total RFP Documents: ${docCount}`);
        
        // Check documents with embeddings
        const docsWithEmbeddings = await rfpCollection.countDocuments({ embedding: { $exists: true } });
        console.log(`🔢 Documents with embeddings: ${docsWithEmbeddings}`);
        
        if (docsWithEmbeddings === 0) {
            console.log('❌ No documents have embeddings!');
            console.log('💡 You need to run: npm run update-rfp');
            return;
        }
        
        // Get a sample document with embedding
        const sampleDoc = await rfpCollection.findOne({ embedding: { $exists: true } });
        if (sampleDoc) {
            console.log('📄 Sample Document with Embedding:');
            console.log(`  Source: ${sampleDoc.metadata?.source || 'Unknown'}`);
            console.log(`  Embedding length: ${sampleDoc.embedding?.length || 0}`);
            console.log(`  Content preview: ${sampleDoc.pageContent?.substring(0, 100)}...`);
        }
        
        // Test vector search directly
        console.log('\n🧪 Testing Vector Search...');
        const embeddings = new OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_API_KEY!,
            modelName: "text-embedding-3-small",
        });
        
        const testQuery = "pricing implementation";
        const queryEmbedding = await embeddings.embedQuery(testQuery);
        console.log(`✅ Generated query embedding (${queryEmbedding.length} dimensions)`);
        
        // Try direct aggregation
        try {
            const results = await rfpCollection.aggregate([
                {
                    $search: {
                        index: "vector_index",
                        knnBeta: {
                            vector: queryEmbedding,
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
            
            console.log(`✅ Vector search successful! Found ${results.length} results`);
            if (results.length > 0) {
                console.log('📄 Top result:');
                console.log(`  Source: ${results[0].metadata?.source || 'Unknown'}`);
                console.log(`  Score: ${results[0].score}`);
                console.log(`  Content: ${results[0].pageContent?.substring(0, 150)}...`);
            }
        } catch (error) {
            console.error('❌ Vector search failed:', error);
            
            // Try alternative approach - check if index exists
            try {
                const indexes = await rfpCollection.listSearchIndexes().toArray();
                console.log('📑 Available search indexes:');
                indexes.forEach(index => {
                    console.log(`  - ${index.name}`);
                });
            } catch (indexError) {
                console.error('❌ Could not list search indexes:', indexError);
            }
        }
        
    } catch (error) {
        console.error('❌ Error checking RFP embeddings:', error);
    } finally {
        await client.close();
    }
}

checkRfpEmbeddings().catch(console.error); 