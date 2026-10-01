import fs from 'fs/promises';
import path from 'path';

export interface DocumentChunk {
  chunkId: string;
  filePath: string;
  fileName: string;
  fileType: string;
  chunkIndex: number;
  totalChunks: number;
  text: string;
  tokenCount: number;
  metadata: {
    source: string;
    createdAt: string;
  };
}

/**
 * Simple word & punctuation tokenizer for chunking estimations.
 */
export function tokenize(text: string): string[] {
  // Matches words, numbers, punctuation, or whitespace blocks
  return text.match(/\S+|\s+/g) || [];
}

/**
 * Splits raw content into token chunks with a specified size and overlap.
 */
export function chunkText(
  content: string,
  filePath: string,
  chunkSize: number = 512,
  overlap: number = 100
): DocumentChunk[] {
  const fileName = path.basename(filePath);
  const fileType = path.extname(filePath).toLowerCase();
  const tokens = tokenize(content);

  if (tokens.length === 0) {
    return [];
  }

  const step = Math.max(1, chunkSize - overlap);
  const chunks: DocumentChunk[] = [];
  let chunkIndex = 0;

  for (let i = 0; i < tokens.length; i += step) {
    const tokenSlice = tokens.slice(i, i + chunkSize);
    const chunkTextContent = tokenSlice.join('').trim();

    if (chunkTextContent.length > 0) {
      chunks.push({
        chunkId: `${fileName}-${chunkIndex}`,
        filePath,
        fileName,
        fileType,
        chunkIndex,
        totalChunks: 0, // set after loop
        text: chunkTextContent,
        tokenCount: tokenSlice.filter((t) => /\S/.test(t)).length,
        metadata: {
          source: filePath,
          createdAt: new Date().toISOString(),
        },
      });
      chunkIndex++;
    }

    // Stop if remaining tokens are fully included in this slice
    if (i + chunkSize >= tokens.length) {
      break;
    }
  }

  // Set totalChunks count on each chunk
  return chunks.map((chunk) => ({
    ...chunk,
    totalChunks: chunks.length,
  }));
}

/**
 * Parses raw file content according to its extension (.txt, .md, .csv).
 */
export async function parseFile(filePath: string): Promise<string> {
  const fileType = path.extname(filePath).toLowerCase();
  const rawContent = await fs.readFile(filePath, 'utf-8');

  if (fileType === '.csv') {
    return parseCSV(rawContent);
  }

  // .txt and .md files are returned as clean UTF-8 text
  return rawContent;
}

/**
 * Parses CSV content into descriptive text format suitable for embeddings.
 */
function parseCSV(csvContent: string): string {
  const lines = csvContent.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length === 0) return '';

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"(.*)"$/, '$1'));
  const rows: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim().replace(/^"(.*)"$/, '$1'));
    const rowDetails = headers
      .map((header, idx) => `${header}: ${values[idx] ?? ''}`)
      .join(' | ');
    rows.push(`Record ${i}: ${rowDetails}`);
  }

  return rows.join('\n');
}

/**
 * Ingests all supported files (.txt, .md, .csv) from a target directory.
 */
export async function ingestDirectory(
  dirPath: string,
  chunkSize: number = 512,
  overlap: number = 100
): Promise<DocumentChunk[]> {
  const supportedExtensions = new Set(['.txt', '.md', '.csv']);
  const allChunks: DocumentChunk[] = [];

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (supportedExtensions.has(ext)) {
          const fullPath = path.join(dirPath, entry.name);
          const parsedText = await parseFile(fullPath);
          const chunks = chunkText(parsedText, fullPath, chunkSize, overlap);
          allChunks.push(...chunks);
        }
      }
    }
  } catch (error: any) {
    console.error(`Error reading directory at ${dirPath}:`, error.message);
    throw error;
  }

  return allChunks;
}

/**
 * Async generator function that iterates through document chunks in preparation for embedding.
 */
export async function* iterateDocumentChunks(
  dirPath: string,
  chunkSize: number = 512,
  overlap: number = 100
): AsyncGenerator<DocumentChunk> {
  const chunks = await ingestDirectory(dirPath, chunkSize, overlap);

  for (const chunk of chunks) {
    yield chunk;
  }
}
