import OpenAI from "openai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export const isOpenAIConfigured = Boolean(OPENAI_API_KEY);

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (!isOpenAIConfigured) {
    console.warn("[OpenAI] Not configured - missing OPENAI_API_KEY");
    return null;
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });
  }

  return openaiClient;
}

export async function createEmbedding(text: string): Promise<number[] | null> {
  const client = getOpenAIClient();
  if (!client) {
    return null;
  }

  try {
    const response = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("[OpenAI] Embedding creation failed:", error);
    return null;
  }
}
