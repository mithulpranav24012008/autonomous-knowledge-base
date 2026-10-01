import { MongoClient, Db } from 'mongodb';
import { config } from './env.js';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDB(): Promise<Db> {
  if (db) return db;

  try {
    client = new MongoClient(config.mongodbUri);
    await client.connect();
    console.log('✅ Connected to MongoDB successfully');
    db = client.db();
    return db;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    throw error;
  }
}

export function getDB(): Db {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB() first.');
  }
  return db;
}

export async function closeDB(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('🔌 MongoDB connection closed');
  }
}
