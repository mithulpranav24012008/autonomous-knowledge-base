import { Router, Request, Response } from 'express';
import path from 'path';
import { generateText, generateGroundedAnswer } from '../services/gemini.js';
import { getDB } from '../config/db.js';
import { ingestDirectory } from '../services/ingestion.js';
import { embedText } from '../services/embedding.js';
import { searchVectorIndex } from '../services/vectorStore.js';

export const apiRouter = Router();

// Health Check Endpoint
apiRouter.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'backend-express',
  });
});

// Gemini Generate Endpoint
apiRouter.post('/generate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required' });
      return;
    }

    const text = await generateText(prompt);
    res.json({ result: text });
  } catch (error: any) {
    console.error('Error generating content:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// MongoDB Stats Endpoint
apiRouter.get('/db-status', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDB();
    const collections = await db.listCollections().toArray();
    res.json({
      connected: true,
      databaseName: db.databaseName,
      collectionsCount: collections.length,
      collections: collections.map((c) => c.name),
    });
  } catch (error: any) {
    res.status(500).json({
      connected: false,
      error: error.message || 'Failed to query MongoDB',
    });
  }
});

// Document Ingestion & Chunking Endpoint
apiRouter.get('/ingest', async (req: Request, res: Response): Promise<void> => {
  try {
    const targetDir = (req.query.dir as string) || path.resolve(__dirname, '../../../data');
    const chunkSize = Number(req.query.chunkSize) || 512;
    const overlap = Number(req.query.overlap) || 100;

    const chunks = await ingestDirectory(targetDir, chunkSize, overlap);
    res.json({
      success: true,
      directory: targetDir,
      totalChunks: chunks.length,
      chunkSize,
      overlap,
      chunks,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to ingest documents',
    });
  }
});

// Grounded Vector Similarity Search Endpoint (RAG)
async function handleSearch(req: Request, res: Response): Promise<void> {
  try {
    const query = (req.body?.query || req.query?.q) as string;
    const limit = Number(req.body?.limit || req.query?.limit) || 5;

    if (!query || typeof query !== 'string' || !query.trim()) {
      res.status(400).json({ error: 'Query parameter "query" or "q" is required' });
      return;
    }

    // 1. Embed user query using text-embedding-005 via @google/genai SDK
    const queryVector = await embedText(query.trim(), 'text-embedding-005');

    // 2. Perform ANN vector similarity search on MongoDB database to retrieve top chunks
    const retrievedChunks = await searchVectorIndex(queryVector, {
      indexName: 'vector_index',
      collectionName: 'vector_chunks',
      limit,
    });

    // 3. Construct grounded prompt & call Gemini model (Gemini 2.5/1.5 Flash) to generate grounded answer
    const answer = await generateGroundedAnswer(query.trim(), retrievedChunks);

    // 4. Return grounded answer and source chunks to the client
    res.json({
      success: true,
      query: query.trim(),
      answer,
      embeddingModel: 'text-embedding-005',
      generationModel: 'gemini-2.5-flash',
      sourcesCount: retrievedChunks.length,
      sources: retrievedChunks,
    });
  } catch (error: any) {
    console.error('Error executing grounded vector search:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to perform grounded vector search',
    });
  }
}

// Register POST and GET routes for /api/search
apiRouter.post('/search', handleSearch);
apiRouter.get('/search', handleSearch);
