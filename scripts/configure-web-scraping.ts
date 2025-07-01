#!/usr/bin/env tsx

/**
 * Web Scraping Configuration Script
 * 
 * This script helps you configure the web scraping whitelist for the chatbot.
 * It validates URLs and domains and provides guidance on secure configuration.
 */

import { getWhitelistInfo, isWebScrapingEnabled } from '../src/lib/webScraper';

function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function validateDomain(domain: string): boolean {
  // Basic domain validation
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return domainRegex.test(domain);
}

function printCurrentConfiguration() {
  console.log('\n🔍 Current Web Scraping Configuration:');
  console.log('=====================================');
  
  const whitelistInfo = getWhitelistInfo();
  
  if (!isWebScrapingEnabled()) {
    console.log('❌ Web scraping is DISABLED');
    console.log('   No URLs or domains are configured in the whitelist.');
    return;
  }
  
  console.log('✅ Web scraping is ENABLED');
  console.log(`\n📋 Allowed URLs (${whitelistInfo.totalAllowedUrls}):`);
  if (whitelistInfo.allowedUrls.length === 0) {
    console.log('   None configured');
  } else {
    whitelistInfo.allowedUrls.forEach((url, index) => {
      console.log(`   ${index + 1}. ${url}`);
    });
  }
  
  console.log(`\n🌐 Allowed Domains (${whitelistInfo.totalAllowedDomains}):`);
  if (whitelistInfo.allowedDomains.length === 0) {
    console.log('   None configured');
  } else {
    whitelistInfo.allowedDomains.forEach((domain, index) => {
      console.log(`   ${index + 1}. ${domain}`);
    });
  }
}

function printConfigurationGuide() {
  console.log('\n📖 Configuration Guide:');
  console.log('======================');
  console.log('\nTo enable web scraping, add these environment variables to your .env.local file:');
  console.log('\n# Web Scraping Configuration');
  console.log('# Comma-separated list of specific URLs that can be scraped');
  console.log('ALLOWED_SCRAPE_URLS=https://example.com/page1,https://docs.example.com/api');
  console.log('\n# Comma-separated list of domains that can be scraped (all pages on these domains)');
  console.log('ALLOWED_SCRAPE_DOMAINS=docs.example.com,api.example.com');
  console.log('\n# Examples:');
  console.log('# ALLOWED_SCRAPE_URLS=https://elasticpath.dev/docs/getting-started,https://elasticpath.com/pricing');
  console.log('# ALLOWED_SCRAPE_DOMAINS=elasticpath.dev,elasticpath.com');
  
  console.log('\n🔒 Security Notes:');
  console.log('- Only URLs and domains in the whitelist can be scraped');
  console.log('- The chatbot will refuse to scrape any non-whitelisted URLs');
  console.log('- Use specific URLs for precise control');
  console.log('- Use domains to allow all pages on a specific website');
  console.log('- Always test with a small whitelist first');
  
  console.log('\n⚠️  Important:');
  console.log('- Web scraping is disabled by default for security');
  console.log('- Only enable for trusted, public websites');
  console.log('- Respect robots.txt and rate limiting');
  console.log('- Monitor usage to prevent abuse');
}

function validateConfiguration() {
  console.log('\n🔍 Validating Current Configuration:');
  console.log('===================================');
  
  const whitelistInfo = getWhitelistInfo();
  let hasErrors = false;
  
  // Validate URLs
  console.log('\nValidating URLs:');
  whitelistInfo.allowedUrls.forEach((url, index) => {
    if (validateUrl(url)) {
      console.log(`   ✅ ${index + 1}. ${url}`);
    } else {
      console.log(`   ❌ ${index + 1}. ${url} (invalid URL format)`);
      hasErrors = true;
    }
  });
  
  // Validate domains
  console.log('\nValidating domains:');
  whitelistInfo.allowedDomains.forEach((domain, index) => {
    if (validateDomain(domain)) {
      console.log(`   ✅ ${index + 1}. ${domain}`);
    } else {
      console.log(`   ❌ ${index + 1}. ${domain} (invalid domain format)`);
      hasErrors = true;
    }
  });
  
  if (hasErrors) {
    console.log('\n❌ Configuration has errors. Please fix the invalid URLs/domains.');
  } else if (isWebScrapingEnabled()) {
    console.log('\n✅ Configuration is valid and web scraping is enabled.');
  } else {
    console.log('\nℹ️  Web scraping is disabled (no URLs or domains configured).');
  }
}

function printUsageExamples() {
  console.log('\n💡 Usage Examples:');
  console.log('==================');
  console.log('\nOnce configured, users can ask questions like:');
  console.log('- "What does the pricing page say about enterprise plans?"');
  console.log('- "Can you check the latest documentation on the API reference page?"');
  console.log('- "What information is available on the company blog?"');
  console.log('\nThe chatbot will automatically use the scrapeWebPage tool for whitelisted URLs.');
}

function main() {
  console.log('🌐 Elastic Path Chatbot - Web Scraping Configuration');
  console.log('===================================================');
  
  printCurrentConfiguration();
  printConfigurationGuide();
  validateConfiguration();
  printUsageExamples();
  
  console.log('\n🎯 Next Steps:');
  console.log('1. Add ALLOWED_SCRAPE_URLS and/or ALLOWED_SCRAPE_DOMAINS to your .env.local file');
  console.log('2. Restart your development server');
  console.log('3. Test with a simple question about a whitelisted URL');
  console.log('4. Monitor the logs to ensure scraping works as expected');
}

if (require.main === module) {
  main();
} 