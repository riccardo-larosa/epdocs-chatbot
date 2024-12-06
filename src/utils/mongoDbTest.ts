import { MongoClient } from 'mongodb';

export async function testMongoDBConnection() {
  const uri = process.env.MONGODB_CONNECTION_URI;
  const dbName = process.env.MONGODB_DATABASE_NAME;
  const collectionName = process.env.MONGODB_COLLECTION_NAME;

  if (!uri || !dbName || !collectionName) {
    throw new Error('Missing MongoDB environment variables');
  }

  const client = new MongoClient(uri);

  try {
    // Test connection
    await client.connect();
    console.log('✅ Successfully connected to MongoDB');

    // Get database and collection info
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Get collection stats
    const count = await collection.estimatedDocumentCount();
    console.log('\nCollection Statistics:');
    console.log(`📊 Document Count: ${count}`);
    //console.log(`📦 Size: ${(await collection.collStats()).size / 1024 / 1024).toFixed(2)} MB`);

    // List indexes
    const indexes = await collection.listIndexes().toArray();
    console.log('\n📑 Indexes:');
    indexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });

    // Sample documents
    const sampleDocs = await collection.find({}).limit(3).toArray();
    console.log('\n📄 Sample Document:');
    if (sampleDocs.length > 0) {
      // console.log(JSON.stringify(sampleDocs[0], null, 2));
    }

    return {
      success: true,
      stats: {
        documentCount: count,
        sizeInMB: ((await db.command({ collStats: collectionName })).size / 1024 / 1024).toFixed(2),
        indexes: indexes.map(index => index.name),
        sampleDocuments: sampleDocs
      }
    };
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    throw error;
  } finally {
    await client.close();
  }
}