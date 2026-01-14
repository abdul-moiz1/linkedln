import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function generateContent(prompt: string, options: any = {}) {
  // Try using gemini-1.5-flash-latest which is often more stable in certain regions
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
  
  const generationConfig = {
    temperature: options.temperature || 0.7,
    topP: options.topP || 0.95,
    topK: options.topK || 40,
    maxOutputTokens: options.maxOutputTokens || 8192,
    responseMimeType: options.responseMimeType || "text/plain",
  };

  const contents: any[] = [{ role: "user", parts: [{ text: prompt }] }];
  
  console.log(`[Gemini] Calling with prompt snippet: ${prompt.substring(0, 100)}...`);
  
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
}
