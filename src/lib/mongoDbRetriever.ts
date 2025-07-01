import { AgentConfig } from '@/types/agent';
import { MongoDBAtlasVectorSearch } from '@langchain/mongodb';
import { OpenAIEmbeddings } from '@langchain/openai';
import { MongoClient } from 'mongodb';

export class MongoDBRetriever {
    private vectorStore!: MongoDBAtlasVectorSearch;

    async init(config: AgentConfig) {
        const embeddings = new OpenAIEmbeddings({
            openAIApiKey: config.openaiApiKey,
            modelName: "text-embedding-3-small",
        });
        const client = new MongoClient(config.mongodbUri);
        await client.connect();
        const collection = client.db(config.dbName).collection(config.collectionName);
        this.vectorStore = new MongoDBAtlasVectorSearch(
            embeddings,
            {
                collection: collection,
                indexName: config.indexName || "vector_index",
            }
        );
    }

    async similaritySearch(query: string, topK: number = 5) {
        return await this.vectorStore.similaritySearch(query, topK);
    }
}

export async function findRelevantContent(question: string, mode?: string) {
    console.log(`calling findRelevantContent with question: ${question}, mode: ${mode}`);
    
    let allResults: any[] = [];
    
    // For RFP mode, use the same simple approach as non-RFP but with RFP collection
    if (mode === 'rfp') {
        const collectionName = process.env.MONGODB_RFP_COLLECTION_NAME || 'rfp_docs_prod';
        
        const config = {
            mongodbUri: process.env.MONGODB_CONNECTION_URI!,
            dbName: process.env.MONGODB_DATABASE_NAME!,
            collectionName: collectionName,
            openaiApiKey: process.env.OPENAI_API_KEY!,
            topK: 5, // Same as non-RFP version
            indexName: "vector_index",
        };

        const agent = new MongoDBRetriever();
        await agent.init(config);
        allResults = await agent.similaritySearch(question);
        
    } else {
        // For other modes, use single collection approach
        let collectionName = process.env.MONGODB_COLLECTION_NAME!;
        if (mode === 'epcc') {
            collectionName = process.env.MONGODB_EPCC_COLLECTION_NAME || 'epcc_docs_prod';
        } else if (mode === 'epsm') {
            collectionName = process.env.MONGODB_EPSM_COLLECTION_NAME || 'epsm_docs_prod';
        }
        
        const config = {
            mongodbUri: process.env.MONGODB_CONNECTION_URI!,
            dbName: process.env.MONGODB_DATABASE_NAME!,
            collectionName: collectionName,
            openaiApiKey: process.env.OPENAI_API_KEY!,
            topK: 5,
            indexName: "vector_index",
        };

        const agent = new MongoDBRetriever();
        await agent.init(config);
        allResults = await agent.similaritySearch(question);
    }
    
    const docs = allResults.map(doc => `${doc.metadata.source}${doc.collectionName ? ` (${doc.collectionName})` : ''}`).join('\n');
    console.log(`Content sources: -----------------------\n ${docs}`);
    return allResults;
}

export async function findTechnicalContent(question: string) {
    console.log(`calling findTechnicalContent with question: ${question}`);
    const config = {
        mongodbUri: process.env.MONGODB_CONNECTION_URI!,
        dbName: process.env.MONGODB_DATABASE_NAME!,
        collectionName: process.env.MONGODB_API_COLLECTION_NAME!,
        openaiApiKey: process.env.OPENAI_API_KEY!,
    };
    
    const apiAgent = new MongoDBRetriever();
    try {
        await apiAgent.init(config);
        const results = await apiAgent.similaritySearch(question);
        const docs = results.map(doc => doc.metadata.source).join('\n');
        console.log(`APIsources: -----------------------\n ${docs}`);
        return results;
    } catch (error) {
        console.error('Error during MongoDB retrieval:', error);
        throw error; // or handle the error as needed
    }
}
