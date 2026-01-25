import { generateContent } from "./gemini";
import * as cheerio from "cheerio";

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

export async function extractArticleContent(url: string): Promise<{ title: string; content: string }> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch article: ${response.status}`);
  }
  
  const html = await response.text();
  const $ = cheerio.load(html);
  
  $('script, style, nav, header, footer, aside, .advertisement, .ads, .comments').remove();
  
  const title = $('title').text() || $('h1').first().text() || 'Untitled';
  
  const paragraphs: string[] = [];
  $('article p, .content p, .post-content p, main p, .entry-content p, p').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 30) {
      paragraphs.push(text);
    }
  });
  
  if (paragraphs.length === 0) {
    $('article, .content, main, .post-content').each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 100) {
        paragraphs.push(text.slice(0, 5000));
      }
    });
  }
  
  const content = paragraphs.slice(0, 20).join('\n\n');
  
  return { title, content: content || 'No content could be extracted from this page.' };
}
