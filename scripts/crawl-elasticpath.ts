#!/usr/bin/env tsx

/**
 * Elastic Path Website Crawler
 * 
 * This script discovers common pages on elasticpath.com and adds them to the scraping queue.
 * It starts from the homepage and follows common navigation patterns.
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Common URL patterns for elasticpath.com
const COMMON_ELASTICPATH_URLS = [
  // Main pages
  'https://elasticpath.com/',
  'https://elasticpath.com/pricing',
  'https://elasticpath.com/platform',
  'https://elasticpath.com/solutions',
  'https://elasticpath.com/resources',
  'https://elasticpath.com/about',
  'https://elasticpath.com/contact',
  'https://elasticpath.com/careers',
  
  // Platform pages
  'https://elasticpath.com/platform/commerce-engine',
  'https://elasticpath.com/platform/pim',
  'https://elasticpath.com/platform/payment-gateway',
  'https://elasticpath.com/platform/subscriptions',
  
  // Solutions pages
  'https://elasticpath.com/solutions/b2b-ecommerce',
  'https://elasticpath.com/solutions/marketplace',
  'https://elasticpath.com/solutions/omnichannel',
  'https://elasticpath.com/solutions/headless-commerce',
  
  // Resources
  'https://elasticpath.com/resources/blog',
  'https://elasticpath.com/resources/case-studies',
  'https://elasticpath.com/resources/whitepapers',
  'https://elasticpath.com/resources/webinars',
  
  // Documentation (if public)
  'https://elasticpath.dev/',
  'https://elasticpath.dev/docs',
  'https://elasticpath.dev/docs/getting-started',
  'https://elasticpath.dev/docs/api',
];

function updateEnvFile(urls: string[]) {
  const urlString = urls.join(',');
  console.log('\n📝 To add these URLs to your .env.local file, update the line:');
  console.log('\nALLOWED_SCRAPE_URLS=' + urlString);
  console.log('\n💡 Or run this command:');
  console.log(`echo 'ALLOWED_SCRAPE_URLS=${urlString}' >> .env.local`);
}

async function checkUrlExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { 
      method: 'HEAD',
      headers: {
        'User-Agent': 'ElasticPath-Chatbot/1.0 (URL Discovery)',
      },
      signal: AbortSignal.timeout(10000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function discoverValidUrls(): Promise<string[]> {
  console.log('🔍 Discovering valid URLs on elasticpath.com...\n');
  
  const validUrls: string[] = [];
  const total = COMMON_ELASTICPATH_URLS.length;
  
  for (let i = 0; i < total; i++) {
    const url = COMMON_ELASTICPATH_URLS[i];
    process.stdout.write(`[${i + 1}/${total}] Checking ${url}... `);
    
    const isValid = await checkUrlExists(url);
    if (isValid) {
      validUrls.push(url);
      console.log('✅');
    } else {
      console.log('❌');
    }
    
    // Small delay to be respectful
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`\n✅ Found ${validUrls.length} valid URLs out of ${total} checked.`);
  return validUrls;
}

async function main() {
  console.log('🌐 Elastic Path Website URL Discovery');
  console.log('====================================\n');
  
  const validUrls = await discoverValidUrls();
  
  console.log('\n📋 Valid URLs found:');
  validUrls.forEach((url, index) => {
    console.log(`   ${index + 1}. ${url}`);
  });
  
  updateEnvFile(validUrls);
  
  console.log('\n🎯 Next steps:');
  console.log('1. Update your .env.local file with the URLs above');
  console.log('2. Run: npm run scrape-websites');
  console.log('3. This will scrape all valid pages and store them in your database');
  
  console.log('\n💡 Tips:');
  console.log('- You can add more URLs manually to the list');
  console.log('- Domain-based scraping (elasticpath.com) allows dynamic page access');
  console.log('- The chatbot will automatically scrape pages when users ask about them');
}

if (require.main === module) {
  main().catch(console.error);
} 