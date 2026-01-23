import { getPineconeIndex, isPineconeConfigured } from "./pinecone-client";
import { createEmbedding, isOpenAIConfigured } from "./openai-embeddings";
import { buildEmbeddingText } from "./build-embedding-text";
import { adminDb, isFirebaseConfigured } from "./firebase-admin";

export interface VectorUpsertResult {
  success: boolean;
  collection: string;
  docId: string;
  indexed: boolean;
  error?: string;
}

export interface VectorSearchResult {
  success: boolean;
  results: Array<{ id: string; score?: number; [key: string]: any }>;
  error?: string;
}

export interface IndexUserResult {
  success: boolean;
  count: number;
  error?: string;
}

export async function upsertVector(
  collection: string,
  docId: string,
  userId: string
): Promise<VectorUpsertResult> {
  if (!isPineconeConfigured) {
    return { success: false, collection, docId, indexed: false, error: "Pinecone not configured" };
  }

  if (!isOpenAIConfigured) {
    return { success: false, collection, docId, indexed: false, error: "OpenAI not configured" };
  }

  if (!isFirebaseConfigured || !adminDb) {
    return { success: false, collection, docId, indexed: false, error: "Firebase not configured" };
  }

  try {
    const docRef = adminDb.collection(collection).doc(docId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return { success: false, collection, docId, indexed: false, error: "Document not found" };
    }

    const docData = docSnap.data();
    const embeddingText = buildEmbeddingText(collection, docData);
    const embedding = await createEmbedding(embeddingText);

    if (!embedding) {
      return { success: false, collection, docId, indexed: false, error: "Failed to create embedding" };
    }

    const index = getPineconeIndex();
    if (!index) {
      return { success: false, collection, docId, indexed: false, error: "Pinecone index not available" };
    }

    await index.upsert([
      {
        id: docId,
        values: embedding,
        metadata: {
          userId,
          collection,
        },
      },
    ]);

    console.log(`[Vector] Upserted ${collection}/${docId} for user ${userId}`);
    return { success: true, collection, docId, indexed: true };
  } catch (error: any) {
    console.error("[Vector] Upsert error:", error);
    return { success: false, collection, docId, indexed: false, error: error.message };
  }
}

export async function searchVectors(
  collection: string,
  userId: string,
  query: string,
  topK: number = 6
): Promise<VectorSearchResult> {
  if (!isPineconeConfigured) {
    return { success: false, results: [], error: "Pinecone not configured" };
  }

  if (!isOpenAIConfigured) {
    return { success: false, results: [], error: "OpenAI not configured" };
  }

  if (!isFirebaseConfigured || !adminDb) {
    return { success: false, results: [], error: "Firebase not configured" };
  }

  try {
    const queryEmbedding = await createEmbedding(query);
    if (!queryEmbedding) {
      return { success: false, results: [], error: "Failed to create query embedding" };
    }

    const index = getPineconeIndex();
    if (!index) {
      return { success: false, results: [], error: "Pinecone index not available" };
    }

    const searchResults = await index.query({
      vector: queryEmbedding,
      topK,
      filter: {
        userId: { $eq: userId },
        collection: { $eq: collection },
      },
      includeMetadata: true,
    });

    if (!searchResults.matches || searchResults.matches.length === 0) {
      return { success: true, results: [] };
    }

    const docIds = searchResults.matches.map((m) => m.id);
    const docs: Array<{ id: string; score?: number; [key: string]: any }> = [];

    for (const match of searchResults.matches) {
      try {
        const docSnap = await adminDb.collection(collection).doc(match.id).get();
        if (docSnap.exists) {
          docs.push({
            id: match.id,
            score: match.score,
            ...docSnap.data(),
          });
        }
      } catch (err) {
        console.warn(`[Vector] Failed to fetch doc ${match.id}:`, err);
      }
    }

    return { success: true, results: docs };
  } catch (error: any) {
    console.error("[Vector] Search error:", error);
    return { success: false, results: [], error: error.message };
  }
}

export async function indexUserDocuments(
  userId: string,
  collection: string,
  limit: number = 50
): Promise<IndexUserResult> {
  if (!isPineconeConfigured || !isOpenAIConfigured || !isFirebaseConfigured || !adminDb) {
    return { success: false, count: 0, error: "Services not configured" };
  }

  try {
    let query = adminDb.collection(collection).where("userId", "==", userId).limit(limit);
    const snapshot = await query.get();

    if (snapshot.empty) {
      return { success: true, count: 0 };
    }

    let indexedCount = 0;
    for (const doc of snapshot.docs) {
      const result = await upsertVector(collection, doc.id, userId);
      if (result.indexed) {
        indexedCount++;
      }
    }

    console.log(`[Vector] Indexed ${indexedCount}/${snapshot.size} documents for user ${userId} in ${collection}`);
    return { success: true, count: indexedCount };
  } catch (error: any) {
    console.error("[Vector] Index user docs error:", error);
    return { success: false, count: 0, error: error.message };
  }
}
