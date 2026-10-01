import { GoogleGenAI } from '@google/genai';
import { config } from '../config/env.js';

let aiInstance: GoogleGenAI | null = null;

export function isApiKeyConfigured(): boolean {
  return Boolean(config.geminiApiKey && config.geminiApiKey !== 'your_gemini_api_key_here');
}

export function getGeminiClient(): GoogleGenAI {
  if (!isApiKeyConfigured()) {
    throw new Error('GEMINI_API_KEY environment variable is missing or unconfigured. Please add your GEMINI_API_KEY to the .env file.');
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: config.geminiApiKey });
  }
  return aiInstance;
}

export async function generateText(prompt: string, modelName: string = 'gemini-3.5-flash-lite'): Promise<string> {
  if (!isApiKeyConfigured()) {
    return `⚠️ GEMINI_API_KEY is missing or using placeholder in .env.

To enable live Gemini AI generation:
1. Open the root '.env' file.
2. Set your Google Gemini API Key:
   GEMINI_API_KEY=AQ.Ab8R...
3. Save the file and try again!`;
  }

  const ai = getGeminiClient();
  
  // Try preferred models dynamically
  const candidateModels = [modelName, 'gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-2.5-flash'];
  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });
      if (response.text) return response.text;
    } catch (err: any) {
      lastError = err;
      // If model not found or unavailable, try next candidate
      if (/404|not found|503|unavailable/i.test(err.message || '')) {
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error('Failed to generate content with available Gemini models');
}

export interface ContextChunk {
  fileName: string;
  chunkIndex: number;
  text: string;
  score?: number;
}

/**
 * Generates a RAG response grounded strictly in the provided document context chunks.
 */
export async function generateGroundedAnswer(
  query: string,
  chunks: ContextChunk[],
  modelName: string = 'gemini-3.5-flash-lite'
): Promise<string> {
  if (chunks.length === 0) {
    return 'No relevant document chunks were found in the ingestion directory or vector database to answer your query.';
  }

  if (!isApiKeyConfigured()) {
    const topChunk = chunks[0];
    return `ℹ️ [Demo Mode - Set GEMINI_API_KEY in .env for live Gemini RAG generation]

Based on the top matching document (${topChunk.fileName}):
"${topChunk.text.substring(0, 300)}..."

To enable live grounded synthesis via Gemini ${modelName}, please add your API key to the root .env file.`;
  }

  const formattedContext = chunks
    .map(
      (c, idx) =>
        `[Document Chunk ${idx + 1}] Source: ${c.fileName} (Chunk #${c.chunkIndex + 1})\n${c.text}`
    )
    .join('\n\n');

  const prompt = `You are a helpful AI assistant. Answer the user's question using ONLY the provided document context below.

CONTEXT DOCUMENTS:
${formattedContext}

USER QUESTION:
${query}

INSTRUCTIONS:
- Synthesize a concise and clear answer grounded exclusively in the context provided above.
- If the context does not contain enough information to answer the question, state: "The provided document context does not contain sufficient information to answer this question."
- Reference the source file names when summarizing relevant details.`;

  return generateText(prompt, modelName);
}
