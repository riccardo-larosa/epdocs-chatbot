import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local file explicitly for local development
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
// Also load .env as fallback
dotenv.config();

async function testRfpCollection() {
    console.log('🔗 Testing RFP Collection...');
    
    const client = new MongoClient(process.env.MONGODB_CONNECTION_URI!);
    
    try {
        await client.connect();
        console.log('✅ Successfully connected to MongoDB');
        
        const db = client.db(process.env.MONGODB_DATABASE_NAME!);
        const rfpCollection = db.collection(process.env.MONGODB_RFP_COLLECTION_NAME || 'rfp_docs_prod');
        
        // Check if collection exists
        const collections = await db.listCollections({ name: rfpCollection.collectionName }).toArray();
        if (collections.length === 0) {
            console.log('❌ RFP collection does not exist!');
            console.log('💡 You need to run: npm run update-rfp');
            return;
        }
        
        console.log(`✅ RFP collection exists: ${rfpCollection.collectionName}`);
        
        // Get document count
        const docCount = await rfpCollection.countDocuments();
        console.log(`📊 RFP Document Count: ${docCount}`);
        
        if (docCount === 0) {
            console.log('⚠️ RFP collection is empty!');
            console.log('💡 You need to run: npm run update-rfp');
            return;
        }
        
        // Check for vector search index
        try {
            const indexes = await rfpCollection.listIndexes().toArray();
            console.log('📑 RFP Collection Indexes:');
            indexes.forEach(index => {
                console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
            });
            
            const vectorIndex = indexes.find(index => index.name === 'vector_index');
            if (!vectorIndex) {
                console.log('❌ Vector search index not found in RFP collection!');
                console.log('💡 You need to create the vector search index');
                return;
            }
            
            console.log('✅ Vector search index exists in RFP collection');
            
        } catch (error) {
            console.error('❌ Error checking indexes:', error);
        }
        
        // Test a sample query
        try {
            const sampleDoc = await rfpCollection.findOne({});
            if (sampleDoc) {
                console.log('📄 Sample RFP Document:');
                console.log(`  Source: ${sampleDoc.metadata?.source || 'Unknown'}`);
                console.log(`  Has embedding: ${!!sampleDoc.embedding}`);
                console.log(`  Content length: ${sampleDoc.pageContent?.length || 0} characters`);
            }
        } catch (error) {
            console.error('❌ Error getting sample document:', error);
        }
        
        console.log('🎉 RFP collection test completed!');
        
    } catch (error) {
        console.error('❌ Error testing RFP collection:', error);
    } finally {
        await client.close();
    }
}

testRfpCollection().catch(console.error); 