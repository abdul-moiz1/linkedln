import { GoogleGenerativeAI } from "@google/generative-ai";
import { Pinecone } from "@pinecone-database/pinecone";

async function runTest() {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
  const PINECONE_INDEX_NAME = "demo";

  if (!GEMINI_API_KEY || !PINECONE_API_KEY) {
    console.error("Missing GEMINI_API_KEY or PINECONE_API_KEY in environment variables");
    process.exit(1);
  }

  try {
    // 1. Initialize Gemini
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    // Use the model that supports 1536 dimensions
    const model = genAI.getGenerativeModel({ model: "embedding-001" });

    // 2. Generate Embedding with explicit 1536 dimensionality
    const text = "Hello Noor, Gemini embeddings test";
    const result = await model.embedContent({
      content: { parts: [{ text }] },
      taskType: "RETRIEVAL_DOCUMENT",
      outputDimensionality: 1536
    });
    let embedding = result.embedding.values;

    // Fallback: Pad to 1536 if 768 returned
    if (embedding.length === 768) {
      console.warn("Padding 768 dimension embedding to 1536");
      embedding = [...embedding, ...new Array(768).fill(0)];
    }

    const dimension = embedding.length;
    console.log(`Gemini embedding dimension = ${dimension}`);

    // 3. Verify Dimension
    const EXPECTED_DIMENSION = 1536;
    if (dimension !== EXPECTED_DIMENSION) {
      console.error(`Dimension mismatch: Pinecone expects ${EXPECTED_DIMENSION} but Gemini returned ${dimension}`);
      return;
    }

    // 4. Initialize Pinecone and Upsert
    const pc = new Pinecone({ apiKey: PINECONE_API_KEY });
    const index = pc.index(PINECONE_INDEX_NAME);

    await index.upsert([
      {
        id: "test-1",
        values: embedding,
        metadata: { source: "gemini", text: text }
      }
    ]);

    console.log("Successfully upserted into Pinecone with Gemini embeddings!");
  } catch (error) {
    console.error("Error during test:", error);
  }
}

runTest();
