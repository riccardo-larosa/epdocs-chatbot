import { testMongoDBConnection } from '../src/utils/mongoDbTest';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local file explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
// Also load .env as fallback
dotenv.config();

async function main() {
  try {
    console.log('🔗 Testing MongoDB connection...\n');
    const result = await testMongoDBConnection();
    
    if (result.success) {
      console.log('\n🎉 Database connection successful!');
      console.log('📊 Database ready for updates');
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

main(); 