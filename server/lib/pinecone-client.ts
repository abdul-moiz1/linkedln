import { Pinecone } from "@pinecone-database/pinecone";

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME;

export const isPineconeConfigured = Boolean(PINECONE_API_KEY && PINECONE_INDEX_NAME);

let pineconeClient: Pinecone | null = null;

export function getPineconeClient(): Pinecone | null {
  if (!isPineconeConfigured) {
    console.warn("[Pinecone] Not configured - missing PINECONE_API_KEY or PINECONE_INDEX_NAME");
    return null;
  }

  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: PINECONE_API_KEY!,
    });
    console.log("[Pinecone] Client initialized");
  }

  return pineconeClient;
}

export function getPineconeIndex() {
  const client = getPineconeClient();
  if (!client || !PINECONE_INDEX_NAME) {
    return null;
  }
  return client.index(PINECONE_INDEX_NAME);
}

export { PINECONE_INDEX_NAME };
