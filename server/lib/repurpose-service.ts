import { generateContent } from "./gemini";
import * as cheerio from "cheerio";
import { YoutubeTranscript } from 'youtube-transcript';
import axios from "axios";
import ytdl from "ytdl-core";

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
  let videoDetails: any = null;
  let debugInfo = { transcriptLength: 0, title: "", author_name: "", mode: "fallback" };

  try {
    // Safely extract videoId from URL
    const urlObj = new URL(youtubeUrl);
    const videoId = urlObj.searchParams.get("v") || youtubeUrl.split("youtu.be/")[1]?.split("?")[0];
    
    console.log("YouTube URL:", youtubeUrl);
    console.log("YouTube videoId:", videoId);
    
    if (videoId) {
      try {
        const transcript = await YoutubeTranscript.fetchTranscript(videoId);
        transcriptText = transcript.map(t => t.text).join(" ");
        debugInfo.transcriptLength = transcriptText?.length || 0;
        debugInfo.mode = "transcript";
        console.log("Transcript length:", debugInfo.transcriptLength);
      } catch (e) {
        console.warn("[YouTube] Transcript unavailable, fetching oEmbed metadata instead");
      }
    }

    if (!transcriptText || transcriptText.trim().length < 50) {
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeUrl)}&format=json`;
        const response = await axios.get(oembedUrl);
        const data = response.data;
        
        videoDetails = {
          title: data.title,
          channel: data.author_name,
          description: "" // oEmbed doesn't provide description
        };
        
        debugInfo.title = data.title;
        debugInfo.author_name = data.author_name;
        debugInfo.mode = "oembed";
        console.log("Video oEmbed metadata fetched:", videoDetails.title);
      } catch (metadataError) {
        console.warn("[YouTube] oEmbed fetch failed, using URL fallback");
      }
    }
  } catch (error) {
    console.warn("[YouTube] Error in processing chain:", error);
  }

  let prompt = "";
  if (transcriptText && transcriptText.trim().length >= 50) {
    prompt = `You are an expert LinkedIn content strategist.
    
    CRITICAL: Generate a high-impact LinkedIn post based on the transcript below.
    
    Transcript:
    """
    ${transcriptText}
    """
    
    User's Style Instructions: ${instructions || "Professional and engaging"}
    
    Structure:
    1. Attention-grabbing hook
    2. 3-6 punchy paragraphs with deep insights from the video
    3. Use technical terms from the video if applicable
    4. End with 5-8 relevant hashtags
    
    Do not use generic "productivity" filler unless it's in the transcript.
    Return only the post content.`;
  } else if (videoDetails) {
    prompt = `You are an expert LinkedIn content strategist.
    
    Generate a high-impact LinkedIn post based on this YouTube video:
    Title: ${videoDetails.title}
    Channel: ${videoDetails.channel}
    
    User's Style Instructions: ${instructions || "Professional and engaging"}
    
    Structure:
    1. Strong hook related to the title
    2. 3-6 paragraphs expanding on the video's theme based on its title and creator
    3. End with 5-8 relevant hashtags
    
    Return only the post content.`;
  } else {
    prompt = `You are an expert LinkedIn content strategist.
    
    The user shared a YouTube video: ${youtubeUrl}
    
    User's Style Instructions: ${instructions || "Professional and engaging"}
    
    Create an engaging LinkedIn post discussing the potential themes of this video/link in a professional context.
    
    Structure:
    1. Engaging hook
    2. 3-5 thoughtful paragraphs
    3. 5-8 hashtags
    
    Return only the post content.`;
  }

  const result = await generateContent(prompt);
  return { post: cleanGeminiResponse(result), debug: debugInfo };
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
