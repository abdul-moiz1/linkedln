import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { 
  linkedInUserSchema, 
  type SessionUser,
  createPostSchema,
  repostSchema,
  createScheduledPostSchema,
} from "@shared/schema";
import { eq, and } from "drizzle-orm";
import multer from "multer";
import OpenAI from "openai";

const upload = multer({ storage: multer.memoryStorage() });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// LinkedIn OAuth2 Configuration
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const BASE_URL = process.env.BASE_URL?.endsWith('/') ? process.env.BASE_URL.slice(0, -1) : process.env.BASE_URL;
const REDIRECT_URI = `${BASE_URL}/api/auth/linkedin/callback`;

// LinkedIn API endpoints
const LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const LINKEDIN_USERINFO_URL = "https://api.linkedin.com/v2/userinfo";
const LINKEDIN_SHARE_URL = "https://api.linkedin.com/v2/ugcPosts";
const LINKEDIN_POSTS_URL = "https://api.linkedin.com/rest/posts";
const LINKEDIN_SOCIAL_ACTIONS_URL = "https://api.linkedin.com/v2/socialActions";

// Extend Express Session type
declare module "express-session" {
  interface SessionData {
    user?: SessionUser;
    oauth_state?: string;
    guestId?: string;
    authType?: "linkedin" | "firebase";
    firebaseUid?: string;
    linkedLinkedIn?: {
      accessToken: string;
      linkedinId: string;
      name?: string;
      email?: string;
      picture?: string;
      linkedAt: Date;
      expiresAt?: Date;
    };
    pendingLinkedInLink?: boolean;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // --- Writing Style Extraction Endpoints ---
  app.post("/api/user/writing-style/voice", upload.single("audio"), async (req: Request, res: Response) => {
    if (!req.session.user || !req.file) return res.status(401).json({ error: "Unauthorized" });
    try {
      const transcription = await openai.audio.transcriptions.create({
        file: await OpenAI.toFile(req.file.buffer, "voice.webm"),
        model: "whisper-1",
      });
      const analysisResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "Analyze the writing style of this transcribed voice note. Focus on vocabulary, tone, and sentence structure. Summarize it as a style profile." },
          { role: "user", content: transcription.text }
        ],
      });
      res.json({ success: true, writingStyle: analysisResponse.choices[0].message.content });
    } catch (error) { 
      console.error("Voice analysis error:", error);
      res.status(500).json({ error: "Failed to analyze voice" }); 
    }
  });

  app.post("/api/user/writing-style/file", upload.single("file"), async (req: Request, res: Response) => {
    if (!req.session.user || !req.file) return res.status(401).json({ error: "Unauthorized" });
    try {
      const analysisResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "Analyze the writing style of the following document. Focus on vocabulary, tone, and patterns. Summarize as a style profile." },
          { role: "user", content: req.file.buffer.toString("utf-8") }
        ],
      });
      res.json({ success: true, writingStyle: analysisResponse.choices[0].message.content });
    } catch (error) { 
      console.error("File analysis error:", error);
      res.status(500).json({ error: "Failed to analyze file" }); 
    }
  });

  app.post("/api/user/writing-style/link", async (req: Request, res: Response) => {
    if (!req.session.user) return res.status(401).json({ error: "Unauthorized" });
    try {
      const fetchResponse = await fetch(req.body.url);
      const html = await fetchResponse.text();
      const cleanText = html.replace(/<[^>]*>?/gm, "").slice(0, 5000);
      const analysisResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "Analyze the writing style of the content from this URL. Focus on tone, vocabulary, and structure. Summarize as a style profile." },
          { role: "user", content: cleanText }
        ],
      });
      res.json({ success: true, writingStyle: analysisResponse.choices[0].message.content });
    } catch (error) { 
      console.error("Link analysis error:", error);
      res.status(500).json({ error: "Failed to analyze link" }); 
    }
  });

  // --- Core Application Routes ---
  app.get("/api/user", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    let profileUrl: string | undefined;
    try {
      const { getUser, isFirebaseConfigured } = await import("./lib/firebase-admin");
      const userId = req.session.user.profile.sub;
      if (isFirebaseConfigured) {
        const userData = await getUser(userId);
        if (userData && (userData as any).profileUrl) {
          profileUrl = (userData as any).profileUrl;
        }
      }
    } catch (firestoreError) {
      console.error("Failed to fetch user from Firestore:", firestoreError);
    }
    res.json({
      ...req.session.user,
      profileUrl,
      writingStyle: (req.session.user as any).writingStyle,
    });
  });

  app.patch("/api/user", async (req: Request, res: Response) => {
    if (!req.session.user) return res.status(401).json({ error: "Unauthorized" });
    const { writingStyle } = req.body;
    try {
      (req.session.user as any).writingStyle = writingStyle;
      const { isFirebaseConfigured, adminFirestore } = await import("./lib/firebase-admin");
      if (isFirebaseConfigured && adminFirestore) {
        await adminFirestore.collection("users").doc(req.session.user.profile.sub).set({
          writingStyle
        }, { merge: true });
      }
      res.json({ success: true, writingStyle });
    } catch (error: any) {
      console.error("Update writing style error:", error);
      res.status(500).json({ error: "Failed to update writing style" });
    }
  });

  app.post("/api/posts/generate", async (req: Request, res: Response) => {
    if (!req.session.user) return res.status(401).json({ error: "Unauthorized" });
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });
    const writingStyle = (req.session.user as any).writingStyle || "professional and engaging";
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert LinkedIn content creator. Write a post based on the user's prompt using this style profile:\n\n${writingStyle}\n\nKeep the post engaging, use whitespace, and add 2-3 hashtags.`
          },
          { role: "user", content: prompt }
        ],
      });
      res.json({ success: true, text: response.choices[0].message.content });
    } catch (error: any) {
      console.error("Post generation error:", error);
      res.status(500).json({ error: "Failed to generate post" });
    }
  });

  app.get("/auth/linkedin", (req: Request, res: Response) => {
    if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) {
      return res.status(503).send("LinkedIn OAuth Not Configured");
    }
    const isLinkMode = req.query.mode === 'link' || (req.session.user && req.session.authType === 'firebase');
    req.session.pendingLinkedInLink = isLinkMode;
    const state = Math.random().toString(36).substring(7);
    req.session.oauth_state = state;
    const authUrl = new URL(LINKEDIN_AUTH_URL);
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("client_id", LINKEDIN_CLIENT_ID!);
    authUrl.searchParams.append("redirect_uri", REDIRECT_URI);
    authUrl.searchParams.append("state", state);
    authUrl.searchParams.append("scope", "openid profile email w_member_social");
    res.redirect(authUrl.toString());
  });

  app.post("/api/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ error: "Failed to logout" });
      res.json({ success: true });
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
