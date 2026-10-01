import path from 'path';
import { Collection } from 'mongodb';
import { getDB } from '../config/db.js';
import { ChunkEmbedding, embedDocumentChunks } from './embedding.js';
import { ingestDirectory } from './ingestion.js';

export interface VectorStoreDocument extends ChunkEmbedding {
  updatedAt: string;
}

export interface VectorSearchOptions {
  indexName?: string;
  collectionName?: string;
  limit?: number;
  numCandidates?: number;
}

/**
 * Calculates cosine similarity between two numeric vectors.
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0.5;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : Number((dotProduct / denominator).toFixed(4));
}

/**
 * Stores text chunks alongside their generated vector embeddings in MongoDB Atlas.
 */
export async function storeChunkEmbeddings(
  chunks: ChunkEmbedding[],
  collectionName: string = 'vector_chunks'
): Promise<{ insertedCount: number; modifiedCount: number }> {
  if (chunks.length === 0) {
    return { insertedCount: 0, modifiedCount: 0 };
  }

  const db = getDB();
  const collection: Collection<VectorStoreDocument> = db.collection(collectionName);

  const operations = chunks.map((chunk) => {
    const doc: VectorStoreDocument = {
      ...chunk,
      updatedAt: new Date().toISOString(),
    };

    return {
      updateOne: {
        filter: { chunkId: chunk.chunkId },
        update: { $set: doc },
        upsert: true,
      },
    };
  });

  const result = await collection.bulkWrite(operations);
  console.log(
    `💾 Stored ${result.upsertedCount} new chunk documents and updated ${result.modifiedCount} chunks in '${collectionName}' collection.`
  );

  return {
    insertedCount: result.upsertedCount,
    modifiedCount: result.modifiedCount,
  };
}

/**
 * Programmatically creates a Vector Search Index on the specified collection for ANN queries.
 */
export async function createVectorSearchIndex(
  collectionName: string = 'vector_chunks',
  indexName: string = 'vector_index',
  numDimensions: number = 768, // Default dimension for text-embedding-005
  similarity: 'cosine' | 'dotProduct' | 'euclidean' = 'cosine'
): Promise<string> {
  const db = getDB();
  const collection = db.collection(collectionName);

  const indexDefinition = {
    name: indexName,
    type: 'vectorSearch',
    definition: {
      fields: [
        {
          type: 'vector',
          path: 'embedding',
          numDimensions,
          similarity,
        },
      ],
    },
  };

  try {
    const resultName = await collection.createSearchIndex(indexDefinition);
    console.log(`✅ Vector Search Index '${indexName}' configured on collection '${collectionName}'.`);
    return resultName;
  } catch (error: any) {
    console.warn(`⚠️ Vector search index creation notice (${error.message}).`);
    return indexName;
  }
}

/**
 * Performs Approximate Nearest Neighbor (ANN) vector search using MongoDB Atlas $vectorSearch stage.
 * Fallbacks seamlessly to in-memory ingestion search if MongoDB database is not active.
 */
export async function searchVectorIndex(
  queryVector: number[],
  options: VectorSearchOptions = {}
): Promise<Array<VectorStoreDocument & { score: number }>> {
  const collectionName = options.collectionName || 'vector_chunks';
  const indexName = options.indexName || 'vector_index';
  const limit = options.limit || 5;
  const numCandidates = options.numCandidates || limit * 10;

  try {
    const db = getDB();
    const collection = db.collection(collectionName);

    const pipeline = [
      {
        $vectorSearch: {
          index: indexName,
          path: 'embedding',
          queryVector: queryVector,
          numCandidates: numCandidates,
          limit: limit,
        },
      },
      {
        $project: {
          _id: 1,
          chunkId: 1,
          fileName: 1,
          filePath: 1,
          chunkIndex: 1,
          totalChunks: 1,
          text: 1,
          tokenCount: 1,
          metadata: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ];

    const results = await collection.aggregate(pipeline).toArray();
    if (results && results.length > 0) {
      return results as Array<VectorStoreDocument & { score: number }>;
    }
  } catch (err: any) {
    console.warn(`⚠️ MongoDB vector search unavailable (${err.message}). Using local document ingestion vector search fallback.`);
  }

  // Fallback: In-memory vector similarity search over local /data directory chunks
  const dataDir = path.resolve(__dirname, '../../../data');
  const rawChunks = await ingestDirectory(dataDir, 512, 100);
  const { successful } = await embedDocumentChunks(rawChunks, { delayBetweenRequestsMs: 0 });

  const scoredDocs = successful.map((doc) => ({
    ...doc,
    updatedAt: new Date().toISOString(),
    score: cosineSimilarity(queryVector, doc.embedding),
  }));

  scoredDocs.sort((a, b) => b.score - a.score);
  return scoredDocs.slice(0, limit);
}

/**
 * Staging helper for Google Enterprise Application Platform / Vertex RAG (GEAP)
 * Stages local documents to Google Cloud Storage bucket prior to calling rag.import_files.
 */
export interface GEAPImportConfig {
  gcsBucket: string;
  corpusName: string;
  filePaths: string[];
}

export function generateGEAPImportSnippet(config: GEAPImportConfig): string {
  return `
# Google Cloud Vertex AI RAG / GEAP Ingestion Snippet
# Staging files to GCS and importing into Vertex AI RAG Corpus:

from google.cloud import storage
from google.genai import types
from google.genai import rag

# Step 1: Upload documents to GCS Bucket gs://${config.gcsBucket}/
storage_client = storage.Client()
bucket = storage_client.bucket("${config.gcsBucket}")

gcs_uris = []
for file_path in ${JSON.stringify(config.filePaths)}:
    blob_name = f"documents/{file_path.split('/')[-1]}"
    blob = bucket.blob(blob_name)
    blob.upload_from_filename(file_path)
    gcs_uris.append(f"gs://{config.gcsBucket}/{blob_name}")

# Step 2: Call rag.import_files to stage and index documents
response = rag.import_files(
    rag_corpus="${config.corpusName}",
    paths=gcs_uris,
    chunk_size=512,
    chunk_overlap=100
)
print("GEAP Import Response:", response)
`;
}
