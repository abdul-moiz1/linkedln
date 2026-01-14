import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function generateContent(prompt: string, options: any = {}) {
  // Try using the most stable model names in a fallback chain
  const models = ["gemini-1.5-flash-latest", "gemini-1.5-flash", "gemini-pro"];
  let lastError: any = null;

  for (const modelName of models) {
    try {
      console.log(`[Gemini] Attempting with model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      
      const generationConfig = {
        temperature: options.temperature || 0.7,
        topP: options.topP || 0.95,
        topK: options.topK || 40,
        maxOutputTokens: options.maxOutputTokens || 8192,
        responseMimeType: options.responseMimeType || "text/plain",
      };

      const contents: any[] = [{ role: "user", parts: [{ text: prompt }] }];
      
      if (options.inlineData) {
        contents[0].parts.push({
          inlineData: options.inlineData
        });
      }

      const result = await model.generateContent({
        contents,
        generationConfig,
      });

      const response = await result.response;
      return response.text();
    } catch (error: any) {
      console.error(`[Gemini] Error with ${modelName}:`, error.message);
      lastError = error;
      // If it's a 404, we continue to the next model
      if (error.status === 404 || error.message?.includes("not found")) {
        continue;
      }
      // For other errors (like auth/quota), we might want to throw immediately
      throw error;
    }
  }

  throw lastError || new Error("All Gemini models failed");
}
