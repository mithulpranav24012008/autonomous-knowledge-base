import path from 'path';
import { iterateDocumentChunks, DocumentChunk } from '../services/ingestion.js';

async function runIngestion() {
  const dataDir = process.env.DATA_DIR || path.resolve(__dirname, '../../../data');

  console.log(`📂 Starting Document Ingestion from: ${dataDir}`);
  console.log(`⚙️ Chunk Size: 512 tokens | Overlap: 100 tokens\n`);

  let totalProcessedChunks = 0;
  const chunkSummary: Record<string, number> = {};

  try {
    // Iterate through chunks in preparation for embedding
    for await (const chunk of iterateDocumentChunks(dataDir, 512, 100)) {
      totalProcessedChunks++;
      chunkSummary[chunk.fileName] = (chunkSummary[chunk.fileName] || 0) + 1;

      console.log(`--------------------------------------------------`);
      console.log(`📄 Chunk ID:       ${chunk.chunkId}`);
      console.log(`📁 File Name:      ${chunk.fileName} (${chunk.fileType})`);
      console.log(`🔢 Chunk Index:    ${chunk.chunkIndex + 1} of ${chunk.totalChunks}`);
      console.log(`📏 Token Count:    ${chunk.tokenCount} tokens`);
      console.log(`📝 Preview:        "${chunk.text.substring(0, 100).replace(/\n/g, ' ')}..."`);
      console.log(`🔮 Ready for embedding...`);
    }

    console.log(`\n==================================================`);
    console.log(`✅ Ingestion Complete!`);
    console.log(`📊 Total Chunks Generated: ${totalProcessedChunks}`);
    console.log(`📑 Summary by file:`, chunkSummary);
  } catch (error: any) {
    console.error(`❌ Ingestion failed:`, error.message);
    process.exit(1);
  }
}

runIngestion();
