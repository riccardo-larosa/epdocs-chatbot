#!/usr/bin/env tsx

/**
 * Website Content Scraper
 * 
 * This script scrapes content from whitelisted URLs and stores it in a dedicated
 * website collection for use by the RFP bot. Scraped content is kept separate
 * from curated RFP content but accessible for supplementary information.
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { MongoClient } from 'mongodb';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { scrapeWebPage, isWebScrapingEnabled, getWhitelistInfo } from '../src/lib/webScraper';
// Load environment variables
console.log('DEBUG: ALLOWED_SCRAPE_DOMAINS:', process.env.ALLOWED_SCRAPE_DOMAINS);
console.log('DEBUG: ALLOWED_SCRAPE_URLS:', process.env.ALLOWED_SCRAPE_URLS);
console.log('DEBUG: getWhitelistInfo:', getWhitelistInfo());
interface WebsiteDocument {
    pageContent: string;
    metadata: {
        source: string;
        url: string;
        domain: string;
        title: string;
        timestamp: string;
        wordCount: number;
        contentType: 'website_scraped';
        sourceAttribution: string;
        chunkIndex?: number;
        totalChunks?: number;
    };
}

class WebsiteContentScraper {
    private client: MongoClient;
    private embeddings: OpenAIEmbeddings;
    private textSplitter: RecursiveCharacterTextSplitter;
    private collectionName: string;

    constructor() {
        if (!process.env.MONGODB_CONNECTION_URI) {
            throw new Error('MONGODB_CONNECTION_URI environment variable is required');
        }
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY environment variable is required');
        }

        this.client = new MongoClient(process.env.MONGODB_CONNECTION_URI);
        this.embeddings = new OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_API_KEY,
            modelName: "text-embedding-3-small",
        });
        
        // Configure text splitter for website content
        this.textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });

        // Use dedicated website collection
        this.collectionName = process.env.MONGODB_WEBSITE_COLLECTION_NAME || 'website_content_prod';
    }

    async connect() {
        await this.client.connect();
        console.log('✅ Connected to MongoDB');
    }

    async disconnect() {
        await this.client.close();
        console.log('📝 Disconnected from MongoDB');
    }

    async scrapeAndStoreUrl(url: string): Promise<void> {
        try {
            console.log(`\n🌐 Scraping URL: ${url}`);
            
            // Scrape the content
            const scrapedContent = await scrapeWebPage(url);
            
            // Split content into chunks
            const chunks = await this.textSplitter.splitText(scrapedContent.content);
            console.log(`📄 Split into ${chunks.length} chunks`);

            // Generate embeddings for each chunk
            console.log('🔢 Generating embeddings...');
            const embeddings = await this.embeddings.embedDocuments(chunks);

            // Prepare documents for insertion
            const documents: WebsiteDocument[] = chunks.map((chunk, index) => ({
                pageContent: chunk,
                metadata: {
                    source: `scraped-${scrapedContent.domain}${new URL(url).pathname}`,
                    url: scrapedContent.url,
                    domain: scrapedContent.domain,
                    title: scrapedContent.title,
                    timestamp: scrapedContent.timestamp,
                    wordCount: chunk.split(/\s+/).filter(word => word.length > 0).length,
                    contentType: 'website_scraped',
                    sourceAttribution: scrapedContent.sourceAttribution,
                    chunkIndex: index,
                    totalChunks: chunks.length
                }
            }));

            // Store in MongoDB with embeddings
            const db = this.client.db(process.env.MONGODB_DATABASE_NAME);
            const collection = db.collection(this.collectionName);

            const documentsWithEmbeddings = documents.map((doc, index) => ({
                ...doc,
                contentVector: embeddings[index]
            }));

            await collection.insertMany(documentsWithEmbeddings);
            
            console.log(`✅ Stored ${documents.length} chunks from ${scrapedContent.domain}`);
            console.log(`📊 Total word count: ${scrapedContent.wordCount} words`);

        } catch (error) {
            console.error(`❌ Error scraping ${url}:`, error);
            throw error;
        }
    }

    async clearWebsiteCollection(): Promise<void> {
        const db = this.client.db(process.env.MONGODB_DATABASE_NAME);
        const collection = db.collection(this.collectionName);
        
        const result = await collection.deleteMany({
            'metadata.contentType': 'website_scraped'
        });
        
        console.log(`🗑️  Cleared ${result.deletedCount} website documents from collection`);
    }

    async clearUrlFromCollection(url: string): Promise<void> {
        const db = this.client.db(process.env.MONGODB_DATABASE_NAME);
        const collection = db.collection(this.collectionName);
        
        const result = await collection.deleteMany({
            'metadata.url': url
        });
        
        console.log(`🗑️  Removed ${result.deletedCount} documents for URL: ${url}`);
    }

    async getCollectionStats(): Promise<void> {
        const db = this.client.db(process.env.MONGODB_DATABASE_NAME);
        const collection = db.collection(this.collectionName);
        
        const totalDocs = await collection.countDocuments({});
        const websiteDocs = await collection.countDocuments({
            'metadata.contentType': 'website_scraped'
        });
        
        // Get unique domains
        const domains = await collection.distinct('metadata.domain', {
            'metadata.contentType': 'website_scraped'
        });

        // Get unique URLs
        const urls = await collection.distinct('metadata.url', {
            'metadata.contentType': 'website_scraped'
        });

        console.log('\n📊 Collection Statistics:');
        console.log(`Total documents in ${this.collectionName}: ${totalDocs}`);
        console.log(`Website documents: ${websiteDocs}`);
        console.log(`Unique domains scraped: ${domains.length}`);
        console.log(`Unique URLs scraped: ${urls.length}`);
        
        if (domains.length > 0) {
            console.log('\n🌐 Scraped domains:');
            domains.forEach((domain, index) => {
                console.log(`   ${index + 1}. ${domain}`);
            });
        }

        if (urls.length > 0 && urls.length <= 10) {
            console.log('\n📄 Scraped URLs:');
            urls.forEach((url, index) => {
                console.log(`   ${index + 1}. ${url}`);
            });
        } else if (urls.length > 10) {
            console.log(`\n📄 ${urls.length} URLs scraped (too many to list)`);
        }
    }
}

async function scrapeUrlList(urls: string[]): Promise<void> {
    const scraper = new WebsiteContentScraper();
    
    try {
        await scraper.connect();
        
        console.log(`🚀 Starting batch scraping of ${urls.length} URLs...`);
        
        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            try {
                console.log(`\n[${i + 1}/${urls.length}] Processing: ${url}`);
                await scraper.scrapeAndStoreUrl(url);
                
                // Add delay between requests to be respectful
                if (i < urls.length - 1) {
                    console.log('⏱️  Waiting 2 seconds before next request...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            } catch (error) {
                console.error(`❌ Failed to scrape ${url}:`, error);
                console.log('⏭️  Continuing with next URL...');
            }
        }
        
        console.log('\n✅ Batch scraping completed!');
        await scraper.getCollectionStats();
        
    } finally {
        await scraper.disconnect();
    }
}

async function scrapeFromWhitelist(): Promise<void> {
    if (!isWebScrapingEnabled()) {
        console.log('❌ Web scraping is not enabled.');
        console.log('Configure ALLOWED_SCRAPE_URLS or ALLOWED_SCRAPE_DOMAINS in .env.local');
        return;
    }

    const whitelistInfo = getWhitelistInfo();
    const urls = whitelistInfo.allowedUrls;
    
    if (urls.length === 0) {
        console.log('❌ No specific URLs configured in ALLOWED_SCRAPE_URLS.');
        console.log('This command scrapes specific URLs. For domain scraping, use scrape-domain command.');
        return;
    }

    await scrapeUrlList(urls);
}

function printUsage(): void {
    console.log('🌐 Website Content Scraper');
    console.log('==========================');
    console.log('');
    console.log('Usage:');
    console.log('  npm run scrape-websites              # Scrape all whitelisted URLs');
    console.log('  npm run scrape-websites -- --url <url>   # Scrape specific URL');
    console.log('  npm run scrape-websites -- --clear       # Clear all website content');
    console.log('  npm run scrape-websites -- --stats       # Show collection stats');
    console.log('  npm run scrape-websites -- --clear-url <url>  # Remove specific URL');
    console.log('');
    console.log('Examples:');
    console.log('  npm run scrape-websites -- --url https://elasticpath.dev/docs/getting-started');
    console.log('  npm run scrape-websites -- --clear-url https://elasticpath.com/pricing');
    console.log('');
    console.log('Environment Requirements:');
    console.log('  MONGODB_CONNECTION_URI  - MongoDB Atlas connection string');
    console.log('  MONGODB_DATABASE_NAME   - Database name');
    console.log('  OPENAI_API_KEY         - OpenAI API key for embeddings');
    console.log('  ALLOWED_SCRAPE_URLS    - Comma-separated list of allowed URLs');
    console.log('  MONGODB_WEBSITE_COLLECTION_NAME - Collection name (default: website_content_prod)');
}

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        printUsage();
        return;
    }

    const scraper = new WebsiteContentScraper();

    try {
        if (args.includes('--stats')) {
            await scraper.connect();
            await scraper.getCollectionStats();
            return;
        }

        if (args.includes('--clear')) {
            await scraper.connect();
            await scraper.clearWebsiteCollection();
            await scraper.getCollectionStats();
            return;
        }

        const urlIndex = args.indexOf('--url');
        if (urlIndex !== -1 && args[urlIndex + 1]) {
            const url = args[urlIndex + 1];
            await scraper.connect();
            await scraper.scrapeAndStoreUrl(url);
            await scraper.getCollectionStats();
            return;
        }

        const clearUrlIndex = args.indexOf('--clear-url');
        if (clearUrlIndex !== -1 && args[clearUrlIndex + 1]) {
            const url = args[clearUrlIndex + 1];
            await scraper.connect();
            await scraper.clearUrlFromCollection(url);
            await scraper.getCollectionStats();
            return;
        }

        // Default: scrape from whitelist
        await scrapeFromWhitelist();

    } catch (error) {
        console.error('❌ Script failed:', error);
        process.exit(1);
    } finally {
        await scraper.disconnect();
    }
}

if (require.main === module) {
    main().catch(console.error);
} 