import dotenv from 'dotenv';
import path from 'path';

// Load .env.local file explicitly for local development
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
// Also load .env as fallback
dotenv.config();

console.log('🔍 Environment Variables Check\n');

const requiredVars = [
  'MONGODB_CONNECTION_URI',
  'MONGODB_DATABASE_NAME', 
  'MONGODB_COLLECTION_NAME',
  'MONGODB_API_COLLECTION_NAME',
  'OPENAI_API_KEY',
  'VECTOR_SEARCH_INDEX_NAME'
];

const optionalVars = [
  'NEXT_PUBLIC_SITE',
  'CLEAR_EXISTING',
  'DOCS_PATH',
  'GUIDES_PATH',
  'API_DOCS_PATH',
  'EPCC_DOCS_PATH',
  'EPSM_DOCS_PATH',
  'EXCLUDE_PATTERNS'
];

console.log('📋 Required Variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '❌';
  const displayValue = value ? (varName.includes('API_KEY') ? '*****' : value) : 'undefined';
  console.log(`${status} ${varName}: ${displayValue}`);
});

console.log('\n📋 Optional Variables:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '⚪';
  console.log(`${status} ${varName}: ${value || 'undefined'}`);
});

console.log('\n📁 File Locations:');
console.log(`Current directory: ${process.cwd()}`);
console.log(`Looking for .env.local at: ${path.resolve(process.cwd(), '.env.local')}`);

// Check if .env.local exists
import fs from 'fs';
const envLocalPath = path.resolve(process.cwd(), '.env.local');
console.log(`📄 .env.local exists: ${fs.existsSync(envLocalPath) ? '✅' : '❌'}`);

const envPath = path.resolve(process.cwd(), '.env');
console.log(`📄 .env exists: ${fs.existsSync(envPath) ? '✅' : '❌'}`);

// Summary
const missingRequired = requiredVars.filter(varName => !process.env[varName]);
if (missingRequired.length === 0) {
  console.log('\n🎉 All required environment variables are set!');
} else {
  console.log(`\n⚠️  Missing required variables: ${missingRequired.join(', ')}`);
  console.log('\n💡 Make sure to add these to your .env.local file');
} 