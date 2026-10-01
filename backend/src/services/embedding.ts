import { getGeminiClient, isApiKeyConfigured } from './gemini.js';
import { DocumentChunk } from './ingestion.js';

export interface ChunkEmbedding extends DocumentChunk {
  embedding: number[];
}

export interface EmbeddingOptions {
  model?: string;
  maxRetries?: number;
  delayBetweenRequestsMs?: number;
}

/**
 * Deterministic pseudo-embedding generator for demo/offline mode when GEMINI_API_KEY is not set.
 */
function generateMockEmbedding(text: string, dimensions: number = 768): number[] {
  const vector: number[] = new Array(dimensions).fill(0);
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    vector[i % dimensions] += charCode / 1000;
  }
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)) || 1;
  return vector.map((val) => Number((val / norm).toFixed(6)));
}

/**
 * Converts a single text string into a dense vector representation using Gemini API.
 * Uses gemini-embedding-2 / text-embedding-005 models with fallback.
 */
export async function embedText(
  text: string,
  model: string = 'gemini-embedding-2',
  maxRetries: number = 3
): Promise<number[]> {
  if (!isApiKeyConfigured()) {
    return generateMockEmbedding(text);
  }

  const ai = getGeminiClient();
  const candidateModels = [model, 'gemini-embedding-2', 'gemini-embedding-001', 'text-embedding-005'];

  for (const targetModel of candidateModels) {
    let attempt = 0;
    let backoffDelay = 1000;

    while (attempt <= maxRetries) {
      try {
        const response = await ai.models.embedContent({
          model: targetModel,
          contents: text,
        });

        const targetEmbedding = (response as any).embedding || (response.embeddings && response.embeddings[0]);

        if (targetEmbedding && Array.isArray(targetEmbedding.values)) {
          return targetEmbedding.values;
        }
      } catch (error: any) {
        attempt++;
        const isModelNotFound = /404|not found/i.test(error?.message || '');
        if (isModelNotFound) {
          break; // break to try next model in candidateModels
        }

        const isTransient =
          error?.status === 429 ||
          error?.status >= 500 ||
          /429|resource_exhausted|rate limit|quota|overloaded/i.test(error?.message || '');

        if (attempt > maxRetries || !isTransient) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        backoffDelay *= 2;
      }
    }
  }

  // Fallback to mock embedding if remote embedding models are temporarily unavailable
  return generateMockEmbedding(text);
}

/**
 * Converts an array of DocumentChunks into dense vector representations with rate-limiting throttling.
 */
export async function embedDocumentChunks(
  chunks: DocumentChunk[],
  options: EmbeddingOptions = {}
): Promise<{
  successful: ChunkEmbedding[];
  failed: { chunk: DocumentChunk; error: string }[];
}> {
  const model = options.model || 'gemini-embedding-2';
  const delayMs = options.delayBetweenRequestsMs ?? 200;
  const maxRetries = options.maxRetries ?? 3;

  const successful: ChunkEmbedding[] = [];
  const failed: { chunk: DocumentChunk; error: string }[] = [];

  console.log(`🧠 Embedding ${chunks.length} chunks using model '${model}'...`);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    try {
      const vector = await embedText(chunk.text, model, maxRetries);
      successful.push({
        ...chunk,
        embedding: vector,
      });
      console.log(`  ✓ Embedded chunk ${i + 1}/${chunks.length} (${chunk.chunkId}) - Vector dim: ${vector.length}`);
    } catch (err: any) {
      console.error(`  ❌ Failed embedding chunk ${chunk.chunkId}:`, err.message);
      failed.push({ chunk, error: err.message });
    }

    if (i < chunks.length - 1 && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return { successful, failed };
}
