#!/usr/bin/env tsx

/**
 * GitHub Repository Crawler
 * 
 * This script crawls a GitHub repository to find all important files
 * (README, documentation, etc.) and scrapes their content.
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

interface GitHubFile {
  name: string;
  path: string;
  download_url: string;
  type: string;
  size: number;
}

interface GitHubTreeItem {
  path: string;
  mode: string;
  type: string;
  sha: string;
  size?: number;
  url: string;
}

class GitHubRepoCrawler {
  private owner: string;
  private repo: string;
  private baseUrl: string;

  constructor(repoUrl: string) {
    // Parse GitHub URL: https://github.com/elasticpath/composable-frontend/
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      throw new Error('Invalid GitHub repository URL');
    }
    
    this.owner = match[1];
    this.repo = match[2].replace(/\/$/, ''); // Remove trailing slash
    this.baseUrl = `https://api.github.com/repos/${this.owner}/${this.repo}`;
    
    console.log(`🔍 Crawling GitHub repository: ${this.owner}/${this.repo}`);
  }

  async getRepositoryTree(): Promise<GitHubTreeItem[]> {
    console.log('📂 Fetching repository file tree...');
    
    try {
      const response = await fetch(`${this.baseUrl}/git/trees/main?recursive=1`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'ElasticPath-Chatbot/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.tree || [];
    } catch (error) {
      console.error('❌ Failed to fetch repository tree:', error);
      throw error;
    }
  }

  filterImportantFiles(tree: GitHubTreeItem[]): GitHubTreeItem[] {
    const importantPatterns = [
      /^README\.md$/i,
      /^CHANGELOG\.md$/i,
      /^CONTRIBUTING\.md$/i,
      /^LICENSE$/i,
      /^docs?\//i,
      /\.md$/i,
      /^examples?\//i,
      /^guides?\//i,
    ];

    const excludePatterns = [
      /node_modules\//i,
      /\.git\//i,
      /\.next\//i,
      /\.vercel\//i,
      /build\//i,
      /dist\//i,
      /coverage\//i,
      /\.min\./i,
      /\.lock$/i,
      /package-lock\.json$/i,
      /yarn\.lock$/i,
    ];

    return tree.filter(item => {
      // Only include files (not directories)
      if (item.type !== 'blob') return false;
      
      // Skip very large files (> 1MB)
      if (item.size && item.size > 1024 * 1024) return false;
      
      // Check if file matches important patterns
      const isImportant = importantPatterns.some(pattern => pattern.test(item.path));
      
      // Check if file should be excluded
      const shouldExclude = excludePatterns.some(pattern => pattern.test(item.path));
      
      return isImportant && !shouldExclude;
    });
  }

  async getFileContent(path: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/contents/${path}`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'ElasticPath-Chatbot/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ${path}: ${response.status}`);
      }

      const data = await response.json();
      
      // GitHub API returns base64 encoded content
      if (data.encoding === 'base64') {
        return Buffer.from(data.content, 'base64').toString('utf-8');
      }
      
      return data.content || '';
    } catch (error) {
      console.error(`❌ Failed to fetch content for ${path}:`, error);
      return '';
    }
  }

  generateUrls(files: GitHubTreeItem[]): string[] {
    return files.map(file => 
      `https://github.com/${this.owner}/${this.repo}/blob/main/${file.path}`
    );
  }

  async discoverFiles(): Promise<string[]> {
    try {
      const tree = await this.getRepositoryTree();
      console.log(`📁 Found ${tree.length} total files in repository`);
      
      const importantFiles = this.filterImportantFiles(tree);
      console.log(`📋 Filtered to ${importantFiles.length} important files`);
      
      console.log('\n📄 Important files found:');
      importantFiles.forEach((file, index) => {
        const size = file.size ? `(${(file.size / 1024).toFixed(1)}KB)` : '';
        console.log(`   ${index + 1}. ${file.path} ${size}`);
      });
      
      const urls = this.generateUrls(importantFiles);
      return urls;
      
    } catch (error) {
      console.error('❌ Failed to discover repository files:', error);
      throw error;
    }
  }
}

async function main() {
  const repoUrl = 'https://github.com/elasticpath/composable-frontend/';
  
  console.log('🐙 GitHub Repository Crawler');
  console.log('============================\n');
  
  try {
    const crawler = new GitHubRepoCrawler(repoUrl);
    const urls = await crawler.discoverFiles();
    
    console.log(`\n✅ Discovered ${urls.length} URLs to scrape`);
    
    console.log('\n📝 Add these URLs to your .env.local:');
    const currentUrls = process.env.ALLOWED_SCRAPE_URLS || '';
    const allUrls = currentUrls ? `${currentUrls},${urls.join(',')}` : urls.join(',');
    
    console.log('\nALLOWED_SCRAPE_URLS=' + allUrls);
    
    console.log('\n🎯 Next steps:');
    console.log('1. Update your .env.local with the URLs above');
    console.log('2. Add "github.com" to ALLOWED_SCRAPE_DOMAINS if not already present');
    console.log('3. Run: npm run scrape-websites');
    
    return urls;
    
  } catch (error) {
    console.error('❌ Crawling failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
} 