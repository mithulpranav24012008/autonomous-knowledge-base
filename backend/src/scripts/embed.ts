import path from 'path';
import { ingestDirectory } from '../services/ingestion.js';
import { embedDocumentChunks } from '../services/embedding.js';

async function runEmbeddingPipeline() {
  const dataDir = process.env.DATA_DIR || path.resolve(__dirname, '../../../data');

  console.log(`==================================================`);
  console.log(`🚀 Starting Full Document Ingestion & Embedding Pipeline`);
  console.log(`==================================================\n`);

  // Step 1: Ingest and Chunk Documents
  console.log(`1️⃣ Scanning & Chunking Documents from: ${dataDir}`);
  const chunks = await ingestDirectory(dataDir, 512, 100);
  console.log(`   Generated ${chunks.length} chunks from directory.\n`);

  if (chunks.length === 0) {
    console.log(`⚠️ No chunks generated. Ensure files (.txt, .md, .csv) are present in ${dataDir}`);
    return;
  }

  // Check GEMINI_API_KEY
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    console.log(`⚠️ GEMINI_API_KEY is not configured with a valid API key in .env.`);
    console.log(`   Showing scaffolded chunk pipeline structure:\n`);
    for (const chunk of chunks) {
      console.log(`   - Chunk ID: ${chunk.chunkId} | Tokens: ${chunk.tokenCount} | File: ${chunk.fileName}`);
    }
    console.log(`\n💡 Add your actual GEMINI_API_KEY to .env to generate real vector embeddings.`);
    return;
  }

  // Step 2: Generate Vector Embeddings
  console.log(`2️⃣ Generating Dense Vector Representations (Model: text-embedding-005)`);
  const { successful, failed } = await embedDocumentChunks(chunks, {
    model: 'text-embedding-005',
    maxRetries: 3,
    delayBetweenRequestsMs: 200,
  });

  console.log(`\n==================================================`);
  console.log(`📊 Pipeline Results Summary`);
  console.log(`==================================================`);
  console.log(`✅ Successfully Embedded: ${successful.length} chunks`);
  console.log(`❌ Failed Embeddings:     ${failed.length} chunks`);

  if (successful.length > 0) {
    const sample = successful[0];
    console.log(`\n🔍 Sample Vector Output (${sample.chunkId}):`);
    console.log(`   - Vector Dimensions: ${sample.embedding.length}`);
    console.log(`   - Vector Slice (First 5 dimensions): [${sample.embedding.slice(0, 5).join(', ')}...]`);
  }
}

runEmbeddingPipeline();
