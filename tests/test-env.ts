import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

// Verify required environment variables are set
const requiredEnvVars = [
  'OPENAI_API_KEY',
  'MONGODB_URI',
  'NEXT_PUBLIC_SITE'
];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}); 