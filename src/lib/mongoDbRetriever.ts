import { AgentConfig } from '@/types/agent';
import { MongoDBAtlasVectorSearch } from '@langchain/mongodb';
import { OpenAIEmbeddings } from '@langchain/openai';
import { MongoClient } from 'mongodb';
import { expandQueryWithSynonyms } from './synonymMappings';

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

/**
 * Search content with priority based on mode
 * RFP Mode: RFP docs → Documentation → API content → Website content
 * EPCC/EPSM Mode: Documentation and API only (no website content)
 */
export async function findRelevantContent(question: string, mode?: string) {
    console.log(`calling findRelevantContent with question: ${question}, mode: ${mode}`);
    
    // Expand query with synonyms to improve search results
    const expandedQuestion = expandQueryWithSynonyms(question);
    if (expandedQuestion !== question) {
        console.log(`🔍 Synonym expansion applied: "${question}" → "${expandedQuestion}"`);
    }
    
    let allResults: any[] = [];
    
    // RFP Mode: Priority search across multiple collections
    if (mode === 'rfp') {
        console.log('🔍 RFP Mode: Implementing priority search strategy');
        
        // 1. First priority: RFP-specific content
        const rfpConfig = {
            mongodbUri: process.env.MONGODB_CONNECTION_URI!,
            dbName: process.env.MONGODB_DATABASE_NAME!,
            collectionName: process.env.MONGODB_RFP_COLLECTION_NAME || 'rfp_docs_prod',
            openaiApiKey: process.env.OPENAI_API_KEY!,
            topK: 3, // Reduced to allow space for other sources
            indexName: "vector_index",
        };

        const rfpAgent = new MongoDBRetriever();
        await rfpAgent.init(rfpConfig);
        const rfpResults = await rfpAgent.similaritySearch(expandedQuestion, 3);
        
        // Add collection identifier to results
        rfpResults.forEach(doc => {
            doc.metadata = { ...doc.metadata, sourceCollection: 'RFP' };
        });
        
        allResults.push(...rfpResults);
        console.log(`📄 Found ${rfpResults.length} RFP documents`);
        
        // 2. Second priority: Documentation content (if we need more results)
        if (allResults.length < 5) {
            const docsConfig = {
                mongodbUri: process.env.MONGODB_CONNECTION_URI!,
                dbName: process.env.MONGODB_DATABASE_NAME!,
                collectionName: process.env.MONGODB_COLLECTION_NAME || 'chat_docs_prod',
                openaiApiKey: process.env.OPENAI_API_KEY!,
                topK: 2,
                indexName: "vector_index",
            };

            const docsAgent = new MongoDBRetriever();
            await docsAgent.init(docsConfig);
            const docsResults = await docsAgent.similaritySearch(expandedQuestion, 2);
            
            // Filter out website content from documentation collection
            const filteredDocsResults = docsResults.filter(doc => {
                const source = doc.metadata?.source || '';
                return !isWebsiteContent(source);
            });
            
            filteredDocsResults.forEach(doc => {
                doc.metadata = { ...doc.metadata, sourceCollection: 'Documentation' };
            });
            
            allResults.push(...filteredDocsResults);
            console.log(`📚 Found ${filteredDocsResults.length} documentation documents`);
        }
        
        // 3. Third priority: Website content from dedicated collection (if still need more)
        if (allResults.length < 5) {
            try {
                const websiteResults = await findWebsiteContent(expandedQuestion, 2);
                if (websiteResults.length > 0) {
                    allResults.push(...websiteResults);
                    console.log(`🌐 Found ${websiteResults.length} website documents`);
                }
            } catch (error) {
                console.log(`ℹ️  Website collection not available or empty:`, error instanceof Error ? error.message : 'Unknown error');
            }
        }
        
    } else {
        // EPCC/EPSM Mode: Only documentation and API content, NO website content
        console.log(`🔍 ${mode?.toUpperCase() || 'Standard'} Mode: Documentation and API only (no website content)`);
        
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
        const results = await agent.similaritySearch(expandedQuestion);
        
        // Filter out any website content from results
        const filteredResults = results.filter(doc => {
            const source = doc.metadata?.source || '';
            return !isWebsiteContent(source);
        });
        
        filteredResults.forEach(doc => {
            doc.metadata = { ...doc.metadata, sourceCollection: mode?.toUpperCase() || 'Documentation' };
        });
        
        allResults = filteredResults;
        console.log(`📚 Found ${filteredResults.length} non-website documents`);
    }
    
    // Log sources with collection information
    const docs = allResults.map(doc => {
        const collection = doc.metadata?.sourceCollection || 'Unknown';
        const source = doc.metadata?.source || 'Unknown source';
        return `[${collection}] ${source}`;
    }).join('\n');
    
    console.log(`Content sources: -----------------------\n${docs}`);
    return allResults;
}

/**
 * Find technical content (API documentation)
 * Enhanced with source attribution and mode-aware filtering
 */
export async function findTechnicalContent(question: string, mode?: string) {
    console.log(`calling findTechnicalContent with question: ${question}, mode: ${mode}`);
    
    // Expand query with synonyms to improve search results
    const expandedQuestion = expandQueryWithSynonyms(question);
    if (expandedQuestion !== question) {
        console.log(`🔍 Technical content synonym expansion: "${question}" → "${expandedQuestion}"`);
    }
    
    const config = {
        mongodbUri: process.env.MONGODB_CONNECTION_URI!,
        dbName: process.env.MONGODB_DATABASE_NAME!,
        collectionName: process.env.MONGODB_API_COLLECTION_NAME!,
        openaiApiKey: process.env.OPENAI_API_KEY!,
    };
    
    const apiAgent = new MongoDBRetriever();
    try {
        await apiAgent.init(config);
        const results = await apiAgent.similaritySearch(expandedQuestion);
        
        // Add collection identifier
        results.forEach(doc => {
            doc.metadata = { ...doc.metadata, sourceCollection: 'API Documentation' };
        });
        
        const docs = results.map(doc => {
            const collection = doc.metadata?.sourceCollection || 'API';
            const source = doc.metadata?.source || 'Unknown source';
            return `[${collection}] ${source}`;
        }).join('\n');
        
        console.log(`API sources: -----------------------\n${docs}`);
        return results;
    } catch (error) {
        console.error('Error during MongoDB retrieval:', error);
        throw error;
    }
}

/**
 * Check if content is from a website (scraped content)
 * Based on source URL patterns or metadata
 */
function isWebsiteContent(source: string): boolean {
    if (!source) return false;
    
    // Common website indicators
    const websitePatterns = [
        /^https?:\/\//i,           // Starts with http/https
        /\.com\//, /\.org\//, /\.net\//,  // Common domains
        /elasticpath\.dev/i,       // Elastic Path website
        /elasticpath\.com/i,       // Elastic Path website
        /scraped-/i,               // Scraped content prefix
        /website-/i,               // Website content prefix
    ];
    
    return websitePatterns.some(pattern => pattern.test(source));
}

/**
 * Enhanced web content search specifically for RFP mode
 * Searches the dedicated website collection for scraped content
 */
export async function findWebsiteContent(question: string, topK: number = 2): Promise<any[]> {
    console.log(`🌐 Searching website collection for: ${question}`);
    
    // Expand query with synonyms to improve search results
    const expandedQuestion = expandQueryWithSynonyms(question);
    if (expandedQuestion !== question) {
        console.log(`🔍 Website content synonym expansion: "${question}" → "${expandedQuestion}"`);
    }
    
    const config = {
        mongodbUri: process.env.MONGODB_CONNECTION_URI!,
        dbName: process.env.MONGODB_DATABASE_NAME!,
        collectionName: process.env.MONGODB_WEBSITE_COLLECTION_NAME || 'website_content_prod',
        openaiApiKey: process.env.OPENAI_API_KEY!,
        topK,
        indexName: "vector_index",
    };
    
    const websiteAgent = new MongoDBRetriever();
    try {
        await websiteAgent.init(config);
        const results = await websiteAgent.similaritySearch(expandedQuestion, topK);
        
        // Add collection identifier and filter for website content
        const websiteResults = results.filter(doc => 
            doc.metadata?.contentType === 'website_scraped'
        ).map(doc => ({
            ...doc,
            metadata: { ...doc.metadata, sourceCollection: 'Website' }
        }));
        
        const docs = websiteResults.map(doc => {
            const metadata = doc.metadata as any || {};
            const collection = metadata.sourceCollection || 'Website';
            const domain = metadata.domain || 'Unknown domain';
            const source = metadata.source || 'Unknown source';
            return `[${collection}] ${domain} - ${source}`;
        }).join('\n');
        
        console.log(`Website sources: -----------------------\n${docs}`);
        return websiteResults;
    } catch (error) {
        console.error('Error during website content retrieval:', error);
        // Return empty array if website collection doesn't exist or has issues
        return [];
    }
}
