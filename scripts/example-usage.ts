import { DatabaseUpdater } from './updateDatabase';
import dotenv from 'dotenv';

dotenv.config();

async function exampleUsage() {
  const updater = new DatabaseUpdater();

  try {
    // Connect to database
    await updater.connect();

    // Example 1: Update documentation with custom settings
    console.log('📝 Example 1: Updating general documentation');
    await updater.updateDocumentation('./docs', 'documents');

    // Example 2: Update API documentation
    console.log('📚 Example 2: Updating API documentation');
    await updater.updateDocumentation('./api-docs', 'api_documents');

    // Example 3: Create vector search index (only needed once)
    console.log('🔍 Example 3: Creating vector search index');
    await updater.createVectorIndex('documents');
    await updater.createVectorIndex('api_documents');

    console.log('✅ All examples completed successfully!');

  } catch (error) {
    console.error('❌ Error in example usage:', error);
  } finally {
    await updater.disconnect();
  }
}

// Advanced example: Processing specific file types
async function advancedExample() {
  const updater = new DatabaseUpdater();

  try {
    await updater.connect();

    // Process only specific documentation sections
    const sections = [
      { path: './docs/getting-started', collection: 'documents' },
      { path: './docs/guides', collection: 'documents' },
      { path: './docs/api-reference', collection: 'api_documents' },
    ];

    for (const section of sections) {
      console.log(`📂 Processing ${section.path} → ${section.collection}`);
      await updater.updateDocumentation(section.path, section.collection);
    }

  } catch (error) {
    console.error('❌ Error in advanced example:', error);
  } finally {
    await updater.disconnect();
  }
}

// Run examples
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--advanced')) {
    await advancedExample();
  } else {
    await exampleUsage();
  }
}

if (require.main === module) {
  main().catch(console.error);
} 