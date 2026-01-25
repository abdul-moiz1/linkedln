import { generateContent } from "./gemini";
import * as cheerio from "cheerio";
import { YoutubeTranscript } from 'youtube-transcript';
import axios from "axios";

const LINKEDIN_PROMPT_TEMPLATE = `You are a LinkedIn content writer. Create a clear LinkedIn post with:

- Hook line (attention-grabbing first sentence)
- 3-6 short paragraphs
- Optional bullet points
- End with 5-8 hashtags

Keep it natural and human. Do not use too many emojis.`;

function cleanGeminiResponse(response: string): string {
  let cleaned = response.trim();
  
  cleaned = cleaned.replace(/```json\s*/gi, '');
  cleaned = cleaned.replace(/```\s*/gi, '');
  cleaned = cleaned.trim();
  
  return cleaned;
}

export async function generateLinkedInPost(content: string, instructions?: string): Promise<string> {
  const prompt = `${LINKEDIN_PROMPT_TEMPLATE}

Content to repurpose:
"""
${content}
"""

${instructions ? `User's additional instructions: ${instructions}` : ''}

Generate a LinkedIn post based on the content above.`;

  const result = await generateContent(prompt);
  return cleanGeminiResponse(result);
}

export async function repurposeYouTube(youtubeUrl: string, instructions: string) {
  let transcriptText = "";
  try {
    // Extract videoId from URL
    const videoIdMatch = youtubeUrl.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})(?:[&?]|$)/);
    const videoId = videoIdMatch ? videoIdMatch[1] : youtubeUrl;
    
    console.log("YouTube URL:", youtubeUrl);
    console.log("YouTube videoId:", videoId);
    
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    transcriptText = transcript.map(t => t.text).join(" ");
    
    console.log("Transcript length:", transcriptText?.length || 0);
    if (transcriptText) {
      console.log("Transcript preview (200 chars):", transcriptText.substring(0, 200));
    }
  } catch (error) {
    console.warn("[YouTube] Failed to fetch transcript:", error);
  }

  if (!transcriptText || transcriptText.trim().length < 50) {
    return "Transcript unavailable. Please try another video.";
  }

  const prompt = `You are a LinkedIn content writer.

Generate a LinkedIn post ONLY based on the transcript below.
Do not guess.
If the transcript is missing or unrelated, respond with:
"Transcript unavailable. Please try another video."

Rules:
Hook in first line
3 to 6 short paragraphs
Easy English
No heavy emojis
End with 5–8 hashtags
Must reference specific concepts found in transcript
If it's about web development, reference at least 3 technical concepts from it

Transcript:
${transcriptText}

User instructions:
${instructions}

Return plain text only (no markdown, no JSON).`;

  const result = await generateContent(prompt);
  return cleanGeminiResponse(result);
}

export async function extractArticleContent(url: string): Promise<{ title: string; content: string }> {
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.google.com/"
      },
      timeout: 15000,
      validateStatus: (status) => status < 500 // Accept anything below 500 to handle 403 gracefully
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    $("script, style, nav, footer, header, noscript, iframe").remove();
    
    const title = $("h1").first().text().trim() || $("title").text().trim() || url;
    const paragraphs = $("p")
      .map((i, el) => $(el).text().trim())
      .get()
      .filter(Boolean);
    
    const content = paragraphs.join("\n").slice(0, 5000);
    
    return { title, content: content || `URL: ${url}` };
  } catch (error: any) {
    console.warn(`[Scraping] Failed to fetch ${url}, falling back:`, error.message);
    return { title: url, content: `URL: ${url}` };
  }
}

export async function repurposeArticle(articleUrl: string, instructions: string) {
  const { title, content } = await extractArticleContent(articleUrl);
  
  const prompt = `You are a professional LinkedIn content writer.
Write a LinkedIn post based on the article content below.
Rules:
Hook in the first line
3 to 6 short paragraphs
Simple English
No heavy emojis
Keep it human and natural
End with 5–8 relevant hashtags
Follow these instructions from the user: ${instructions}

Article Title: ${title}
Article Content:
${content}

If the content is just a URL, infer likely key ideas from the page title and URL to create a general but relevant post.

Return plain text only.`;

  const result = await generateContent(prompt);
  return cleanGeminiResponse(result);
}
