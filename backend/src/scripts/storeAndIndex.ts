import path from 'path';
import { connectDB, closeDB } from '../config/db.js';
import { ingestDirectory } from '../services/ingestion.js';
import { embedDocumentChunks, embedText } from '../services/embedding.js';
import {
  storeChunkEmbeddings,
  createVectorSearchIndex,
  searchVectorIndex,
  generateGEAPImportSnippet,
} from '../services/vectorStore.js';

async function runStorageAndIndexingPipeline() {
  const dataDir = process.env.DATA_DIR || path.resolve(__dirname, '../../../data');

  console.log(`==================================================`);
  console.log(`🍃 MongoDB Atlas Vector Storage & ANN Indexing Pipeline`);
  console.log(`==================================================\n`);

  // Step 1: Ingest & Chunk Documents
  console.log(`1️⃣ Chunking Documents from: ${dataDir}`);
  const chunks = await ingestDirectory(dataDir, 512, 100);
  console.log(`   Generated ${chunks.length} chunks.\n`);

  // Check MongoDB & Gemini credentials
  const apiKey = process.env.GEMINI_API_KEY;
  const mongoUri = process.env.MONGODB_URI;

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    console.log(`⚠️ GEMINI_API_KEY is using placeholder in .env.`);
    console.log(`   Please set a valid GEMINI_API_KEY to generate real vector embeddings.\n`);
  }

  // Step 2: Attempt DB connection
  let dbConnected = false;
  try {
    await connectDB();
    dbConnected = true;
  } catch (err: any) {
    console.log(`⚠️ Could not connect to MongoDB Atlas (${err.message}).`);
    console.log(`   Ensure MONGODB_URI in .env is pointed to your MongoDB Atlas cluster.\n`);
  }

  if (dbConnected && apiKey && apiKey !== 'your_gemini_api_key_here') {
    // Step 3: Embed Chunks
    console.log(`2️⃣ Generating Embeddings with text-embedding-005...`);
    const { successful } = await embedDocumentChunks(chunks, { model: 'text-embedding-005' });

    // Step 4: Store Chunks & Vector Embeddings in MongoDB Atlas
    console.log(`\n3️⃣ Storing Chunks & Embeddings in MongoDB Atlas...`);
    await storeChunkEmbeddings(successful, 'vector_chunks');

    // Step 5: Configure Vector Search Index
    console.log(`\n4️⃣ Configuring Vector Search Index on MongoDB Atlas...`);
    await createVectorSearchIndex('vector_chunks', 'vector_index', 768, 'cosine');

    // Step 6: Test Vector Search (ANN Query)
    console.log(`\n5️⃣ Testing Vector Search (ANN Query)...`);
    const query = "How do we configure Gemini API and MongoDB?";
    console.log(`   Query: "${query}"`);
    const queryVector = await embedText(query, 'text-embedding-005');

    try {
      const searchResults = await searchVectorIndex(queryVector, {
        indexName: 'vector_index',
        collectionName: 'vector_chunks',
        limit: 3,
      });

      console.log(`   Found ${searchResults.length} matching document chunks:`);
      searchResults.forEach((item, idx) => {
        console.log(`   [${idx + 1}] ${item.fileName} (Score: ${item.score.toFixed(4)})`);
        console.log(`       "${item.text.substring(0, 80)}..."`);
      });
    } catch (searchErr: any) {
      console.log(`   Notice: Vector search index is building or pending on Atlas: ${searchErr.message}`);
    }

    await closeDB();
  }

  // Step 7: Print GEAP / RAG import snippet for reference
  console.log(`\n==================================================`);
  console.log(`☁️ Google Cloud GEAP / Vertex RAG Staging Snippet`);
  console.log(`==================================================`);
  const samplePaths = chunks.map((c) => c.filePath);
  const snippet = generateGEAPImportSnippet({
    gcsBucket: 'my-rag-staging-bucket',
    corpusName: 'projects/my-project/locations/us-central1/ragCorpora/my-corpus',
    filePaths: Array.from(new Set(samplePaths)),
  });
  console.log(snippet);
}

runStorageAndIndexingPipeline();
