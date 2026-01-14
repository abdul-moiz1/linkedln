import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function generateContent(prompt: string, options: any = {}) {
  // Use a hardcoded model that is known to work with the v1beta API
  const modelName = "gemini-1.5-flash-8b";
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
    
    // Final fallback to the base model name if the specific one fails
    try {
      const fallbackModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await fallbackModel.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (fallbackError: any) {
      throw error;
    }
  }
}
