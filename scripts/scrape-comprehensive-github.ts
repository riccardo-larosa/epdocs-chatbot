#!/usr/bin/env tsx

/**
 * Comprehensive GitHub Repository Scraper
 * 
 * This script scrapes GitHub repositories in prioritized batches to ensure
 * we get the most important files first.
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// High priority files that should be scraped first
const HIGH_PRIORITY_PATTERNS = [
  'package.json',
  'README.md', 
  'CHANGELOG.md',
  'tsconfig.json',
  'next.config',
  'vite.config',
  'tailwind.config',
  'eslint.config',
  '.prettierrc',
  'pnpm-lock.yaml',
  'yarn.lock',
];

// Important directories and their files
const IMPORTANT_DIRECTORIES = [
  '/examples/commerce-essentials/',
  '/examples/payments/',
  '/examples/memberships/',
  '/examples/simple/',
  '/packages/sdks/',
  '/packages/react-shopper-hooks/',
  '/packages/composable-cli/',
];

function prioritizeUrls(urls: string[]): string[] {
  const highPriority: string[] = [];
  const mediumPriority: string[] = [];
  const lowPriority: string[] = [];

  urls.forEach(url => {
    const isHighPriority = HIGH_PRIORITY_PATTERNS.some(pattern => 
      url.includes(pattern)
    );
    
    const isImportantDir = IMPORTANT_DIRECTORIES.some(dir => 
      url.includes(dir)
    );

    if (isHighPriority) {
      highPriority.push(url);
    } else if (isImportantDir) {
      mediumPriority.push(url);
    } else {
      lowPriority.push(url);
    }
  });

  console.log(`📊 Prioritization:
  🔴 High Priority: ${highPriority.length} URLs
  🟡 Medium Priority: ${mediumPriority.length} URLs  
  🟢 Low Priority: ${lowPriority.length} URLs`);

  return [...highPriority, ...mediumPriority, ...lowPriority];
}

async function updateEnvWithUrls(urls: string[], batchSize: number = 50): Promise<void> {
  // Take first batch of URLs
  const batch = urls.slice(0, batchSize);
  const urlString = batch.join(',');
  
  console.log(`📝 Updating .env.local with ${batch.length} URLs...`);
  
  // Read current domains
  const currentDomains = process.env.ALLOWED_SCRAPE_DOMAINS || 'github.com';
  
  // Update .env.local file
  const fs = await import('fs');
  const envContent = await fs.promises.readFile('.env.local', 'utf-8');
  
  // Replace or add the ALLOWED_SCRAPE_URLS line
  const updatedContent = envContent.replace(
    /ALLOWED_SCRAPE_URLS=.*/,
    `ALLOWED_SCRAPE_URLS=${urlString}`
  );
  
  await fs.promises.writeFile('.env.local', updatedContent);
  console.log(`✅ Updated .env.local with ${batch.length} URLs`);
}

async function main() {
  console.log('🔍 Loading comprehensive GitHub repository URLs...');
  
  // Load the comprehensive URL list from our previous output
  const fs = await import('fs');
  const githubUrlsContent = await fs.promises.readFile('github-urls.txt', 'utf-8');
  
  // Extract URLs from the output (they're comma-separated in the last line)
  const urlLines = githubUrlsContent.split('\n');
  const urlLine = urlLines.find(line => line.includes('github.com/elasticpath/composable-frontend'));
  
  if (!urlLine) {
    console.error('❌ Could not find GitHub URLs in the output file');
    process.exit(1);
  }
  
  const allUrls = urlLine.split(',').map(url => url.trim()).filter(url => url.startsWith('https://'));
  console.log(`📁 Found ${allUrls.length} total URLs from GitHub repository`);
  
  // Prioritize URLs
  const prioritizedUrls = prioritizeUrls(allUrls);
  
  // Update environment with first batch (high priority)
  const batchSize = 100; // Start with top 100 URLs
  await updateEnvWithUrls(prioritizedUrls, batchSize);
  
  console.log(`
🎯 Next steps:
1. Run: npm run scrape-websites
2. Test the chatbot with questions about package.json
3. If more coverage needed, increase batch size and re-run

📋 High priority files in this batch:
${prioritizedUrls.slice(0, 20).map((url, i) => `   ${i + 1}. ${url.split('/').pop()}`).join('\n')}
   ... and ${Math.max(0, batchSize - 20)} more files
`);
}

if (require.main === module) {
  main().catch(console.error);
} 