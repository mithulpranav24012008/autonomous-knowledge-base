import dotenv from 'dotenv';
import path from 'path';

// Load .env from root or local workspace
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

export const config = {
  port: process.env.PORT || '5001',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/my_database',
};

if (!config.geminiApiKey || config.geminiApiKey === 'your_gemini_api_key_here') {
  console.warn('⚠️ GEMINI_API_KEY is not configured or using placeholder value in .env');
}
