import { getPineconeIndex, isPineconeConfigured } from "./pinecone-client";
import { createEmbedding, isOpenAIConfigured } from "./openai-embeddings";
import { buildEmbeddingText } from "./build-embedding-text";
import { adminDb, isFirebaseConfigured } from "./firebase-admin";
import type { firestore as FirebaseFirestore } from "firebase-admin";

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

    // For global templates, don't store userId in metadata
    const isGlobalCollection = collection === "carouselTemplates";
    const metadata: Record<string, string> = { collection };
    if (!isGlobalCollection && userId) {
      metadata.userId = userId;
    }

    await index.upsert([
      {
        id: docId,
        values: embedding,
        metadata,
      },
    ]);

    console.log(`[Vector] Upserted ${collection}/${docId}${userId ? ` for user ${userId}` : " (global)"}`);
    return { success: true, collection, docId, indexed: true };
  } catch (error: any) {
    console.error("[Vector] Upsert error:", error);
    return { success: false, collection, docId, indexed: false, error: error.message };
  }
}

async function fallbackTextSearch(
  collection: string,
  userId: string,
  query: string,
  topK: number
): Promise<VectorSearchResult> {
  if (!isFirebaseConfigured || !adminDb) {
    return { success: false, results: [], error: "Firebase not configured" };
  }

  try {
    const isGlobalCollection = collection === "carouselTemplates";
    const queryLower = query.toLowerCase().trim();
    const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 1);
    
    let dbQuery = adminDb.collection(collection) as FirebaseFirestore.Query;
    
    if (!isGlobalCollection && userId && userId !== "global") {
      dbQuery = dbQuery.where("userId", "==", userId);
    }
    
    const snapshot = await dbQuery.limit(100).get();
    
    if (snapshot.empty) {
      return { success: true, results: [] };
    }
    
    const scoredDocs: Array<{ id: string; score: number; [key: string]: any }> = [];
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const searchableText = buildEmbeddingText(collection, data).toLowerCase();
      
      const terms = queryTerms.length > 0 ? queryTerms : [queryLower].filter(t => t.length > 0);
      
      let termMatches = 0;
      let matchedAny = false;
      
      if (terms.length === 0) {
        if (searchableText.includes(queryLower)) {
          termMatches = 1;
          matchedAny = true;
        }
      } else {
        for (const term of terms) {
          if (searchableText.includes(term)) {
            termMatches++;
          }
        }
        if (termMatches > 0) {
          matchedAny = true;
        }
      }
      
      if (matchedAny) {
        const termCoverage = terms.length > 0 ? termMatches / terms.length : 1;
        const wordCount = searchableText.split(/\s+/).length;
        let occurrences = 0;
        for (const term of terms) {
          const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
          const matches = searchableText.match(regex);
          if (matches) occurrences += matches.length;
        }
        const freqScore = Math.min(0.4, occurrences / (wordCount + 5));
        const exactMatchBonus = searchableText.includes(queryLower) ? 0.3 : 0;
        const lengthPenalty = Math.min(0.15, searchableText.length / 10000);
        
        const finalScore = Math.max(0.05, Math.min(1, (termCoverage * 0.4) + freqScore + exactMatchBonus - lengthPenalty));

        scoredDocs.push({
          id: doc.id,
          score: finalScore,
          ...data,
        });
      }
    }
    
    scoredDocs.sort((a, b) => b.score - a.score);
    
    console.log(`[Vector] Fallback text search found ${scoredDocs.length} results for "${query}"`);
    return { success: true, results: scoredDocs.slice(0, topK) };
  } catch (error: any) {
    console.error("[Vector] Fallback search error:", error);
    return { success: false, results: [], error: error.message };
  }
}

export async function searchVectors(
  collection: string,
  userId: string,
  query: string,
  topK: number = 6
): Promise<VectorSearchResult> {
  if (!isFirebaseConfigured || !adminDb) {
    return { success: false, results: [], error: "Firebase not configured" };
  }

  if (!isPineconeConfigured || !isOpenAIConfigured) {
    console.log("[Vector] Using fallback text search (Pinecone/OpenAI not configured)");
    return fallbackTextSearch(collection, userId, query, topK);
  }

  try {
    const queryEmbedding = await createEmbedding(query);
    if (!queryEmbedding) {
      console.log("[Vector] Embedding creation failed, falling back to text search");
      return fallbackTextSearch(collection, userId, query, topK);
    }

    const index = getPineconeIndex();
    if (!index) {
      console.log("[Vector] Pinecone index not available, falling back to text search");
      return fallbackTextSearch(collection, userId, query, topK);
    }

    const isGlobalCollection = collection === "carouselTemplates";
    const filter: Record<string, any> = {
      collection: { $eq: collection },
    };
    if (!isGlobalCollection && userId && userId !== "global") {
      filter.userId = { $eq: userId };
    }

    const searchResults = await index.query({
      vector: queryEmbedding,
      topK,
      filter,
      includeMetadata: true,
    });

    if (!searchResults.matches || searchResults.matches.length === 0) {
      return { success: true, results: [] };
    }

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
    return fallbackTextSearch(collection, userId, query, topK);
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
