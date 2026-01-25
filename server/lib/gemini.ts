import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function generateContent(prompt: string, options: any = {}) {
    // List of models to try in order of preference
    const modelsToTry = [
      "gemini-2.0-flash-exp",
      "gemini-1.5-flash",
      "gemini-1.5-pro",
      "gemini-1.5-flash-8b"
    ];

    let lastError: any;
    for (const modelName of modelsToTry) {
      try {
        console.log(`[Gemini] Attempting with model: ${modelName}`);
        const formattedModelName = modelName.startsWith("models/") ? modelName : `models/${modelName}`;
        const model = genAI.getGenerativeModel({ model: formattedModelName });
        
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
        console.warn(`[Gemini] Model ${modelName} failed:`, error.message);
        lastError = error;
        if (error.status === 404 || error.message?.includes("not found") || error.message?.includes("not supported")) {
          continue;
        }
        throw error;
      }
    }
    throw lastError;
}

export async function generateYouTubePost(videoContext: string, userInstructions: string = "") {
  const prompt = `You are a professional LinkedIn content writer.
Write a LinkedIn post based on this YouTube video transcript (or summary if transcript missing).
Rules:
Hook in first line
3 to 6 short paragraphs
Easy English
No heavy emojis
End with 5–8 hashtags
Also follow these user instructions: ${userInstructions}

Video context:
${videoContext}

Return plain text only (no markdown, no JSON).`;

  return generateContent(prompt);
}
