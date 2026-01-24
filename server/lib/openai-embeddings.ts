import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
export const isOpenAIConfigured = Boolean(GEMINI_API_KEY);

let genAI: GoogleGenerativeAI | null = null;

if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

export async function createEmbedding(text: string): Promise<number[] | null> {
  if (!genAI) {
    console.warn("[Gemini] API Key not configured");
    return null;
  }

  try {
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent({
      content: { parts: [{ text: text.replace(/\n/g, " ") }] },
      taskType: "RETRIEVAL_DOCUMENT",
      outputDimensionality: 1536,
    });
    let embedding = result.embedding.values;
    
    // Fallback: If outputDimensionality is ignored and returns 768, pad to 1536
    if (embedding.length === 768) {
      console.warn("[Gemini] Padding 768 dimension embedding to 1536");
      embedding = [...embedding, ...new Array(768).fill(0)];
    }

    if (embedding.length !== 1536) {
      console.error(`[Gemini] Dimension mismatch: Expected 1536 but got ${embedding.length}`);
      return null;
    }

    return embedding;
  } catch (error) {
    console.error("[Gemini] Embedding creation failed:", error);
    return null;
  }
}
