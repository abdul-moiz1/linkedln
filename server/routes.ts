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

// Extend Express Session type to include user data and OAuth state
declare module "express-session" {
  interface SessionData {
    user?: SessionUser;
    oauth_state?: string;
    guestId?: string; // For guest carousel tracking
    authType?: "linkedin" | "firebase"; // Track auth method
    firebaseUid?: string; // Firebase user ID
    linkedLinkedIn?: {
      accessToken: string;
      linkedinId: string;
      name?: string;
      email?: string;
      picture?: string;
      linkedAt: Date;
      expiresAt?: Date;
    }; // Linked LinkedIn for publishing (separate from login)
    pendingLinkedInLink?: boolean; // Flag to indicate linking mode vs login mode
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Test endpoint to verify Firebase Storage is working
  app.get("/api/test-storage", async (req: Request, res: Response) => {
    try {
      const { isStorageConfigured, adminStorage } = await import("./lib/firebase-admin");
      
      const configured = isStorageConfigured();
      const storageBucket = process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET;
      
      if (!configured) {
        return res.json({
          success: false,
          error: "Storage not configured",
          details: {
            adminStorage: !!adminStorage,
            storageBucket: storageBucket || "NOT SET",
          }
        });
      }
      
      // Try to upload a test file
      const testContent = Buffer.from("Test file content - " + new Date().toISOString());
      const storage = adminStorage!;
      const bucket = storage.bucket(storageBucket);
      const testFile = bucket.file("test/test-upload.txt");
      
      await testFile.save(testContent, {
        metadata: { contentType: "text/plain" },
        public: true,
      });
      
      const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o/${encodeURIComponent("test/test-upload.txt")}?alt=media`;
      
      res.json({
        success: true,
        message: "Storage upload test successful!",
        testFileUrl: publicUrl,
        bucket: storageBucket,
      });
    } catch (error: any) {
      console.error("[Test Storage] Error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Unknown error",
        stack: error.stack,
      });
    }
  });

  /**
   * STEP 1: Initiate LinkedIn OAuth2 Authorization Flow
   * 
   * When user clicks "Login with LinkedIn" or "Connect LinkedIn", redirect them to LinkedIn's
   * authorization page where they can grant permissions to our app.
   * 
   * Query parameters:
   * - mode=link: Connect LinkedIn to existing account (don't replace current login)
   * 
   * OAuth2 Scopes requested:
   * - openid: Required for OpenID Connect authentication
   * - profile: Access to basic profile information
   * - email: Access to user's email address
   * - w_member_social: Permission to post on behalf of the user
   */
  app.get("/auth/linkedin", (req: Request, res: Response) => {
    // Check if LinkedIn credentials are configured
    if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) {
      return res.status(503).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>LinkedIn OAuth Not Configured</title>
            <style>
              body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
              .error { background: #fee; border: 1px solid #fcc; border-radius: 8px; padding: 20px; }
              h1 { color: #c33; margin-top: 0; }
              code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
              ol { line-height: 1.8; }
              a { color: #0066cc; }
            </style>
          </head>
          <body>
            <div class="error">
              <h1>LinkedIn OAuth Not Configured</h1>
              <p>This application requires LinkedIn OAuth credentials to function. Please set up the following:</p>
              <ol>
                <li>Go to <a href="https://www.linkedin.com/developers/apps" target="_blank">LinkedIn Developers</a> and create a new app</li>
                <li>In your app settings, add this OAuth redirect URL:<br>
                    <code>${REDIRECT_URI}</code></li>
                <li>Request these scopes: <code>openid</code>, <code>profile</code>, <code>email</code>, <code>w_member_social</code></li>
                <li>Add the credentials to your Replit Secrets:
                  <ul>
                    <li><code>LINKEDIN_CLIENT_ID</code> - Your LinkedIn app's Client ID</li>
                    <li><code>LINKEDIN_CLIENT_SECRET</code> - Your LinkedIn app's Client Secret</li>
                  </ul>
                </li>
              </ol>
              <p><a href="/">Back to Home</a></p>
            </div>
          </body>
        </html>
      `);
    }

    // Check if this is a "link" request (connect LinkedIn to existing account)
    // If user is already logged in with Firebase, we should link LinkedIn instead of replacing the session
    const isLinkMode = req.query.mode === 'link' || (req.session.user && req.session.authType === 'firebase');
    
    if (isLinkMode) {
      // User is logged in with Firebase and wants to connect LinkedIn for publishing
      req.session.pendingLinkedInLink = true;
      console.log("[LinkedIn Auth] Link mode - will connect LinkedIn to existing Firebase account");
    } else {
      // Fresh login with LinkedIn
      req.session.pendingLinkedInLink = false;
    }

    // Generate a random state parameter for CSRF protection
    const state = Math.random().toString(36).substring(7);
    
    // Store state in session to verify in callback
    req.session.oauth_state = state;

    const authUrl = new URL(LINKEDIN_AUTH_URL);
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("client_id", LINKEDIN_CLIENT_ID!);
    authUrl.searchParams.append("redirect_uri", REDIRECT_URI);
    authUrl.searchParams.append("state", state);
    authUrl.searchParams.append("scope", "openid profile email w_member_social");

    console.log("[LinkedIn Auth] Redirecting to:", authUrl.toString());
    // Redirect user to LinkedIn's authorization page
    res.redirect(authUrl.toString());
  });

  /**
   * STEP 2: Handle OAuth2 Callback
   * 
   * LinkedIn redirects back to this endpoint after user authorizes the app.
   * We receive an authorization code that we exchange for an access token.
   * 
   * Query parameters received:
   * - code: Authorization code to exchange for access token
   * - state: CSRF protection token (must match what we sent)
   */
  app.get("/api/auth/linkedin/callback", async (req: Request, res: Response) => {
    const { code, state } = req.query;

    // Verify state parameter to prevent CSRF attacks
    if (!state || state !== req.session.oauth_state) {
      return res.status(400).send("Invalid state parameter. Possible CSRF attack.");
    }

    // Clear the state from session after verification
    delete req.session.oauth_state;

    if (!code) {
      return res.status(400).send("No authorization code received from LinkedIn.");
    }

    try {
      /**
       * STEP 3: Exchange Authorization Code for Access Token
       * 
       * Make a POST request to LinkedIn's token endpoint with:
       * - grant_type: "authorization_code" (OAuth2 flow type)
       * - code: The authorization code we just received
       * - client_id & client_secret: Our app credentials
       * - redirect_uri: Must match the one used in authorization
       */
      const tokenParams = new URLSearchParams({
        grant_type: "authorization_code",
        code: code as string,
        client_id: LINKEDIN_CLIENT_ID!,
        client_secret: LINKEDIN_CLIENT_SECRET!,
        redirect_uri: REDIRECT_URI,
      });

      const tokenResponse = await fetch(LINKEDIN_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: tokenParams.toString(),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("Token exchange failed:", errorText, {
          status: tokenResponse.status,
          redirect_uri: REDIRECT_URI,
          client_id: LINKEDIN_CLIENT_ID ? "PRESENT" : "MISSING"
        });
        return res.status(500).send(`Failed to obtain access token from LinkedIn: ${errorText}`);
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      /**
       * STEP 4: Fetch User Profile Information
       * 
       * Use the access token to call LinkedIn's /v2/userinfo endpoint (OpenID Connect).
       * This returns standardized user profile data including:
       * - sub: Unique user identifier
       * - name, given_name, family_name: User's name
       * - email, email_verified: Email information
       * - picture: Profile picture URL
       * - locale: User's locale preference
       */
      const profileResponse = await fetch(LINKEDIN_USERINFO_URL, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!profileResponse.ok) {
        const errorText = await profileResponse.text();
        console.error("Profile fetch failed:", errorText);
        return res.status(500).send("Failed to fetch user profile from LinkedIn.");
      }

      const profileData = await profileResponse.json();
      
      // Validate the profile data against our schema
      const profile = linkedInUserSchema.parse(profileData);

      /**
       * STEP 5: Handle LinkedIn data based on mode (link vs login)
       * 
       * Two modes:
       * 1. LINK MODE: User is already logged in with Firebase, just connect LinkedIn for publishing
       *    - Keep the Firebase session intact
       *    - Store LinkedIn tokens as a linked integration
       * 2. LOGIN MODE: User is logging in with LinkedIn as their primary auth
       *    - Replace session with LinkedIn user
       */
      const isLinkMode = req.session.pendingLinkedInLink === true;
      delete req.session.pendingLinkedInLink; // Clear the flag
      
      const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000);
      
      if (isLinkMode && req.session.user && req.session.authType === 'firebase') {
        // LINK MODE: Keep Firebase session, add LinkedIn as linked integration
        // Use firebaseUid for storage key (not profile.sub which is firebase-${uid})
        const firebaseUserId = req.session.firebaseUid || req.session.user.profile.sub;
        console.log("[LinkedIn Callback] Link mode - connecting LinkedIn to Firebase user:", firebaseUserId);
        
        // Store LinkedIn tokens as a linked integration (don't replace user session)
        req.session.linkedLinkedIn = {
          accessToken,
          linkedinId: profile.sub, // This is the actual LinkedIn person ID for publishing
          name: profile.name,
          email: profile.email,
          picture: profile.picture,
          linkedAt: new Date(),
          expiresAt,
        };
        
        // Also add to session user for easy access
        req.session.user.linkedLinkedIn = req.session.linkedLinkedIn;
        
        // Save LinkedIn connection to Firestore linked to Firebase user
        // Use the user's profile.sub as key since that's what we use for carousels (firebase-${uid})
        try {
          const { saveLinkedLinkedIn, isFirebaseConfigured } = await import("./lib/firebase-admin");
          if (isFirebaseConfigured) {
            // Store under the profile.sub key (firebase-${uid}) for consistency with carousel ownership
            await saveLinkedLinkedIn(req.session.user.profile.sub, {
              linkedinId: profile.sub,
              name: profile.name || "",
              email: profile.email || "",
              picture: profile.picture,
              accessToken,
              expiresAt,
            });
            console.log("[LinkedIn Callback] Saved LinkedIn connection for Firebase user:", req.session.user.profile.sub);
          }
        } catch (firestoreError) {
          console.warn("Failed to save linked LinkedIn to Firestore:", firestoreError);
        }
        
        // Redirect back to where the user was (my-carousels or preview)
        res.redirect("/my-carousels");
      } else {
        // LOGIN MODE: Replace session with LinkedIn user (existing behavior)
        console.log("[LinkedIn Callback] Login mode - creating new LinkedIn session");
        
        req.session.user = {
          profile,
          accessToken,
          authProvider: "linkedin",
        };
        req.session.authType = "linkedin";

        // Migrate any guest carousels if guestId exists
        if (req.session.guestId) {
          try {
            const { migrateGuestCarousels, isFirebaseConfigured } = await import("./lib/firebase-admin");
            if (isFirebaseConfigured) {
              await migrateGuestCarousels(req.session.guestId, profile.sub);
              delete req.session.guestId;
            }
          } catch (migrateError) {
            console.warn("Could not migrate guest carousels:", migrateError);
          }
        }

        // Try to persist user to Firestore (optional - will fail gracefully if not configured)
        try {
          const { saveUser, isFirebaseConfigured } = await import("./lib/firebase-admin");
          if (isFirebaseConfigured) {
            await saveUser({
              linkedinId: profile.sub,
              email: profile.email || "",
              name: profile.name || "",
              profilePicture: profile.picture,
              accessToken,
              tokenExpiresAt: expiresAt,
            });
          }
        } catch (firestoreError) {
          console.warn("Firestore save failed (Firebase may not be configured):", firestoreError);
        }

        // Redirect to the preview page so user can continue with their carousel
        res.redirect("/preview");
      }
    } catch (error) {
      console.error("OAuth callback error:", error);
      res.status(500).send("Authentication failed. Please try again.");
    }
  });

  /**
   * API: Get Current User Session
   * 
   * Returns the authenticated user's profile and access token.
   * Also fetches profileUrl from Firestore if available.
   * Used by the frontend to display user information.
   */
  app.post("/api/onboarding", async (req: Request, res: Response) => {
    if (!req.session.user) return res.status(401).json({ error: "Unauthorized" });
    const userId = req.session.user.profile.sub;
    const { fullName, email, phone, plan } = req.body;
    
    try {
      const db = getDb();
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 7);

      await db.insert(users).values({
        id: userId,
        fullName,
        email,
        phone,
        plan,
        subscriptionStatus: "trialing",
        trialEndDate,
        onboardingCompleted: "true",
      }).onConflictDoUpdate({
        target: users.id,
        set: { fullName, email, phone, plan, subscriptionStatus: "trialing", trialEndDate, onboardingCompleted: "true" }
      });

      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to save profile" });
    }
  });

  app.post("/api/create-checkout-session", async (req: Request, res: Response) => {
    if (!req.session.user) return res.status(401).send("Unauthorized");
    const { planId, priceId } = req.body;
    
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
          price: priceId,
          quantity: 1,
        }],
        mode: "subscription",
        subscription_data: {
          trial_period_days: 7,
        },
        success_url: `${process.env.BASE_URL || 'http://localhost:5000'}/create?success=true`,
        cancel_url: `${process.env.BASE_URL || 'http://localhost:5000'}/pricing`,
        client_reference_id: req.session.user.profile.sub,
        metadata: { planId }
      });

      res.json({ url: session.url });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/user", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Try to fetch profileUrl from Firestore
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

  app.post("/api/user/writing-style", async (req: Request, res: Response) => {
    if (!req.session.user) return res.status(401).json({ error: "Unauthorized" });
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Text is required" });

    try {
      // Analyze writing style using Gemini
      const { generateContent } = await import("./lib/gemini"); // Assuming gemini lib exists or we use the API
      
      const prompt = `Analyze the writing style of the following text. Focus on vocabulary, tone, sentence structure, and unique patterns. Summarize it in a way that can be used as a prompt for future writing.\n\nText:\n${text}`;
      
      const writingStyle = await generateContent(prompt);

      // ADDED: Derive structured styleProfile and promptStyleInstruction
      let styleProfile = null;
      let promptStyleInstruction = null;
      try {
        const structuredPrompt = `You are a linguist. Analyze the following style summary and extract a structured JSON profile.
        {
          "tone": "string",
          "formality": "casual" | "neutral" | "formal",
          "energyLevel": "low" | "medium" | "high",
          "sentenceLength": "short" | "medium" | "long",
          "usesFillers": boolean,
          "commonFillers": ["string"],
          "pacing": "string",
          "emotionalBias": "string"
        }
        Also provide a "promptStyleInstruction" which is a single paragraph instruction for an AI to write in this style.
        
        Style Summary:
        ${writingStyle}`;

        const structuredResult = await generateContent(structuredPrompt, { responseMimeType: "application/json" });
        const parsed = JSON.parse(structuredResult);
        styleProfile = JSON.stringify(parsed);
        promptStyleInstruction = parsed.promptStyleInstruction;
      } catch (structuredError) {
        console.error("Failed to generate structured style profile:", structuredError);
      }

      // Update session and Firestore
      (req.session.user as any).writingStyle = writingStyle;
      (req.session.user as any).styleProfile = styleProfile;
      (req.session.user as any).promptStyleInstruction = promptStyleInstruction;
      
      const { isFirebaseConfigured, adminFirestore } = await import("./lib/firebase-admin");
      if (isFirebaseConfigured && adminFirestore) {
        await adminFirestore.collection("users").doc(req.session.user.profile.sub).set({
          writingStyle,
          styleProfile,
          promptStyleInstruction
        }, { merge: true });
      }

      res.json({ success: true, writingStyle, styleProfile, promptStyleInstruction });
    } catch (error: any) {
      console.error("Writing style analysis error:", error);
      res.status(500).json({ error: "Failed to analyze writing style" });
    }
  });

  app.post("/api/posts/generate", async (req: Request, res: Response) => {
    if (!req.session.user) return res.status(401).json({ error: "Unauthorized" });
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });

    const writingStyle = (req.session.user as any).writingStyle || "professional and engaging";

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are an expert LinkedIn content creator. Write a post based on the user's prompt. 
              CRITICAL: You MUST use the following writing style profile:
              
              ${writingStyle}
              
              Keep the post engaging, use appropriate whitespace, and add 2-3 relevant hashtags.`
            },
            { role: "user", content: prompt }
          ],
        }),
      });

      const data = await response.json();
      const text = data.choices[0].message.content;

      res.json({ success: true, text });
    } catch (error: any) {
      console.error("Post generation error:", error);
      res.status(500).json({ error: "Failed to generate post" });
    }
  });

  /**
   * API: Update Profile URL
   * 
   * Updates or clears the user's LinkedIn profile URL in Firestore.
   * 
   * Request body:
   * - profileUrl: The new profile URL (empty string to clear)
   */
  app.patch("/api/user/profile-url", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { profileUrl } = req.body;
    
    if (typeof profileUrl !== "string") {
      return res.status(400).json({ error: "profileUrl must be a string" });
    }

    const userId = req.session.user.profile.sub;

    try {
      const { updateUserProfileUrl, isFirebaseConfigured } = await import("./lib/firebase-admin");
      
      if (isFirebaseConfigured) {
        await updateUserProfileUrl(userId, profileUrl);
        console.log(`Updated profile URL for user ${userId}: ${profileUrl || "(cleared)"}`);
        return res.json({ success: true, profileUrl });
      } else {
        console.warn("Firebase is not configured - profile URL cannot be persisted");
        return res.json({ success: true, profileUrl, warning: "Firebase is not configured - changes will not persist" });
      }
    } catch (error) {
      console.error("Failed to update profile URL:", error);
      return res.status(500).json({ error: "Failed to update profile URL" });
    }
  });

  /**
   * API: Logout
   * 
   * Destroys the user's session, effectively logging them out.
   */
  app.post("/api/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ success: true });
    });
  });

  // ============================================
  // FIREBASE AUTH ENDPOINTS (Email/Google Login)
  // ============================================

  /**
   * API: Verify Firebase Auth Token
   * 
   * Verifies a Firebase ID token from frontend (email/password or Google sign-in)
   * and creates a session for the user.
   */
  /**
   * API: Verify Firebase Auth Token
   */
  app.post("/api/auth/firebase/verify", async (req: Request, res: Response) => {
    try {
      const { idToken } = req.body;
      const { adminAuth, isFirebaseConfigured, saveUser } = await import("./lib/firebase-admin");
      
      if (!isFirebaseConfigured || !adminAuth) {
        return res.status(503).json({ error: "Firebase Auth not configured." });
      }

      if (!idToken) {
        return res.status(400).json({ error: "ID token is required" });
      }

      const decodedToken = await adminAuth.verifyIdToken(idToken);
      const { uid, email, name, picture, email_verified } = decodedToken;

      const profile = {
        sub: `firebase-${uid}`,
        name: name || email?.split('@')[0] || 'User',
        email: email,
        email_verified: email_verified,
        picture: picture,
      };

      req.session.user = {
        profile,
        accessToken: idToken,
        authProvider: "firebase",
      };
      req.session.authType = "firebase";
      req.session.firebaseUid = uid;

      try {
        await saveUser({
          linkedinId: `firebase-${uid}`,
          email: email || "",
          name: name || email?.split('@')[0] || "User",
          profilePicture: picture || null,
          accessToken: idToken,
          tokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        });
      } catch (e) {
        console.warn("Firestore save failed:", e);
      }

      res.json({ success: true, user: { uid, email, name: profile.name, picture, authType: "firebase" } });
    } catch (error: any) {
      console.error("Firebase auth error:", error);
      res.status(401).json({ error: "Invalid token" });
    }
  });
  app.get("/api/auth/status", async (req: Request, res: Response) => {
    const isAuthenticated = !!req.session.user;
    const isLinkedInAuth = isAuthenticated && req.session.authType === "linkedin";
    
    // Check if user has linked LinkedIn (for Firebase users)
    let hasLinkedLinkedIn = false;
    let linkedLinkedInExpired = false;
    let linkedLinkedInInfo: { linkedinId?: string; name?: string; email?: string } | null = null;
    
    // Helper function to check if a date is expired
    const isExpired = (expiresAt: Date | undefined): boolean => {
      if (!expiresAt) return false; // If no expiry, assume valid
      return new Date(expiresAt) < new Date();
    };
    
    if (isAuthenticated && req.session.authType === "firebase") {
      // Check session first
      if (req.session.linkedLinkedIn) {
        // Validate accessToken exists
        if (!req.session.linkedLinkedIn.accessToken || !req.session.linkedLinkedIn.linkedinId) {
          // Token data is incomplete/invalid
          hasLinkedLinkedIn = false;
        } else if (req.session.linkedLinkedIn.expiresAt && isExpired(new Date(req.session.linkedLinkedIn.expiresAt))) {
          // Token is expired
          linkedLinkedInExpired = true;
          hasLinkedLinkedIn = false;
        } else {
          hasLinkedLinkedIn = true;
          linkedLinkedInInfo = {
            linkedinId: req.session.linkedLinkedIn.linkedinId,
            name: req.session.linkedLinkedIn.name,
            email: req.session.linkedLinkedIn.email,
          };
        }
      } else {
        // Check Firestore for stored LinkedIn connection
        try {
          const { getLinkedLinkedIn, isFirebaseConfigured } = await import("./lib/firebase-admin");
          if (isFirebaseConfigured && req.session.user) {
            const linkedLinkedIn = await getLinkedLinkedIn(req.session.user.profile.sub);
            if (linkedLinkedIn) {
              // Validate accessToken exists
              if (!linkedLinkedIn.accessToken || !linkedLinkedIn.linkedinId) {
                // Token data is incomplete/invalid - treat as not connected
                hasLinkedLinkedIn = false;
              } else if (linkedLinkedIn.expiresAt && isExpired(new Date(linkedLinkedIn.expiresAt))) {
                // Token is expired
                linkedLinkedInExpired = true;
                hasLinkedLinkedIn = false;
              } else {
                hasLinkedLinkedIn = true;
                linkedLinkedInInfo = {
                  linkedinId: linkedLinkedIn.linkedinId,
                  name: linkedLinkedIn.name,
                  email: linkedLinkedIn.email,
                };
                // Also restore to session for faster access next time
                req.session.linkedLinkedIn = {
                  accessToken: linkedLinkedIn.accessToken,
                  linkedinId: linkedLinkedIn.linkedinId,
                  name: linkedLinkedIn.name,
                  email: linkedLinkedIn.email,
                  picture: linkedLinkedIn.picture,
                  linkedAt: new Date(),
                  expiresAt: linkedLinkedIn.expiresAt,
                };
              }
            }
          }
        } catch (error) {
          console.warn("Failed to check linked LinkedIn:", error);
        }
      }
    }
    
    // Has LinkedIn auth if logged in with LinkedIn OR has linked (non-expired) LinkedIn
    const hasLinkedInAuth = isLinkedInAuth || hasLinkedLinkedIn;
    
    res.json({
      authenticated: isAuthenticated,
      authType: req.session.authType || null,
      hasLinkedInAuth,
      hasLinkedLinkedIn, // Separate flag for linked integration
      linkedLinkedInExpired, // Flag indicating if the linked LinkedIn token is expired
      linkedLinkedInInfo, // Info about linked LinkedIn (if any)
      canDownload: isAuthenticated,
      canPostToLinkedIn: hasLinkedInAuth,
      loginRequired: {
        download: !isAuthenticated,
        linkedinPost: !hasLinkedInAuth
      }
    });
  });

  // ============================================
  // CAROUSEL MIGRATION ENDPOINT
  // ============================================

  /**
   * API: Migrate Guest Carousels
   * Allows authenticated users to claim their guest carousels by providing a guest ID
   */
  app.post("/api/carousels/migrate-guest", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { guestId } = req.body;
      
      if (!guestId) {
        return res.status(400).json({ error: "Guest ID is required" });
      }

      const { migrateGuestCarousels, isFirebaseConfigured } = await import("./lib/firebase-admin");
      
      if (!isFirebaseConfigured) {
        return res.status(503).json({ error: "Firebase not configured" });
      }

      const userId = req.session.user.profile.sub;
      const migratedCount = await migrateGuestCarousels(guestId, userId);

      res.json({ 
        success: true, 
        migratedCount,
        message: migratedCount > 0 
          ? `Successfully migrated ${migratedCount} carousel(s) to your account` 
          : "No guest carousels found with that ID"
      });
    } catch (error: any) {
      console.error("Migrate guest carousels error:", error);
      res.status(500).json({ error: error.message || "Failed to migrate carousels" });
    }
  });

  /**
   * API: Save Slide Base64 Image
   * Saves a generated base64 image to a specific slide (requires authentication)
   */
  app.post("/api/carousel/:carouselId/slide/:slideNumber/image", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { carouselId, slideNumber } = req.params;
      const { base64Image } = req.body;
      
      if (!base64Image) {
        return res.status(400).json({ error: "Base64 image is required" });
      }

      const { getCarousel, updateCarouselSlide, isFirebaseConfigured } = await import("./lib/firebase-admin");
      
      if (!isFirebaseConfigured) {
        return res.json({ success: true, message: "Local storage only" });
      }

      const carousel = await getCarousel(carouselId);
      
      if (!carousel) {
        return res.status(404).json({ error: "Carousel not found" });
      }

      // Check ownership
      if (carousel.userId !== req.session.user.profile.sub) {
        return res.status(403).json({ error: "Access denied" });
      }

      await updateCarouselSlide(carouselId, parseInt(slideNumber), { base64Image });

      res.json({ success: true, message: "Image saved" });
    } catch (error: any) {
      console.error("Save slide image error:", error);
      res.status(500).json({ error: error.message || "Failed to save image" });
    }
  });

  /**
   * API: Check Existing Slide Images
   * Returns existing base64 images from Firestore for a carousel (requires authentication)
   */
  app.get("/api/carousel/:carouselId/images", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { carouselId } = req.params;
      
      const { getCarousel, isFirebaseConfigured } = await import("./lib/firebase-admin");
      
      if (!isFirebaseConfigured) {
        return res.json({ 
          success: true, 
          images: [],
          message: "Firebase not configured - no images stored" 
        });
      }

      const carousel = await getCarousel(carouselId);
      
      if (!carousel) {
        return res.status(404).json({ error: "Carousel not found" });
      }

      // Check ownership
      if (carousel.userId !== req.session.user.profile.sub) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Check if caller wants full base64 data (default: only metadata)
      const includeBase64 = req.query.includeBase64 === "true";

      // Extract existing images from slides (optionally include base64 data)
      const images = carousel.slides.map(slide => ({
        number: slide.number,
        hasImage: !!slide.base64Image,
        base64Image: includeBase64 ? (slide.base64Image || "") : undefined,
        finalText: slide.finalText,
      }));

      res.json({ 
        success: true, 
        carouselId,
        pdfBase64: includeBase64 ? (carousel.pdfBase64 || "") : undefined,
        hasPdf: !!carousel.pdfBase64,
        images 
      });
    } catch (error: any) {
      console.error("Get carousel images error:", error);
      res.status(500).json({ error: error.message || "Failed to get carousel images" });
    }
  });

  /**
   * API: Check if Slide Needs Regeneration
   * Compares current slide text with stored text to determine if image needs regeneration (requires authentication)
   */
  app.post("/api/carousel/:carouselId/check-regeneration", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { carouselId } = req.params;
      const { slides } = req.body;
      
      if (!slides || !Array.isArray(slides)) {
        return res.status(400).json({ error: "Slides array is required" });
      }

      const { getCarousel, isFirebaseConfigured } = await import("./lib/firebase-admin");
      
      if (!isFirebaseConfigured) {
        // No Firestore - all slides need generation
        return res.json({ 
          success: true, 
          needsRegeneration: slides.map((s: any) => ({
            number: s.number,
            needsRegeneration: true,
            reason: "No stored data"
          }))
        });
      }

      const carousel = await getCarousel(carouselId);
      
      if (!carousel) {
        // No carousel found - all slides need generation
        return res.json({ 
          success: true, 
          needsRegeneration: slides.map((s: any) => ({
            number: s.number,
            needsRegeneration: true,
            reason: "Carousel not found"
          }))
        });
      }

      // Check ownership
      if (carousel.userId !== req.session.user.profile.sub) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Compare each slide's text with stored text
      const regenerationStatus = slides.map((inputSlide: any) => {
        const storedSlide = carousel.slides.find(s => s.number === inputSlide.number);
        
        if (!storedSlide) {
          return {
            number: inputSlide.number,
            needsRegeneration: true,
            reason: "New slide"
          };
        }

        if (!storedSlide.base64Image) {
          return {
            number: inputSlide.number,
            needsRegeneration: true,
            reason: "No image stored"
          };
        }

        // Normalize text for comparison (trim and collapse whitespace)
        const normalizeText = (text: string) => (text || "").trim().replace(/\s+/g, " ");
        const storedText = normalizeText(storedSlide.finalText);
        const inputText = normalizeText(inputSlide.finalText);

        // Check if text has changed (using normalized comparison)
        if (storedText !== inputText) {
          return {
            number: inputSlide.number,
            needsRegeneration: true,
            reason: "Text changed",
            existingImage: storedSlide.base64Image
          };
        }

        // Check if text is empty - don't return stale image for empty text
        if (!inputText) {
          return {
            number: inputSlide.number,
            needsRegeneration: true,
            reason: "Empty text"
          };
        }

        // Text is same and image exists - no regeneration needed
        return {
          number: inputSlide.number,
          needsRegeneration: false,
          base64Image: storedSlide.base64Image
        };
      });

      res.json({ 
        success: true, 
        needsRegeneration: regenerationStatus,
        pdfBase64: carousel.pdfBase64 || ""
      });
    } catch (error: any) {
      console.error("Check regeneration error:", error);
      res.status(500).json({ error: error.message || "Failed to check regeneration" });
    }
  });

  /**
   * API: Share Post on LinkedIn
   * 
   * Creates a text post (with optional media) on the authenticated user's LinkedIn profile.
   * 
   * LinkedIn Share API (v2/ugcPosts):
   * - Requires w_member_social scope
   * - Supports text, images, and videos
   * - Uses UGC (User Generated Content) API format
   * 
   * Request body:
   * - text: The content of the post (1-3000 characters)
   * - media: Optional array of media objects (images/videos) with base64 data
   */
  app.post("/api/share", async (req: Request, res: Response) => {
    // Verify user is authenticated
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      // Validate request body
      const { text, media } = createPostSchema.parse(req.body);
      
      /**
       * Get LinkedIn credentials - either from direct LinkedIn login or linked LinkedIn
       * Priority:
       * 1. If logged in with LinkedIn directly, use session tokens
       * 2. If logged in with Firebase, use linked LinkedIn tokens
       */
      let accessToken: string;
      let linkedinPersonId: string;
      
      if (req.session.authType === "linkedin") {
        // Direct LinkedIn login
        accessToken = req.session.user.accessToken;
        linkedinPersonId = req.session.user.profile.sub;
      } else if (req.session.authType === "firebase") {
        // Firebase login - check for linked LinkedIn
        const linkedLinkedIn = req.session.linkedLinkedIn || req.session.user.linkedLinkedIn;
        
        if (!linkedLinkedIn) {
          // Try to fetch from Firestore
          try {
            const { getLinkedLinkedIn, isFirebaseConfigured } = await import("./lib/firebase-admin");
            if (isFirebaseConfigured) {
              const storedLinkedIn = await getLinkedLinkedIn(req.session.user.profile.sub);
              if (storedLinkedIn) {
                accessToken = storedLinkedIn.accessToken;
                linkedinPersonId = storedLinkedIn.linkedinId;
                // Cache in session
                req.session.linkedLinkedIn = {
                  accessToken: storedLinkedIn.accessToken,
                  linkedinId: storedLinkedIn.linkedinId,
                  name: storedLinkedIn.name,
                  email: storedLinkedIn.email,
                  picture: storedLinkedIn.picture,
                  linkedAt: new Date(),
                  expiresAt: storedLinkedIn.expiresAt,
                };
              } else {
                return res.status(403).json({ 
                  error: "LinkedIn not connected",
                  message: "Please connect your LinkedIn account to publish posts.",
                  action: "connect_linkedin"
                });
              }
            } else {
              return res.status(403).json({ 
                error: "LinkedIn not connected",
                message: "Please connect your LinkedIn account to publish posts.",
                action: "connect_linkedin"
              });
            }
          } catch (error) {
            console.error("Error fetching linked LinkedIn:", error);
            return res.status(403).json({ 
              error: "LinkedIn not connected",
              message: "Please connect your LinkedIn account to publish posts.",
              action: "connect_linkedin"
            });
          }
        } else {
          accessToken = linkedLinkedIn.accessToken;
          linkedinPersonId = linkedLinkedIn.linkedinId;
        }
      } else {
        return res.status(403).json({ 
          error: "LinkedIn not connected",
          message: "Please connect your LinkedIn account to publish posts.",
          action: "connect_linkedin"
        });
      }

      /**
       * Extract LinkedIn Person ID for the author URN
       */
      const personId = linkedinPersonId.replace(/^linkedin-person-/, '');
      const authorUrn = `urn:li:person:${personId}`;

      // Extract locale data - use default since we may not have full profile from linked account
      let localeData: { country: string; language: string };
      const profile = req.session.user.profile;
      if (profile && typeof profile.locale === 'object' && profile.locale !== null) {
        localeData = {
          country: profile.locale.country || "US",
          language: profile.locale.language || "en",
        };
      } else if (typeof profile.locale === 'string') {
        const parts = profile.locale.split('_');
        localeData = {
          country: parts[1] || "US",
          language: parts[0] || "en",
        };
      } else {
        localeData = { country: "US", language: "en" };
      }

      // Process media uploads if provided
      let mediaAssets: any[] = [];
      let mediaCategory = "NONE";
      let uploadErrors: string[] = [];
      let successfulUploads: string[] = [];

      if (media && media.length > 0) {
        // Check for videos - currently not fully supported
        const hasVideo = media.some(m => m.type === "VIDEO");
        if (hasVideo) {
          return res.status(400).json({ 
            error: "Video uploads are currently not supported. LinkedIn video uploads require complex multi-part chunked uploads and transcoding. Please use images for now."
          });
        }
        
        mediaCategory = "IMAGE";

        for (const mediaFile of media) {
          try {
            if (mediaFile.type !== "IMAGE") {
              uploadErrors.push(`Unsupported media type: ${mediaFile.type}`);
              continue;
            }

            // Convert base64 to buffer and determine content type
            const base64Data = mediaFile.url.split(',')[1];
            if (!base64Data) {
              uploadErrors.push(`Invalid base64 data for ${mediaFile.filename}`);
              continue;
            }
            
            // Extract MIME type from data URL
            const mimeMatch = mediaFile.url.match(/^data:(image\/[a-z]+);base64,/);
            const contentType = mimeMatch ? mimeMatch[1] : "image/jpeg"; // Default to JPEG
            
            const buffer = Buffer.from(base64Data, 'base64');
            
            // Register upload with LinkedIn
            const registerPayload = {
              registerUploadRequest: {
                recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
                owner: authorUrn,
                serviceRelationships: [{
                  relationshipType: "OWNER",
                  identifier: "urn:li:userGeneratedContent"
                }]
              }
            };

            const registerResponse = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(registerPayload),
            });

            if (!registerResponse.ok) {
              const errorText = await registerResponse.text();
              console.error("Media registration failed:", errorText);
              uploadErrors.push(`${mediaFile.filename}: Failed to register`);
              continue;
            }

            const registerData = await registerResponse.json();
            const uploadUrl = registerData.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;
            const asset = registerData.value.asset;

            // Upload binary data with correct Content-Type
            const uploadResponse = await fetch(uploadUrl, {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": contentType,
              },
              body: buffer,
            });

            if (!uploadResponse.ok) {
              const errorText = await uploadResponse.text();
              console.error("Binary upload failed:", errorText);
              uploadErrors.push(`${mediaFile.filename}: Failed to upload`);
              continue;
            }

            // Poll asset status until READY (required by LinkedIn)
            const assetId = asset.split(':').pop(); // Extract ID from URN
            let assetReady = false;
            let pollAttempts = 0;
            const maxPolls = 10;
            
            while (!assetReady && pollAttempts < maxPolls) {
              await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
              
              try {
                const statusResponse = await fetch(`https://api.linkedin.com/v2/assets/${asset}`, {
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                  },
                });

                if (statusResponse.ok) {
                  const statusData = await statusResponse.json();
                  if (statusData.status === "READY" || statusData.status === "AVAILABLE") {
                    assetReady = true;
                  }
                }
              } catch (pollError) {
                console.warn("Asset status poll error:", pollError);
              }
              
              pollAttempts++;
            }

            if (!assetReady) {
              console.warn(`Asset ${asset} did not become READY after ${maxPolls} attempts, continuing anyway`);
            }

            // Build media descriptor according to LinkedIn specs
            const mediaDescriptor: any = {
              status: "READY",
              media: asset,
              title: {
                text: mediaFile.filename.replace(/\.[^/.]+$/, ""), // Use filename without extension
                locale: localeData,
              },
            };

            mediaAssets.push(mediaDescriptor);
            successfulUploads.push(mediaFile.filename);
          } catch (mediaError: any) {
            console.error("Media upload error:", mediaError);
            uploadErrors.push(`${mediaFile.filename}: ${mediaError.message}`);
          }
        }

        // If all media failed to upload, fail the entire request
        if (mediaAssets.length === 0 && media.length > 0) {
          return res.status(500).json({ 
            error: "All media uploads failed",
            details: uploadErrors,
            failed: media.map(m => m.filename)
          });
        }

        // If some uploads failed, include details in response
        if (uploadErrors.length > 0) {
          console.warn("Some media uploads failed:", uploadErrors);
        }
      }

      // Build post payload
      const shareContent: any = {
        shareCommentary: {
          text: text,
          locale: localeData,
        },
        shareMediaCategory: mediaCategory,
      };

      // Add media if successfully uploaded
      if (mediaAssets.length > 0) {
        shareContent.media = mediaAssets;
      }

      const postPayload = {
        author: authorUrn,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": shareContent,
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
        },
      };

      // Make POST request to LinkedIn's share API
      const shareResponse = await fetch(LINKEDIN_SHARE_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify(postPayload),
      });

      if (!shareResponse.ok) {
        const errorText = await shareResponse.text();
        console.error("Share post failed:", errorText);
        return res.status(shareResponse.status).json({ 
          error: "Failed to share post on LinkedIn",
          details: errorText
        });
      }

      const shareData = await shareResponse.json();
      
      const responseData: any = { 
        success: true, 
        postId: shareData.id,
        message: "Post shared successfully on LinkedIn" + (mediaAssets.length > 0 ? ` with ${mediaAssets.length} image(s)` : "")
      };

      // Include upload details if there were any issues
      if (uploadErrors.length > 0) {
        responseData.partialSuccess = true;
        responseData.uploadedFiles = successfulUploads;
        responseData.failedFiles = uploadErrors;
        responseData.message += `. Warning: ${uploadErrors.length} file(s) failed to upload.`;
      }

      res.json(responseData);
    } catch (error: any) {
      console.error("Share post error:", error);
      res.status(500).json({ 
        error: error.message || "Failed to share post" 
      });
    }
  });

  /**
   * API: List LinkedIn Posts
   * 
   * Fetches the authenticated user's LinkedIn posts using the /rest/posts API.
   * Returns posts with basic information (content, timestamp, URN).
   */
  app.get("/api/posts", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { accessToken, profile } = req.session.user;
      const personId = profile.sub.replace(/^linkedin-person-/, '');
      const authorUrn = `urn:li:person:${personId}`;

      // Fetch posts from LinkedIn /rest/posts API
      const postsResponse = await fetch(
        `${LINKEDIN_POSTS_URL}?author=${encodeURIComponent(authorUrn)}&q=author&count=50&sortBy=LAST_MODIFIED`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Linkedin-Version": "202501",
            "X-Restli-Protocol-Version": "2.0.0",
            "X-RestLi-Method": "FINDER",
          },
        }
      );

      if (!postsResponse.ok) {
        const errorText = await postsResponse.text();
        console.error("Failed to fetch posts:", errorText);
        return res.status(postsResponse.status).json({ 
          error: "Failed to fetch posts from LinkedIn",
          details: errorText 
        });
      }

      const postsData = await postsResponse.json();
      res.json(postsData.elements || []);
    } catch (error: any) {
      console.error("Get posts error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch posts" });
    }
  });

  /**
   * API: Get Post Analytics
   * 
   * Fetches engagement metrics (likes, comments) for a specific LinkedIn post.
   * Note: LinkedIn API only provides likes and comments for personal posts.
   * Full analytics (impressions, clicks) only available for company pages.
   */
  app.get("/api/posts/:postId/analytics", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { accessToken } = req.session.user;
      const { postId } = req.params;

      // Fetch analytics from LinkedIn /v2/socialActions API
      const analyticsResponse = await fetch(
        `${LINKEDIN_SOCIAL_ACTIONS_URL}/${encodeURIComponent(postId)}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "X-Restli-Protocol-Version": "2.0.0",
          },
        }
      );

      if (!analyticsResponse.ok) {
        const errorText = await analyticsResponse.text();
        console.error("Failed to fetch analytics:", errorText);
        return res.status(analyticsResponse.status).json({ 
          error: "Failed to fetch post analytics",
          details: errorText 
        });
      }

      const analyticsData = await analyticsResponse.json();
      res.json({
        postId,
        ...analyticsData,
      });
    } catch (error: any) {
      console.error("Get analytics error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch analytics" });
    }
  });

  /**
   * API: Fetch LinkedIn Posts via Apify Task
   * 
   * Uses the configured Apify Task to fetch LinkedIn posts with engagement data.
   * Requires APIFY_TOKEN and APIFY_TASK_ID to be configured.
   * 
   * Request body (optional):
   * - userId: string - The user's LinkedIn ID (for caching)
   * - profileUrl: string - The user's LinkedIn profile URL
   * - forceRefresh: boolean - If true, bypasses cache and fetches fresh data
   * 
   * Returns posts with author info, stats, and images in LinkedIn-compatible format.
   * Posts are cached in Firestore for 24 hours to reduce Apify calls.
   */
  app.post("/api/posts/fetch", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const APIFY_TOKEN = process.env.APIFY_TOKEN;
    const APIFY_TASK_ID = process.env.APIFY_TASK_ID;

    if (!APIFY_TOKEN || !APIFY_TASK_ID) {
      return res.status(503).json({ 
        error: "Apify integration not configured",
        message: "Please configure APIFY_TOKEN and APIFY_TASK_ID in your environment secrets"
      });
    }

    // Extract optional profileUrl, userId, and forceRefresh from request body
    const { userId, profileUrl, forceRefresh = false } = req.body || {};
    
    // If profileUrl is provided, try to save it to Firestore for the user
    if (userId && profileUrl) {
      try {
        const { updateUserProfileUrl, isFirebaseConfigured } = await import("./lib/firebase-admin");
        console.log(`Firebase configured: ${isFirebaseConfigured}, attempting to save profileUrl for user: ${userId}`);
        if (isFirebaseConfigured) {
          await updateUserProfileUrl(userId, profileUrl);
          console.log(`Successfully saved profile URL for user ${userId}: ${profileUrl}`);
        } else {
          console.warn("Firebase is not configured - profile URL will not be persisted");
        }
      } catch (firestoreError) {
        console.error("Failed to save profile URL to Firestore:", firestoreError);
        // Continue even if Firestore save fails
      }
    } else {
      console.log(`Skipping profile URL save - userId: ${userId}, profileUrl: ${profileUrl ? 'provided' : 'missing'}`);
    }

    // Check cache first (if Firebase is configured and not force refreshing)
    if (userId && !forceRefresh) {
      try {
        const { getCachedPosts, isFirebaseConfigured } = await import("./lib/firebase-admin");
        if (isFirebaseConfigured) {
          const cachedPosts = await getCachedPosts(userId);
          if (cachedPosts && cachedPosts.length > 0) {
            console.log(`Returning ${cachedPosts.length} cached posts for user ${userId}`);
            return res.json({
              success: true,
              posts: cachedPosts,
              cached: true,
              message: "Posts loaded from cache. Use forceRefresh=true to fetch fresh data."
            });
          }
        }
      } catch (cacheError) {
        console.warn("Failed to check cache:", cacheError);
        // Continue to fetch from Apify
      }
    }

    try {
      console.log(`Running Apify task: ${APIFY_TASK_ID}${profileUrl ? ` for profile: ${profileUrl}` : ''}`);
      
      // Build input override if profileUrl is provided
      // The apimaestro/linkedin-profile-posts actor expects "username" field
      // which accepts either a username (e.g., 'satyanadella') or a full URL
      // (e.g., 'linkedin.com/in/satyanadella')
      const inputOverride = profileUrl ? {
        username: profileUrl,
      } : undefined;
      
      if (inputOverride) {
        console.log("Apify input override:", JSON.stringify(inputOverride));
      }
      
      // Run the pre-configured Apify Task with optional input override
      const apifyResponse = await fetch(
        `https://api.apify.com/v2/actor-tasks/${APIFY_TASK_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: inputOverride ? JSON.stringify(inputOverride) : undefined,
        }
      );

      if (!apifyResponse.ok) {
        const errorText = await apifyResponse.text();
        console.error("Apify request failed:", errorText);
        
        let errorMessage = "Failed to fetch posts from Apify";
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error?.message) {
            errorMessage = errorData.error.message;
          }
        } catch (e) {}
        
        return res.status(apifyResponse.status).json({ 
          error: errorMessage,
          details: errorText 
        });
      }

      const apifyData = await apifyResponse.json();
      
      console.log(`Received ${apifyData?.length || 0} posts from Apify`);
      
      // Sanity check: if we provided a profileUrl but got zero posts, 
      // the input override might not match the actor's expected schema
      if (profileUrl && (!apifyData || apifyData.length === 0)) {
        console.warn(`Warning: Zero posts returned despite providing profileUrl: ${profileUrl}`);
        console.warn("This may indicate the Apify task input format doesn't match the override.");
        console.warn("Check your Apify task configuration to ensure it accepts the 'username' input field.");
        
        // Return an actionable error to the user
        return res.status(200).json({
          success: true,
          posts: [],
          warning: "No posts found for the provided profile URL. This could mean: (1) the profile has no public posts, (2) the profile URL is incorrect, or (3) the Apify task configuration may need to be updated to use the provided URL. Please verify the profile URL and try again."
        });
      }
      
      // Normalize each post to match actual Apify response structure
      const normalizedPosts = (apifyData || []).map((post: any) => {
        // Build proper URN for LinkedIn API if available
        const activityUrn = post.urn?.activity_urn;
        const shareUrn = post.urn?.share_urn;
        const ugcPostUrn = post.urn?.ugcPost_urn;
        
        // LinkedIn repost API needs a proper URN format
        // Priority: ugcPost > share > activity
        const linkedInUrn = ugcPostUrn 
          ? `urn:li:ugcPost:${ugcPostUrn}` 
          : shareUrn 
            ? `urn:li:share:${shareUrn}`
            : activityUrn 
              ? `urn:li:activity:${activityUrn}`
              : null;
        
        return {
        id: linkedInUrn || post.url || Math.random().toString(36),
        urn: linkedInUrn,
        text: post.text || "",
        url: post.url || "",
        postType: post.post_type || "post",
        postedAt: post.posted_at?.timestamp 
          ? post.posted_at.timestamp
          : post.posted_at?.date 
            ? new Date(post.posted_at.date).getTime()
            : Date.now(),
        postedAtRelative: post.posted_at?.relative || "",
        // Author information
        author: post.author ? {
          firstName: post.author.first_name || "",
          lastName: post.author.last_name || "",
          fullName: `${post.author.first_name || ""} ${post.author.last_name || ""}`.trim(),
          headline: post.author.headline || "",
          username: post.author.username || "",
          profileUrl: post.author.profile_url || "",
          profilePicture: post.author.profile_picture || null,
        } : null,
        // Stats/engagement
        stats: post.stats ? {
          totalReactions: post.stats.total_reactions || 0,
          likes: post.stats.like || 0,
          support: post.stats.support || 0,
          love: post.stats.love || 0,
          insight: post.stats.insight || 0,
          celebrate: post.stats.celebrate || 0,
          funny: post.stats.funny || 0,
          comments: post.stats.comments || 0,
          reposts: post.stats.reposts || 0,
        } : {
          totalReactions: 0,
          likes: 0,
          support: 0,
          love: 0,
          insight: 0,
          celebrate: 0,
          funny: 0,
          comments: 0,
          reposts: 0,
        },
        // Images/media
        images: post.images || post.media || [],
        // Reshared post info
        resharedPost: post.reshared_post ? {
          text: post.reshared_post.text || "",
          postedAt: post.reshared_post.posted_at?.timestamp || null,
          author: post.reshared_post.author ? {
            firstName: post.reshared_post.author.first_name || "",
            lastName: post.reshared_post.author.last_name || "",
            fullName: `${post.reshared_post.author.first_name || ""} ${post.reshared_post.author.last_name || ""}`.trim(),
            headline: post.reshared_post.author.headline || "",
            profilePicture: post.reshared_post.author.profile_picture || null,
          } : null,
        } : null,
      };
      });

      // Save posts to cache if Firebase is configured
      if (userId && normalizedPosts.length > 0) {
        try {
          const { saveCachedPosts, isFirebaseConfigured } = await import("./lib/firebase-admin");
          if (isFirebaseConfigured) {
            await saveCachedPosts(userId, normalizedPosts);
          }
        } catch (cacheError) {
          console.warn("Failed to cache posts:", cacheError);
          // Continue even if caching fails
        }
      }

      res.json({
        success: true,
        posts: normalizedPosts,
        cached: false,
      });
    } catch (error: any) {
      console.error("Apify fetch error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch posts via Apify" });
    }
  });

  /**
   * API: Clear posts cache (force refresh on next fetch)
   * 
   * Clears the cached posts for the current user.
   */
  app.post("/api/posts/clear-cache", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { clearCachedPosts, isFirebaseConfigured } = await import("./lib/firebase-admin");
      const userId = req.session.user.profile.sub;
      
      if (!isFirebaseConfigured) {
        return res.json({ success: true, message: "Cache not available (Firebase not configured)" });
      }
      
      await clearCachedPosts(userId);
      res.json({ success: true, message: "Posts cache cleared successfully" });
    } catch (error: any) {
      console.error("Clear cache error:", error);
      res.status(500).json({ error: error.message || "Failed to clear cache" });
    }
  });

  /**
   * API: Repost (Reshare) a LinkedIn Post
   * 
   * Creates a reshare of an existing LinkedIn post.
   * Can optionally add commentary to the repost.
   * Requires LinkedIn-Version: 202209 or higher.
   */
  app.post("/api/posts/:postId/repost", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { postId } = req.params;
      const { commentary } = repostSchema.parse({ postId, ...req.body });
      const { accessToken, profile } = req.session.user;
      const personId = profile.sub.replace(/^linkedin-person-/, '');
      const authorUrn = `urn:li:person:${personId}`;

      // Build reshare payload
      const resharePayload = {
        author: authorUrn,
        commentary: commentary || "",
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
        reshareContext: {
          parent: postId,
        },
      };

      // Create reshare via LinkedIn API
      const reshareResponse = await fetch(LINKEDIN_POSTS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Linkedin-Version": "202501",
          "X-Restli-Protocol-Version": "2.0.0",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(resharePayload),
      });

      if (!reshareResponse.ok) {
        const errorText = await reshareResponse.text();
        console.error("Reshare failed:", errorText);
        return res.status(reshareResponse.status).json({ 
          error: "Failed to repost on LinkedIn",
          details: errorText 
        });
      }

      // Get the new post URN from response header
      const newPostUrn = reshareResponse.headers.get("x-restli-id");
      res.json({ 
        success: true, 
        postId: newPostUrn,
        message: "Post reshared successfully" 
      });
    } catch (error: any) {
      console.error("Repost error:", error);
      res.status(500).json({ error: error.message || "Failed to repost" });
    }
  });

  /**
   * API: Schedule a Post
   * 
   * Stores a post in the database to be published at a future date/time.
   * A background job will check the database and post when the time arrives.
   */
  app.post("/api/posts/schedule", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { content, scheduledTime } = createScheduledPostSchema.parse(req.body);
      const { profile } = req.session.user;
      const personId = profile.sub.replace(/^linkedin-person-/, '');

      // Verify scheduled time is in the future
      const scheduledDate = new Date(scheduledTime);
      if (scheduledDate <= new Date()) {
        return res.status(400).json({ 
          error: "Scheduled time must be in the future" 
        });
      }

      // Insert into database
      const [scheduledPost] = await getDb().insert(scheduledPosts).values({
        userId: personId,
        content,
        scheduledTime: scheduledDate,
        status: "pending",
      }).returning();

      res.json({ 
        success: true, 
        scheduledPost,
        message: "Post scheduled successfully" 
      });
    } catch (error: any) {
      console.error("Schedule post error:", error);
      if (error.message?.includes("DATABASE_URL not configured")) {
        return res.status(503).json({ 
          error: "Scheduled posts feature is currently unavailable. Database not configured." 
        });
      }
      res.status(500).json({ error: error.message || "Failed to schedule post" });
    }
  });

  /**
   * API: Get Scheduled Posts
   * 
   * Returns all scheduled posts for the authenticated user.
   * Includes pending, posted, and failed posts.
   */
  app.get("/api/posts/scheduled", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { profile } = req.session.user;
      const personId = profile.sub.replace(/^linkedin-person-/, '');

      // Fetch all scheduled posts for this user
      const userScheduledPosts = await getDb()
        .select()
        .from(scheduledPosts)
        .where(eq(scheduledPosts.userId, personId))
        .orderBy(scheduledPosts.scheduledTime);

      res.json(userScheduledPosts);
    } catch (error: any) {
      console.error("Get scheduled posts error:", error);
      if (error.message?.includes("DATABASE_URL not configured")) {
        return res.status(503).json({ 
          error: "Scheduled posts feature is currently unavailable. Database not configured." 
        });
      }
      res.status(500).json({ error: error.message || "Failed to fetch scheduled posts" });
    }
  });

  /**
   * API: Delete Scheduled Post
   * 
   * Deletes a pending scheduled post before it's published.
   */
  app.delete("/api/posts/scheduled/:id", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { id } = req.params;
      const { profile } = req.session.user;
      const personId = profile.sub.replace(/^linkedin-person-/, '');

      // Delete only if owned by this user and still pending
      const result = await getDb()
        .delete(scheduledPosts)
        .where(
          and(
            eq(scheduledPosts.id, id),
            eq(scheduledPosts.userId, personId),
            eq(scheduledPosts.status, "pending")
          )
        )
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ 
          error: "Scheduled post not found or already posted" 
        });
      }

      res.json({ success: true, message: "Scheduled post deleted" });
    } catch (error: any) {
      console.error("Delete scheduled post error:", error);
      if (error.message?.includes("DATABASE_URL not configured")) {
        return res.status(503).json({ 
          error: "Scheduled posts feature is currently unavailable. Database not configured." 
        });
      }
      res.status(500).json({ error: error.message || "Failed to delete scheduled post" });
    }
  });

  /**
   * API: Generate AI Images
   * 
   * Generates images using OpenAI's DALL-E, Google's Gemini, or Stability AI based on slide content.
   * Each slide becomes an image in the carousel, with context-aware prompts.
   * Provider can be "openai", "gemini", or "stability" (auto selects first available)
   * Requires authentication
   */
  app.post("/api/images/generate", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      // Support new format (slides array with context) and legacy format (messages array)
      const { slides, messages, title = "", carouselType = "", provider = "auto", aiProvider } = req.body;
      
      // Normalize input - convert slides array or messages array to unified format
      let slideData: Array<{ text: string; isHook: boolean; isCta: boolean }>;
      
      if (slides && Array.isArray(slides) && slides.length > 0) {
        slideData = slides.map((s: any, idx: number) => ({
          text: (s.text || s).toString().trim(),
          isHook: s.isHook ?? idx === 0,
          isCta: s.isCta ?? idx === slides.length - 1,
        }));
      } else if (messages && Array.isArray(messages) && messages.length > 0) {
        // Legacy format - convert messages to slides
        slideData = messages.map((msg: string, idx: number) => ({
          text: (msg || "").trim(),
          isHook: idx === 0,
          isCta: idx === messages.length - 1,
        }));
      } else {
        return res.status(400).json({ error: "Slides or messages array is required" });
      }

      if (slideData.length > 10) {
        return res.status(400).json({ error: "Maximum 10 slides allowed" });
      }

      const geminiApiKey = process.env.GEMINI_API_KEY;
      const openaiApiKey = process.env.OPENAI_API_KEY;
      const stabilityApiKey = process.env.STABILITY_API_KEY;

      // STRICT provider selection - no auto-fallback
      // User must explicitly select a provider
      const selectedProvider = aiProvider || provider;

      if (!selectedProvider || selectedProvider === "auto") {
        return res.status(400).json({ 
          error: "Please select an AI provider (gemini, stability, or openai). Auto-selection is disabled." 
        });
      }

      // Check if the selected provider's API key is configured
      if (selectedProvider === "gemini" && !geminiApiKey) {
        return res.status(503).json({ 
          error: "Gemini API key not configured. Please add GEMINI_API_KEY to your secrets." 
        });
      }
      if (selectedProvider === "openai" && !openaiApiKey) {
        return res.status(503).json({ 
          error: "OpenAI API key not configured. Please add OPENAI_API_KEY to your secrets." 
        });
      }
      if (selectedProvider === "stability" && !stabilityApiKey) {
        return res.status(503).json({ 
          error: "Stability API key not configured. Please add STABILITY_API_KEY to your secrets." 
        });
      }

      // Use slide text directly as the image prompt - no additional context or templates
      const getSlidePrompt = (slide: { text: string; isHook: boolean; isCta: boolean }): string => {
        return slide.text;
      };

      const imageUrls: string[] = [];
      const errors: string[] = [];

      if (selectedProvider === "gemini") {
        for (let i = 0; i < slideData.length; i++) {
          try {
            const prompt = getSlidePrompt(slideData[i]);
            
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${geminiApiKey}`;
            
            const response = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{
                  parts: [{ text: prompt }]
                }],
                generationConfig: {
                  responseModalities: ["TEXT", "IMAGE"]
                }
              }),
            });

            const json = await response.json() as any;

            if (json.error) {
              console.error(`Gemini API error for slide ${i + 1}:`, json.error);
              errors.push(`Slide ${i + 1}: ${json.error.message || 'API error'}`);
              continue;
            }

            const candidate = json.candidates?.[0];
            if (!candidate) {
              errors.push(`Slide ${i + 1}: No response from Gemini`);
              continue;
            }

            const imagePart = candidate.content?.parts?.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));
            if (imagePart?.inlineData?.data) {
              const mimeType = imagePart.inlineData.mimeType || 'image/png';
              const base64Image = `data:${mimeType};base64,${imagePart.inlineData.data}`;
              imageUrls.push(base64Image);
            } else {
              errors.push(`Slide ${i + 1}: No image in response`);
            }
          } catch (imgError: any) {
            console.error(`Gemini image generation failed for slide ${i + 1}:`, imgError);
            errors.push(`Slide ${i + 1}: ${imgError.message}`);
          }
        }
      } else if (selectedProvider === "stability") {
        for (let i = 0; i < slideData.length; i++) {
          try {
            const slide = slideData[i];
            // Use slide text directly as the prompt
            const prompt = slide.text;
            
            const formData = new FormData();
            formData.append("prompt", prompt);
            formData.append("output_format", "png");

            const response = await fetch("https://api.stability.ai/v2beta/stable-image/generate/core", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${stabilityApiKey}`,
                "Accept": "image/*",
              },
              body: formData,
            });

            if (!response.ok) {
              const errorText = await response.text();
              console.error(`Stability API error for slide ${i + 1}:`, errorText);
              errors.push(`Slide ${i + 1}: API error (${response.status})`);
              continue;
            }

            const buffer = await response.arrayBuffer();
            const base64 = Buffer.from(buffer).toString("base64");
            const base64Image = `data:image/png;base64,${base64}`;
            imageUrls.push(base64Image);
          } catch (imgError: any) {
            console.error(`Stability image generation failed for slide ${i + 1}:`, imgError);
            errors.push(`Slide ${i + 1}: ${imgError.message}`);
          }
        }
      } else {
        const { OpenAI } = await import("openai");
        const openai = new OpenAI({ apiKey: openaiApiKey! });

        for (let i = 0; i < slideData.length; i++) {
          try {
            // Use slide text directly as the prompt
            const prompt = slideData[i].text;
            
            const response = await openai.images.generate({
              model: "dall-e-3",
              prompt: prompt,
              n: 1,
              size: "1024x1024",
              quality: "standard",
            });

            if (response.data && response.data[0]?.url) {
              imageUrls.push(response.data[0].url);
            }
          } catch (imgError: any) {
            console.error(`OpenAI image generation failed for slide ${i + 1}:`, imgError);
            errors.push(`Slide ${i + 1}: ${imgError.message}`);
          }
        }
      }

      if (imageUrls.length === 0) {
        return res.status(500).json({ 
          error: "All image generations failed",
          details: errors 
        });
      }

      res.json({ 
        success: true, 
        imageUrls,
        generatedCount: imageUrls.length,
        requestedCount: slideData.length,
        provider: selectedProvider,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error: any) {
      console.error("Image generation error:", error);
      res.status(500).json({ error: error.message || "Failed to generate images" });
    }
  });

  /**
   * API: Create PDF from Images
   * 
   * Converts an array of image URLs into a multi-page PDF document.
   * Each image becomes a page in the carousel PDF.
   * Requires authentication
   */
  app.post("/api/pdf/create", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { imageUrls, images, title } = req.body;
      
      // Support both "imageUrls" and "images" parameters for flexibility
      const imageArray = imageUrls || images;

      if (!imageArray || !Array.isArray(imageArray) || imageArray.length === 0) {
        return res.status(400).json({ error: "Images array is required" });
      }

      const PDFDocument = (await import("pdfkit")).default;
      
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({
        size: [1080, 1080],
        margin: 0,
      });

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));

      const pdfPromise = new Promise<Buffer>((resolve, reject) => {
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);
      });

      for (let i = 0; i < imageArray.length; i++) {
        if (i > 0) {
          doc.addPage();
        }

        try {
          const imgData = imageArray[i];
          // Handle both base64 data URLs and regular URLs
          if (imgData.startsWith("data:image")) {
            const base64Data = imgData.split(",")[1];
            const imgBuffer = Buffer.from(base64Data, "base64");
            doc.image(imgBuffer, 0, 0, { width: 1080, height: 1080 });
          } else {
            const imgResponse = await fetch(imgData);
            const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());
            doc.image(imgBuffer, 0, 0, { width: 1080, height: 1080 });
          }
        } catch (imgError: any) {
          console.error(`Failed to process image ${i + 1}:`, imgError);
          doc.rect(0, 0, 1080, 1080).fill("#f0f0f0");
          doc.fill("#666").fontSize(24).text(`Image ${i + 1} failed to load`, 100, 500);
        }
      }

      doc.end();
      const pdfBuffer = await pdfPromise;
      const pdfBase64 = pdfBuffer.toString("base64");
      const pdfDataUrl = `data:application/pdf;base64,${pdfBase64}`;

      // Try to upload to Firebase Storage if configured
      let pdfUrl: string | undefined;
      let storageUsed = false;
      
      try {
        const { isStorageConfigured, uploadPdfToStorage } = await import("./lib/firebase-admin");
        
        if (isStorageConfigured()) {
          // Use user ID from session for the storage path (user is authenticated at this point)
          const userId = req.session.user!.profile.sub;
          // Use carouselId from request if provided, otherwise generate one with user ID prefix
          const storageCarouselId = req.body.carouselId || `${userId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          console.log(`[PDF Create] Uploading to storage with carouselId: ${storageCarouselId} for user: ${userId}`);
          
          pdfUrl = await uploadPdfToStorage(pdfBase64, storageCarouselId);
          storageUsed = true;
          console.log(`[PDF Create] Uploaded to Firebase Storage: ${pdfUrl}`);
        } else {
          console.log("[PDF Create] Storage not configured, returning base64");
        }
      } catch (storageError: any) {
        console.error("[PDF Create] Storage upload failed:", storageError.message);
        // Fall back to base64 - don't fail the whole request
      }

      // Create or update carousel document in Firestore
      let carouselUpdated = false;
      let carouselCreated = false;
      let savedCarouselId: string | undefined;
      const requestCarouselId = req.body.carouselId;
      const userId = req.session.user!.profile.sub;
      
      try {
        const { updateCarousel, getCarousel, createCarousel, isFirebaseConfigured } = await import("./lib/firebase-admin");
        
        if (isFirebaseConfigured) {
          if (requestCarouselId) {
            // Update existing carousel
            const carousel = await getCarousel(requestCarouselId);
            if (carousel && carousel.userId === userId) {
              await updateCarousel(requestCarouselId, { 
                pdfUrl: pdfUrl || pdfDataUrl, 
                status: "pdf_created" 
              });
              carouselUpdated = true;
              savedCarouselId = requestCarouselId;
              console.log(`[PDF Create] Updated carousel ${requestCarouselId} with PDF URL`);
            }
          } else {
            // Create new carousel document
            // Upload images to Firebase Storage to get URLs (base64 in arrays causes Firestore nested entity error)
            const { uploadImageToStorage, isStorageConfigured: checkStorage } = await import("./lib/firebase-admin");
            const tempCarouselId = `${userId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            
            const processedSlides = await Promise.all(
              imageArray.map(async (imgData: string, idx: number) => {
                const slideNumber = idx + 1;
                let imageUrl: string | undefined;
                
                // If it's base64 data and storage is configured, upload to get URL
                if (imgData.startsWith("data:") && checkStorage()) {
                  try {
                    imageUrl = await uploadImageToStorage(imgData, tempCarouselId, slideNumber);
                    console.log(`[PDF Create] Uploaded slide ${slideNumber} to Storage: ${imageUrl}`);
                  } catch (uploadErr: any) {
                    console.error(`[PDF Create] Failed to upload slide ${slideNumber}:`, uploadErr.message);
                  }
                } else if (imgData.startsWith("http")) {
                  // Already a URL, use it directly
                  imageUrl = imgData;
                }
                
                return {
                  number: slideNumber,
                  rawText: "",
                  finalText: "",
                  imagePrompt: "",
                  layout: "big_text_center" as const,
                  imageUrl, // Store URL instead of base64
                };
              })
            );
            
            const newCarousel = await createCarousel({
              userId,
              title: title || "LinkedIn Carousel",
              slides: processedSlides,
              carouselType: req.body.carouselType || "custom",
              status: "pdf_created",
              pdfUrl: pdfUrl || pdfDataUrl,
            });
            carouselCreated = true;
            savedCarouselId = newCarousel.id;
            console.log(`[PDF Create] Created new carousel ${newCarousel.id} for user ${userId} with ${processedSlides.length} slides`);
            
            // Set for response object
            const slidesForResponse = processedSlides;
          }
        }
      } catch (updateError: any) {
        console.error("[PDF Create] Failed to create/update carousel:", updateError.message);
      }

      res.json({
        success: true,
        pdfUrl: pdfUrl || pdfDataUrl,
        pdfBase64: pdfDataUrl,
        pageCount: imageArray.length,
        title: title || "LinkedIn Carousel",
        storageUsed,
        carouselUpdated,
        carouselCreated,
        carouselId: savedCarouselId,
        carousel: {
          id: savedCarouselId,
          slides: typeof processedSlides !== 'undefined' ? processedSlides : []
        }
      });
    } catch (error: any) {
      console.error("PDF creation error:", error);
      res.status(500).json({ error: error.message || "Failed to create PDF" });
    }
  });

  /**
   * API: Upload Carousel to LinkedIn
   * 
   * Uploads a PDF carousel as a document post to LinkedIn.
   * Uses LinkedIn's new Documents API (2024+) for carousel-style posts.
   */
  app.post("/api/linkedin/upload", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { pdfBase64, pdfUrl, caption, title, carouselId } = req.body;

      if (!pdfBase64 && !pdfUrl) {
        return res.status(400).json({ error: "PDF data (pdfBase64 or pdfUrl) is required" });
      }

      // Determine the correct LinkedIn access token based on auth type
      let linkedInAccessToken: string | undefined;
      let linkedInPersonId: string | undefined;

      if (req.session.authType === "linkedin") {
        // User logged in directly with LinkedIn - validate token exists
        if (!req.session.user.accessToken) {
          return res.status(401).json({ 
            error: "LinkedIn token missing",
            message: "Your LinkedIn session is invalid. Please log in again with LinkedIn.",
            needsReconnect: true
          });
        }
        linkedInAccessToken = req.session.user.accessToken;
        linkedInPersonId = req.session.user.profile.sub.replace(/^linkedin-person-/, '');
      } else if (req.session.authType === "firebase" && req.session.linkedLinkedIn) {
        // Firebase user with linked LinkedIn account - validate token exists
        if (!req.session.linkedLinkedIn.accessToken || !req.session.linkedLinkedIn.linkedinId) {
          return res.status(401).json({ 
            error: "LinkedIn connection invalid",
            message: "Your LinkedIn connection is invalid. Please reconnect your LinkedIn account.",
            needsReconnect: true
          });
        }
        linkedInAccessToken = req.session.linkedLinkedIn.accessToken;
        linkedInPersonId = req.session.linkedLinkedIn.linkedinId;
        
        // Check if the linked token might be expired
        if (req.session.linkedLinkedIn.expiresAt) {
          const expiresAt = new Date(req.session.linkedLinkedIn.expiresAt);
          if (expiresAt < new Date()) {
            return res.status(401).json({ 
              error: "LinkedIn connection expired",
              message: "Your LinkedIn connection has expired. Please reconnect your LinkedIn account to post carousels.",
              needsReconnect: true
            });
          }
        }
      } else if (req.session.authType === "firebase") {
        // Firebase user but no LinkedIn linked - try to get from Firestore
        try {
          const { getLinkedLinkedIn, isFirebaseConfigured } = await import("./lib/firebase-admin");
          if (isFirebaseConfigured) {
            const linkedLinkedIn = await getLinkedLinkedIn(req.session.user.profile.sub);
            if (linkedLinkedIn) {
              linkedInAccessToken = linkedLinkedIn.accessToken;
              linkedInPersonId = linkedLinkedIn.linkedinId;
              
              // Check expiration
              if (linkedLinkedIn.expiresAt) {
                const expiresAt = new Date(linkedLinkedIn.expiresAt);
                if (expiresAt < new Date()) {
                  return res.status(401).json({ 
                    error: "LinkedIn connection expired",
                    message: "Your LinkedIn connection has expired. Please reconnect your LinkedIn account to post carousels.",
                    needsReconnect: true
                  });
                }
              }
              
              // Cache in session for future requests
              req.session.linkedLinkedIn = {
                accessToken: linkedLinkedIn.accessToken,
                linkedinId: linkedLinkedIn.linkedinId,
                name: linkedLinkedIn.name,
                email: linkedLinkedIn.email,
                picture: linkedLinkedIn.picture,
                linkedAt: new Date(),
                expiresAt: linkedLinkedIn.expiresAt,
              };
            }
          }
        } catch (error) {
          console.warn("Failed to fetch linked LinkedIn from Firestore:", error);
        }
      }

      if (!linkedInAccessToken || !linkedInPersonId) {
        return res.status(401).json({ 
          error: "LinkedIn not connected",
          message: "Please connect your LinkedIn account to post carousels.",
          needsReconnect: true
        });
      }

      const accessToken = linkedInAccessToken;
      const personId = linkedInPersonId;
      const authorUrn = `urn:li:person:${personId}`;

      let pdfBuffer: Buffer;
      
      if (pdfUrl) {
        // Fetch PDF from Firebase Storage URL
        console.log("Fetching PDF from Storage URL:", pdfUrl);
        try {
          const { isStorageConfigured, adminStorage } = await import("./lib/firebase-admin");
          if (isStorageConfigured() && pdfUrl.includes("firebasestorage.googleapis.com")) {
            console.log("[LinkedIn Upload] Using Firebase Admin to fetch private file");
            // Extract file path from URL
            const urlPath = new URL(pdfUrl).pathname;
            const filePathMatch = urlPath.match(/\/o\/(.+)$/);
            if (filePathMatch) {
              const filePath = decodeURIComponent(filePathMatch[1]);
              const bucket = adminStorage!.bucket();
              const [content] = await bucket.file(filePath).download();
              pdfBuffer = content;
            } else {
              throw new Error("Could not parse file path from URL");
            }
          } else {
            const pdfResponse = await fetch(pdfUrl);
            if (!pdfResponse.ok) {
              throw new Error(`Failed to fetch PDF from storage: ${pdfResponse.statusText}`);
            }
            const arrayBuffer = await pdfResponse.arrayBuffer();
            pdfBuffer = Buffer.from(arrayBuffer);
          }
        } catch (fetchError: any) {
          console.error("[LinkedIn Upload] Error fetching PDF:", fetchError.message);
          return res.status(500).json({ error: "Failed to fetch PDF from storage", details: fetchError.message });
        }
      } else {
        // Use base64 data directly
        const base64Data = pdfBase64.includes(",") ? pdfBase64.split(",")[1] : pdfBase64;
        pdfBuffer = Buffer.from(base64Data, "base64");
      }

      const linkedInVersion = "202501";

      const initializePayload = {
        initializeUploadRequest: {
          owner: authorUrn
        }
      };

      console.log("Initializing document upload for:", authorUrn);

      const initResponse = await fetch("https://api.linkedin.com/rest/documents?action=initializeUpload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Linkedin-Version": linkedInVersion,
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify(initializePayload),
      });

      if (!initResponse.ok) {
        const errorText = await initResponse.text();
        console.error("Document initialization failed:", errorText);
        return res.status(500).json({ 
          error: "Failed to initialize document upload",
          details: errorText 
        });
      }

      const initData = await initResponse.json();
      console.log("Document initialized:", JSON.stringify(initData, null, 2));
      
      const uploadUrl = initData.value.uploadUrl;
      const documentUrn = initData.value.document;

      console.log("Uploading document to:", uploadUrl);

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: pdfBuffer,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error("Document upload failed:", errorText);
        return res.status(500).json({ 
          error: "Failed to upload document",
          details: errorText 
        });
      }

      console.log("Document uploaded successfully, waiting for processing...");

      const waitForDocument = async (urn: string, maxAttempts = 10): Promise<boolean> => {
        for (let i = 0; i < maxAttempts; i++) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const statusResponse = await fetch(`https://api.linkedin.com/rest/documents/${encodeURIComponent(urn)}`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Linkedin-Version": linkedInVersion,
              "X-Restli-Protocol-Version": "2.0.0",
            },
          });

          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            console.log(`Document status (attempt ${i + 1}):`, statusData.status);
            if (statusData.status === "AVAILABLE") {
              return true;
            }
            if (statusData.status === "PROCESSING_FAILED") {
              return false;
            }
          }
        }
        return false;
      };

      const isReady = await waitForDocument(documentUrn);
      if (!isReady) {
        console.warn("Document may still be processing, attempting to create post anyway...");
      }

      const postPayload = {
        author: authorUrn,
        commentary: caption || "Check out my new carousel!",
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: []
        },
        content: {
          media: {
            title: title || "LinkedIn Carousel",
            id: documentUrn
          }
        },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false
      };

      console.log("Creating post with document:", documentUrn);

      const shareResponse = await fetch("https://api.linkedin.com/rest/posts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Linkedin-Version": linkedInVersion,
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify(postPayload),
      });

      if (!shareResponse.ok) {
        const errorText = await shareResponse.text();
        console.error("Document post failed:", errorText);
        return res.status(shareResponse.status).json({ 
          error: "Failed to post carousel to LinkedIn",
          details: errorText 
        });
      }

      // Handle empty response or parse JSON safely
      let shareData: any = {};
      const responseText = await shareResponse.text();
      if (responseText && responseText.trim()) {
        try {
          shareData = JSON.parse(responseText);
        } catch (parseError) {
          console.warn("Could not parse share response:", responseText);
        }
      }
      
      // LinkedIn may return post ID in headers for 201 responses
      const postId = shareData.id || shareData.urn || shareResponse.headers.get("x-restli-id") || "unknown";
      
      // Save PDF to Firestore
      let savedCarouselId = carouselId;
      try {
        const { 
          saveCarouselPdf, 
          createCarousel, 
          updateCarousel,
          isFirebaseConfigured 
        } = await import("./lib/firebase-admin");
        
        if (isFirebaseConfigured) {
          const userId = req.session.user!.profile.sub;
          const pdfDataUrl = pdfBase64 ? (pdfBase64.includes(",") ? pdfBase64 : `data:application/pdf;base64,${pdfBase64}`) : "";
          
          if (carouselId) {
            // Update existing carousel with PDF and LinkedIn post ID
            await saveCarouselPdf(carouselId, pdfDataUrl);
            await updateCarousel(carouselId, { 
              linkedinPostId: postId,
              status: "published" 
            });
            console.log(`PDF saved to existing carousel: ${carouselId}`);
          } else {
            // Create a new carousel entry to store the published PDF
            const newCarousel = await createCarousel({
              userId,
              title: title || "LinkedIn Carousel",
              carouselType: "story-flow",
              slides: [],
              pdfBase64: pdfDataUrl,
              status: "published",
              linkedinPostId: postId,
            });
            savedCarouselId = newCarousel.id;
            console.log(`PDF saved to new carousel: ${savedCarouselId}`);
          }
        }
      } catch (saveError: any) {
        // Log error but don't fail the request - LinkedIn post was successful
        console.error("Failed to save PDF to Firestore:", saveError.message);
      }
      
      res.json({ 
        success: true, 
        postId: postId,
        carouselId: savedCarouselId,
        message: "Carousel posted successfully to LinkedIn" 
      });
    } catch (error: any) {
      console.error("LinkedIn upload error:", error);
      res.status(500).json({ error: error.message || "Failed to upload carousel" });
    }
  });

  /**
   * API: Save Project Draft
   * 
   * Saves a carousel project to Firestore for later editing.
   * Projects include messages, generated images, and PDF data.
   */
  app.post("/api/project/save", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { projectId, title, messages, imageUrls, pdfUrl, status } = req.body;
      const { profile } = req.session.user;
      const userId = profile.sub;

      const { saveProject, updateProject } = await import("./lib/firebase-admin");

      if (projectId) {
        await updateProject(projectId, {
          title,
          messages,
          imageUrls,
          pdfUrl,
          status,
        });
        res.json({ success: true, projectId, message: "Project updated" });
      } else {
        const project = await saveProject({
          userId,
          title: title || "Untitled Carousel",
          messages: messages || [],
          imageUrls: imageUrls || [],
          pdfUrl,
          status: status || "draft",
        });
        res.json({ success: true, projectId: project.id, message: "Project saved" });
      }
    } catch (error: any) {
      console.error("Project save error:", error);
      if (error.message?.includes("Firebase") || error.message?.includes("firestore")) {
        return res.status(503).json({ 
          error: "Firebase not configured. Please add Firebase credentials to your secrets." 
        });
      }
      res.status(500).json({ error: error.message || "Failed to save project" });
    }
  });

  /**
   * API: Get User Projects
   * 
   * Retrieves all carousel projects for the authenticated user.
   */
  app.get("/api/projects", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { profile } = req.session.user;
      const userId = profile.sub;

      const { getUserProjects } = await import("./lib/firebase-admin");
      const projects = await getUserProjects(userId);

      res.json(projects);
    } catch (error: any) {
      console.error("Get projects error:", error);
      if (error.message?.includes("Firebase") || error.message?.includes("firestore")) {
        return res.status(503).json({ 
          error: "Firebase not configured. Please add Firebase credentials to your secrets." 
        });
      }
      res.status(500).json({ error: error.message || "Failed to fetch projects" });
    }
  });

  /**
   * API: Get Single Project
   * 
   * Retrieves a specific carousel project by ID.
   */
  app.get("/api/project/:projectId", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { projectId } = req.params;
      const { getProject } = await import("./lib/firebase-admin");
      const project = await getProject(projectId);

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      if (project.userId !== req.session.user.profile.sub) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(project);
    } catch (error: any) {
      console.error("Get project error:", error);
      if (error.message?.includes("Firebase") || error.message?.includes("firestore")) {
        return res.status(503).json({ 
          error: "Firebase not configured. Please add Firebase credentials to your secrets." 
        });
      }
      res.status(500).json({ error: error.message || "Failed to fetch project" });
    }
  });

  // ============================================
  // CAROUSEL API ENDPOINTS (with Base64 persistence)
  // ============================================

  /**
   * API: Get Carousel Types (Guest-friendly)
   * Returns all available carousel type options
   */
  app.get("/api/carousel/types", async (req: Request, res: Response) => {
    // Guest-friendly - no auth required
    try {
      const { CAROUSEL_TYPES } = await import("./lib/firebase-admin");
      res.json({ carouselTypes: CAROUSEL_TYPES });
    } catch (error: any) {
      console.error("Get carousel types error:", error);
      res.status(500).json({ error: "Failed to get carousel types" });
    }
  });

  /**
   * API: Create Carousel from URL
   * Scrapes a URL, extracts text content, and uses AI to summarize into 7-10 carousel slides
   * Requires authentication
   */
  // Carousel from Voice
  const multer = await import("multer");
  const upload = multer.default({ storage: multer.memoryStorage() });

  app.post("/api/carousel/from-voice", upload.single("audio"), async (req: Request, res: Response) => {
    try {
      const file = req.file as Express.Multer.File;
      if (!file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      const { carouselType, aiProvider } = req.body;
      const audioBuffer = file.buffer;

      // 1. Transcription using Gemini (if selected) or falling back to OpenAI Whisper
      let text = "";
      if (aiProvider === "gemini") {
        console.log("[Voice Process] Using Gemini for transcription");
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: "Transcribe this audio accurately. Return only the transcription text." },
                {
                  inlineData: {
                    mimeType: file.mimetype,
                    data: audioBuffer.toString("base64")
                  }
                }
              ]
            }]
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error("Gemini Transcription Error:", error);
          throw new Error(error.error?.message || "Gemini transcription failed");
        }

        const json = await response.json();
        text = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
      } else {
        console.log("[Voice Process] Using OpenAI Whisper for transcription");
        const transcriptionResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: (() => {
            const form = new FormData();
            const blob = new Blob([audioBuffer], { type: file.mimetype });
            form.append("file", blob, "recording.webm");
            form.append("model", "whisper-1");
            return form;
          })()
        });

        if (!transcriptionResponse.ok) {
          const error = await transcriptionResponse.json();
          throw new Error(error.error?.message || "OpenAI transcription failed");
        }

        const transcription = await transcriptionResponse.json();
        text = transcription.text;
      }

      // 2. AI Structuring
      // We use the selected AI provider to structure the transcribed text into a professional carousel
      const systemPrompt = `You are a Carousel Design Expert. Your task is to transform a voice transcription into a high-performing professional carousel with 7-10 slides.
      
      CAROUSEL TYPE: ${carouselType}
      
      SLIDE STRUCTURE:
      - Slide 1: HOOK - A punchy, curiosity-driven headline (max 50 characters)
      - Slides 2-9: KEY POINTS - One clear idea per slide (max 100 characters each)
      - Final Slide: CTA - Call-to-action (max 100 characters)
      
      TEXT RULES:
      1. Each slide = ONE single idea, clear and impactful
      2. Use clean, bold, human-friendly wording
      3. Aim for 7-10 slides total
      
      Return your response as a valid JSON object with this structure:
      {
        "slides": ["Slide 1 text", "Slide 2 text", ...]
      }`;

      const userPrompt = `Transform this voice transcription into a professional carousel:
      
      TRANSCRIPTION:
      ${text}
      
      Return ONLY the JSON object.`;

      let slideTexts = [];
      if (aiProvider === "gemini") {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
            }],
            generationConfig: { responseMimeType: "application/json" }
          }),
        });
        const json = await response.json();
        const aiData = JSON.parse(json.candidates?.[0]?.content?.parts?.[0]?.text || '{"slides":[]}');
        slideTexts = aiData.slides;
      } else {
        const { OpenAI } = await import("openai");
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          response_format: { type: "json_object" }
        });
        const aiData = JSON.parse(response.choices[0]?.message?.content || '{"slides":[]}');
        slideTexts = aiData.slides;
      }

      if (!slideTexts || slideTexts.length === 0) {
        slideTexts = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 5);
      }
      
      const loopbackUrl = "http://0.0.0.0:5000";
      console.log(`[Voice Process] AI structured into ${slideTexts.length} slides. Sending to: ${loopbackUrl}/api/carousel/process`);
      const processResponse = await fetch(`${loopbackUrl}/api/carousel/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cookie": req.headers.cookie || "",
        },
        body: JSON.stringify({
          rawTexts: slideTexts,
          carouselType,
          aiProvider,
          title: "Voice Transcription",
        }),
      });

      if (!processResponse.ok) {
        const errorData = await processResponse.json().catch(() => ({}));
        console.error("[Voice Process] Structure Error:", errorData);
        throw new Error("Failed to structure carousel from transcription");
      }

      const data = await processResponse.json();
      res.json(data);
    } catch (error: any) {
      console.error("[Voice Process] Error:", error);
      res.status(500).json({ error: error.message || "Failed to process voice" });
    }
  });

  app.post("/api/carousel/from-url", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { url, carouselType = "tips-howto", aiProvider } = req.body;

      if (!url || typeof url !== "string") {
        return res.status(400).json({ error: "URL is required" });
      }

      // Validate URL format
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
          throw new Error("Invalid protocol");
        }
      } catch {
        return res.status(400).json({ error: "Invalid URL format. Please provide a valid http or https URL." });
      }

      const openaiApiKey = process.env.OPENAI_API_KEY;
      const geminiApiKey = process.env.GEMINI_API_KEY;

      // Validate AI provider selection
      const validProviders = ["gemini", "openai"];
      if (!aiProvider || !validProviders.includes(aiProvider)) {
        return res.status(400).json({ 
          error: "Please select an AI provider (Gemini or OpenAI) before generating." 
        });
      }

      // Check if selected provider has API key configured
      if (aiProvider === "gemini" && !geminiApiKey) {
        return res.status(503).json({ 
          error: "Gemini API key not configured. Please add GEMINI_API_KEY to your secrets." 
        });
      }
      if (aiProvider === "openai" && !openaiApiKey) {
        return res.status(503).json({ 
          error: "OpenAI API key not configured. Please add OPENAI_API_KEY to your secrets." 
        });
      }

      // Step 1: Fetch the URL content
      console.log(`Fetching URL: ${url}`);
      let htmlContent: string;
      try {
        const fetchResponse = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; LinkedInCarouselBot/1.0; +https://replit.com)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
          },
          redirect: "follow",
        });

        if (!fetchResponse.ok) {
          throw new Error(`Failed to fetch URL: ${fetchResponse.status} ${fetchResponse.statusText}`);
        }

        htmlContent = await fetchResponse.text();
      } catch (fetchError: any) {
        console.error("URL fetch error:", fetchError);
        return res.status(400).json({ 
          error: `Could not fetch the URL. ${fetchError.message || "Please check if the URL is accessible."}` 
        });
      }

      // Step 2: Extract readable text from HTML
      // Remove scripts, styles, and HTML tags
      let textContent = htmlContent
        // Remove script tags and content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
        // Remove style tags and content
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
        // Remove HTML comments
        .replace(/<!--[\s\S]*?-->/g, " ")
        // Remove all remaining HTML tags
        .replace(/<[^>]+>/g, " ")
        // Decode common HTML entities
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&mdash;/g, "—")
        .replace(/&ndash;/g, "–")
        // Normalize whitespace
        .replace(/\s+/g, " ")
        .trim();

      if (textContent.length < 100) {
        return res.status(400).json({ 
          error: "Could not extract enough text from the URL. The page may be behind a paywall, require JavaScript, or contain mostly images." 
        });
      }

      // Limit text length for API call (approximately 15,000 characters)
      if (textContent.length > 15000) {
        textContent = textContent.substring(0, 15000) + "...";
      }

      console.log(`Extracted ${textContent.length} characters from URL`);

      // Step 3: Use AI to summarize into 7-10 carousel slides
      const systemPrompt = `You are a Carousel Design Expert. Your task is to transform blog/article content into a high-performing professional carousel with 7-10 slides.

CAROUSEL TYPE: ${carouselType}

SLIDE STRUCTURE:
- Slide 1: HOOK - A punchy, curiosity-driven headline (max 50 characters)
- Slides 2-9: KEY POINTS - One clear idea per slide (max 100 characters each)
- Final Slide: CTA - Call-to-action like "Follow for more tips" (max 100 characters)

TEXT RULES:
1. Each slide = ONE single idea, clear and impactful
2. Use clean, bold, human-friendly wording
3. Remove jargon, simplify complex ideas
4. Make it scannable - short sentences, power words
5. Aim for 7-10 slides total (minimum 7, maximum 10)

LAYOUT OPTIONS:
- "hook_slide": For Slide 1 - bold, centered, maximum impact
- "big_text_center": For impactful statements or key points
- "points_center": For lists (keep to 3 points max)
- "cta_slide": For the final call-to-action slide

Return your response as a valid JSON object with this structure:
{
  "title": "Suggested carousel title based on the content",
  "slides": [
    {
      "number": 1,
      "rawText": "Original concept from article",
      "finalText": "5 Habits That Changed My Career",
      "layout": "hook_slide",
      "charCount": 32
    }
  ]
}`;

      const userPrompt = `Transform this article/blog content into a professional carousel with 7-10 slides:

SOURCE URL: ${url}

CONTENT:
${textContent}

Create a compelling carousel that captures the key insights. Return ONLY the JSON object, no other text.`;

      let aiResponse: { title: string; slides: any[] } = { title: "", slides: [] };

      // Use the selected AI provider (respect user's choice)
      const selectedAiProvider = aiProvider || "gemini";
      
      if (selectedAiProvider === "gemini") {
        // Use Gemini for text processing
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;
        
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
            }],
            generationConfig: {
              temperature: 0.7,
              topP: 0.9,
            }
          }),
        });

        const json = await response.json() as any;

        if (json.error) {
          console.error("Gemini API error:", json.error);
          throw new Error(json.error.message || "Gemini API error");
        }

        const textResponse = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!textResponse) {
          throw new Error("No response from Gemini");
        }

        // Parse JSON from the response
        const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiResponse = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("Failed to parse AI response as JSON");
        }
      } else if (aiProvider === "openai") {
        // Use OpenAI for text processing
        const { OpenAI } = await import("openai");
        const openai = new OpenAI({ apiKey: openaiApiKey! });

        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.7,
          response_format: { type: "json_object" }
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error("No response from OpenAI");
        }

        aiResponse = JSON.parse(content);
      }

      // Ensure slides array exists
      const rawSlides = aiResponse.slides || [];
      if (rawSlides.length < 3) {
        return res.status(500).json({ 
          error: "AI could not generate enough slides from the content. Please try a different URL with more substantial content." 
        });
      }

      // Process and normalize slides (same as /api/carousel/process)
      const totalSlides = rawSlides.length;
      const processedSlides = rawSlides.map((slide: any, index: number) => {
        const isFirstSlide = index === 0;
        const isLastSlide = index === totalSlides - 1;
        const maxChars = isFirstSlide ? 50 : 100;
        
        // Get and clamp finalText to enforce character limits
        let finalText = (slide.finalText || slide.rawText || "").trim();
        if (finalText.length > maxChars) {
          const truncateAt = maxChars - 3;
          const truncated = finalText.substring(0, truncateAt);
          const lastSpace = truncated.lastIndexOf(" ");
          finalText = (lastSpace > truncateAt * 0.7 ? truncated.substring(0, lastSpace) : truncated) + "...";
        }
        
        const charCount = finalText.length;
        
        // Determine layout based on position
        let layout = slide.layout || "big_text_center";
        if (isFirstSlide && layout !== "hook_slide") layout = "hook_slide";
        if (isLastSlide && layout !== "cta_slide") layout = "cta_slide";
        
        // Use the slide text directly as the image prompt - no AI-generated prompts
        return {
          number: index + 1,
          rawText: slide.rawText || finalText,
          finalText,
          imagePrompt: finalText,
          layout,
          charCount,
          tooMuchText: false,
          maxChars,
          isHook: isFirstSlide,
          isCta: isLastSlide,
          base64Image: "",
        };
      });

      // Determine login requirements based on session state
      const isAuthenticated = !!req.session.user;
      const hasLinkedInAuth = isAuthenticated && req.session.authType === "linkedin";

      res.json({
        title: aiResponse.title || "Carousel from URL",
        carouselType,
        sourceUrl: url,
        slides: processedSlides,
        pdfBase64: "",
        loginRequired: {
          download: !isAuthenticated,
          linkedinPost: !hasLinkedInAuth
        }
      });
    } catch (error: any) {
      console.error("From-URL carousel error:", error);
      
      const isAuthenticated = !!req.session.user;
      const hasLinkedInAuth = isAuthenticated && req.session.authType === "linkedin";
      
      res.status(500).json({ 
        error: error.message || "Failed to create carousel from URL",
        carouselType: req.body.carouselType || "tips-howto",
        slides: [],
        pdfBase64: "",
        loginRequired: {
          download: !isAuthenticated,
          linkedinPost: !hasLinkedInAuth
        }
      });
    }
  });

  /**
   * API: Process Text
   * Takes raw text + carousel type and returns formatted slides (NO AI text processing)
   * AI is only used for image generation, not text processing
   * Requires authentication
   */
  app.post("/api/carousel/process", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { rawTexts, carouselType, title } = req.body;

      if (!rawTexts || !Array.isArray(rawTexts) || rawTexts.length === 0) {
        return res.status(400).json({ error: "Raw texts array is required" });
      }

      if (!carouselType) {
        return res.status(400).json({ error: "Carousel type is required" });
      }

      // Normalize and validate rawTexts - trim and enforce character limits
      const normalizedRawTexts = rawTexts.map((text: string, index: number) => {
        const trimmed = (text || "").trim();
        const maxChars = index === 0 ? 50 : 100; // Hook = 50, others = 100
        if (trimmed.length > maxChars) {
          // Truncate at word boundary, reserving space for ellipsis
          const truncateAt = maxChars - 3;
          const truncated = trimmed.substring(0, truncateAt);
          const lastSpace = truncated.lastIndexOf(" ");
          return (lastSpace > truncateAt * 0.7 ? truncated.substring(0, lastSpace) : truncated) + "...";
        }
        return trimmed;
      }).filter((t: string) => t.length > 0);

      if (normalizedRawTexts.length === 0) {
        return res.status(400).json({ error: "At least one non-empty text is required" });
      }

      // NO AI text processing - just format the raw text directly into slides
      const totalSlides = normalizedRawTexts.length;
      const processedSlides = normalizedRawTexts.map((text: string, index: number) => {
        const isFirstSlide = index === 0;
        const isLastSlide = index === totalSlides - 1;
        const maxChars = isFirstSlide ? 50 : 100;
        
        const finalText = text;
        const charCount = finalText.length;
        
        // Determine layout based on position
        let layout = "big_text_center";
        if (isFirstSlide) layout = "hook_slide";
        if (isLastSlide) layout = "cta_slide";
        
        // Warning for too much text (should be false after normalization)
        const tooMuchText = charCount > maxChars;
        
        // Use the slide text directly as the image prompt
        return {
          number: index + 1,
          rawText: text,
          finalText,
          imagePrompt: finalText,
          layout,
          charCount,
          tooMuchText,
          maxChars,
          isHook: isFirstSlide,
          isCta: isLastSlide,
          base64Image: "", // Empty initially - will be populated when images are generated
        };
      });

      // Determine login requirements based on session state
      const isAuthenticated = !!req.session.user;
      const hasLinkedInAuth = isAuthenticated && req.session.authType === "linkedin";

      res.json({
        carouselType,
        slides: processedSlides,
        pdfBase64: "", // Empty initially - will be populated when PDF is generated
        loginRequired: {
          download: !isAuthenticated,
          linkedinPost: !hasLinkedInAuth
        }
      });
    } catch (error: any) {
      console.error("Process text error:", error);
      
      // Return consistent structure even on error, with login flags
      const isAuthenticated = !!req.session.user;
      const hasLinkedInAuth = isAuthenticated && req.session.authType === "linkedin";
      
      res.status(500).json({ 
        error: error.message || "Failed to process text",
        carouselType: req.body.carouselType || "",
        slides: [],
        pdfBase64: "",
        loginRequired: {
          download: !isAuthenticated,
          linkedinPost: !hasLinkedInAuth
        }
      });
    }
  });

  /**
   * API: Create New Carousel
   * Creates a new carousel in Firestore
   */
  app.post("/api/carousel", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { title, carouselType, slides } = req.body;
      const userId = req.session.user.profile.sub;
      
      console.log(`[Carousel Create] Creating carousel for user: ${userId}, authType: ${req.session.authType || 'unknown'}, email: ${req.session.user.profile.email || 'N/A'}`);

      const { createCarousel, isFirebaseConfigured } = await import("./lib/firebase-admin");
      
      if (!isFirebaseConfigured) {
        return res.status(503).json({ 
          error: "Firebase not configured. Please add Firebase credentials to your secrets." 
        });
      }

      // Deep sanitize function to remove undefined values recursively for Firestore
      // Keeps null, empty objects, and preserves array positions to avoid data loss
      const deepSanitize = (obj: any): any => {
        if (obj === undefined) {
          return null; // Convert undefined to null (Firestore accepts null)
        }
        if (obj === null) {
          return null;
        }
        if (Array.isArray(obj)) {
          // Preserve array positions - don't filter, just sanitize each item
          return obj.map(item => deepSanitize(item));
        }
        if (typeof obj === 'object' && obj !== null) {
          const cleanObj: Record<string, any> = {};
          for (const [key, value] of Object.entries(obj)) {
            if (value !== undefined) {
              cleanObj[key] = deepSanitize(value);
            }
            // Skip undefined keys entirely - Firestore doesn't accept undefined
          }
          return cleanObj; // Keep empty objects to preserve structure
        }
        return obj;
      };

      // Sanitize slides before saving to Firestore
      const sanitizedSlides = slides ? deepSanitize(slides) : [];

      const carousel = await createCarousel({
        userId,
        title: title || "Untitled Carousel",
        carouselType: carouselType || "story-flow",
        slides: sanitizedSlides,
        status: "draft",
      });

      res.json({ success: true, carousel });
    } catch (error: any) {
      console.error("Create carousel error:", error);
      res.status(500).json({ error: error.message || "Failed to create carousel" });
    }
  });

  /**
   * API: Get User's Carousels
   * Returns all carousels for the authenticated user
   */
  app.get("/api/carousels", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const userId = req.session.user.profile.sub;
      console.log(`[Carousels Fetch] Fetching carousels for user: ${userId}, authType: ${req.session.authType || 'unknown'}, email: ${req.session.user.profile.email || 'N/A'}`);
      
      const { getUserCarousels, isFirebaseConfigured } = await import("./lib/firebase-admin");
      
      if (!isFirebaseConfigured) {
        return res.json({ carousels: [] });
      }

      const carousels = await getUserCarousels(userId);
      res.json({ carousels });
    } catch (error: any) {
      console.error("Get carousels error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch carousels" });
    }
  });

  /**
   * API: Get Single Carousel
   */
  app.get("/api/carousel/:carouselId", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { carouselId } = req.params;
      const { getCarousel, isFirebaseConfigured } = await import("./lib/firebase-admin");
      
      if (!isFirebaseConfigured) {
        return res.status(503).json({ 
          error: "Firebase not configured." 
        });
      }

      const carousel = await getCarousel(carouselId);

      if (!carousel) {
        return res.status(404).json({ error: "Carousel not found" });
      }

      if (carousel.userId !== req.session.user.profile.sub) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(carousel);
    } catch (error: any) {
      console.error("Get carousel error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch carousel" });
    }
  });

  /**
   * API: Update Carousel
   */
  app.patch("/api/carousel/:carouselId", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { carouselId } = req.params;
      const updates = req.body;
      const { getCarousel, updateCarousel, isFirebaseConfigured } = await import("./lib/firebase-admin");
      
      if (!isFirebaseConfigured) {
        return res.status(503).json({ 
          error: "Firebase not configured." 
        });
      }

      // Verify ownership
      const carousel = await getCarousel(carouselId);
      if (!carousel) {
        return res.status(404).json({ error: "Carousel not found" });
      }
      if (carousel.userId !== req.session.user.profile.sub) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Deep sanitize function to remove undefined values recursively for Firestore
      // Keeps null, empty objects, and preserves array positions to avoid data loss
      const deepSanitize = (obj: any): any => {
        if (obj === undefined) {
          return null; // Convert undefined to null (Firestore accepts null)
        }
        if (obj === null) {
          return null;
        }
        if (Array.isArray(obj)) {
          // Preserve array positions - don't filter, just sanitize each item
          return obj.map(item => deepSanitize(item));
        }
        if (typeof obj === 'object' && obj !== null) {
          const cleanObj: Record<string, any> = {};
          for (const [key, value] of Object.entries(obj)) {
            if (value !== undefined) {
              cleanObj[key] = deepSanitize(value);
            }
            // Skip undefined keys entirely - Firestore doesn't accept undefined
          }
          return cleanObj; // Keep empty objects to preserve structure
        }
        return obj;
      };

      // Sanitize updates before saving to Firestore
      const sanitizedUpdates = deepSanitize(updates) || {};

      await updateCarousel(carouselId, sanitizedUpdates);
      const updated = await getCarousel(carouselId);

      res.json({ success: true, carousel: updated });
    } catch (error: any) {
      console.error("Update carousel error:", error);
      res.status(500).json({ error: error.message || "Failed to update carousel" });
    }
  });

  /**
   * API: Delete Carousel
   */
  app.delete("/api/carousel/:carouselId", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { carouselId } = req.params;
      const { getCarousel, deleteCarousel, isFirebaseConfigured } = await import("./lib/firebase-admin");
      
      if (!isFirebaseConfigured) {
        return res.status(503).json({ 
          error: "Firebase not configured." 
        });
      }

      // Verify ownership
      const carousel = await getCarousel(carouselId);
      if (!carousel) {
        return res.status(404).json({ error: "Carousel not found" });
      }
      if (carousel.userId !== req.session.user.profile.sub) {
        return res.status(403).json({ error: "Access denied" });
      }

      await deleteCarousel(carouselId);
      res.json({ success: true, message: "Carousel deleted" });
    } catch (error: any) {
      console.error("Delete carousel error:", error);
      res.status(500).json({ error: error.message || "Failed to delete carousel" });
    }
  });

  /**
   * API: Recover Carousel Images from Storage
   * Recovers slide images from Firebase Storage for carousels with empty slides array
   * This is useful for carousels that have PDFs but lost their slide image references
   */
  app.post("/api/carousel/:carouselId/recover-images", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { carouselId } = req.params;
      
      const { 
        getCarousel, 
        recoverCarouselImages,
        listCarouselImages,
        isFirebaseConfigured,
        isStorageConfigured
      } = await import("./lib/firebase-admin");
      
      if (!isFirebaseConfigured) {
        return res.status(503).json({ error: "Firebase not configured." });
      }

      if (!isStorageConfigured()) {
        return res.status(503).json({ error: "Firebase Storage not configured." });
      }

      // Get the carousel first to verify ownership
      const carousel = await getCarousel(carouselId);
      if (!carousel) {
        return res.status(404).json({ error: "Carousel not found" });
      }
      if (carousel.userId !== req.session.user.profile.sub) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Try to recover images from storage (the function handles all status checks)
      const recoveryResult = await recoverCarouselImages(carouselId);
      
      switch (recoveryResult.status) {
        case "not_found":
          return res.status(404).json({ error: "Carousel not found during recovery" });
          
        case "storage_error":
          return res.json({
            success: false,
            status: "storage_error",
            message: recoveryResult.errorMessage || "Error accessing storage",
            recovered: false,
            recoveredCount: 0,
            storageImageCount: 0,
            carousel: recoveryResult.carousel
          });
          
        case "already_has_images":
          const existingImageCount = carousel.slides?.filter(s => s.imageUrl || s.base64Image).length || 0;
          return res.json({ 
            success: true, 
            status: "already_has_images",
            message: `Carousel already has ${existingImageCount} image(s)`,
            recovered: false,
            recoveredCount: 0,
            storageImageCount: recoveryResult.storageImageCount,
            carousel: recoveryResult.carousel
          });
          
        case "no_storage_images":
          return res.json({
            success: true,
            status: "no_storage_images",
            message: "No images found in storage to recover",
            recovered: false,
            recoveredCount: 0,
            storageImageCount: 0,
            carousel: recoveryResult.carousel
          });
          
        case "recovered":
          const totalSlidesAfterRecovery = recoveryResult.carousel?.slides?.length || 0;
          return res.json({
            success: true,
            status: "recovered",
            recovered: true,
            recoveredCount: recoveryResult.recoveredCount,
            totalSlides: totalSlidesAfterRecovery,
            storageImageCount: recoveryResult.storageImageCount,
            carousel: recoveryResult.carousel,
            message: `Successfully recovered ${recoveryResult.recoveredCount} images (${totalSlidesAfterRecovery} total slides)`
          });
          
        default:
          return res.status(500).json({ error: "Unknown recovery status" });
      }
    } catch (error: any) {
      console.error("Recover carousel images error:", error);
      res.status(500).json({ error: error.message || "Failed to recover images" });
    }
  });

  /**
   * API: Generate Images for Carousel with Firebase Storage
   * Generates images and uploads them to Firebase Storage, storing URLs in Firestore
   */
  app.post("/api/carousel/:carouselId/generate-images", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { carouselId } = req.params;
      const { provider } = req.body;
      
      const { 
        getCarousel, 
        updateCarousel, 
        isFirebaseConfigured,
        uploadImageToStorage,
        isStorageConfigured
      } = await import("./lib/firebase-admin");
      
      if (!isFirebaseConfigured) {
        return res.status(503).json({ error: "Firebase not configured." });
      }

      // Get the carousel
      const carousel = await getCarousel(carouselId);
      if (!carousel) {
        return res.status(404).json({ error: "Carousel not found" });
      }
      if (carousel.userId !== req.session.user.profile.sub) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Update status to processing
      await updateCarousel(carouselId, { status: "processing" });

      const geminiApiKey = process.env.GEMINI_API_KEY;
      const openaiApiKey = process.env.OPENAI_API_KEY;
      const stabilityApiKey = process.env.STABILITY_API_KEY;

      // STRICT provider selection - no auto-fallback
      // User must explicitly select a provider
      const selectedProvider = provider;

      if (!selectedProvider) {
        await updateCarousel(carouselId, { status: "draft" });
        return res.status(400).json({ 
          error: "Please select an AI provider (gemini, stability, or openai)"
        });
      }

      // Check if the selected provider's API key is configured
      if (selectedProvider === "gemini" && !geminiApiKey) {
        await updateCarousel(carouselId, { status: "draft" });
        return res.status(503).json({ 
          error: "Gemini API key not configured. Please add GEMINI_API_KEY to your secrets."
        });
      }
      if (selectedProvider === "openai" && !openaiApiKey) {
        await updateCarousel(carouselId, { status: "draft" });
        return res.status(503).json({ 
          error: "OpenAI API key not configured. Please add OPENAI_API_KEY to your secrets."
        });
      }
      if (selectedProvider === "stability" && !stabilityApiKey) {
        await updateCarousel(carouselId, { status: "draft" });
        return res.status(503).json({ 
          error: "Stability API key not configured. Please add STABILITY_API_KEY to your secrets."
        });
      }

      const updatedSlides = [...carousel.slides];
      const errors: string[] = [];
      const useStorage = isStorageConfigured();

      for (let i = 0; i < carousel.slides.length; i++) {
        const slide = carousel.slides[i];
        
        // Skip if already has an image (URL or base64)
        if (slide.imageUrl || slide.base64Image) {
          continue;
        }

        try {
          // Use raw text directly - NO text refining, use exactly what user provided
          const prompt = (slide.rawText || slide.finalText || "").trim();
          
          if (!prompt) {
            errors.push(`Slide ${i + 1}: No text provided for image generation`);
            continue;
          }

          let base64Image: string | null = null;
          let mimeType = "image/png";

          if (selectedProvider === "gemini") {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${geminiApiKey}`;
            
            const response = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{
                  parts: [{ text: prompt }]
                }],
                generationConfig: {
                  responseModalities: ["TEXT", "IMAGE"]
                }
              }),
            });

            const json = await response.json() as any;

            if (json.error) {
              errors.push(`Slide ${i + 1}: ${json.error.message || 'Gemini API error'}`);
              continue;
            }

            const imagePart = json.candidates?.[0]?.content?.parts?.find(
              (p: any) => p.inlineData?.mimeType?.startsWith('image/')
            );
            
            if (imagePart?.inlineData?.data) {
              mimeType = imagePart.inlineData.mimeType || 'image/png';
              base64Image = imagePart.inlineData.data;
            } else {
              errors.push(`Slide ${i + 1}: No image in Gemini response`);
              continue;
            }
          } else if (selectedProvider === "stability") {
            const formData = new FormData();
            formData.append("prompt", prompt);
            formData.append("output_format", "png");

            const response = await fetch("https://api.stability.ai/v2beta/stable-image/generate/core", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${stabilityApiKey}`,
                "Accept": "image/*",
              },
              body: formData,
            });

            if (!response.ok) {
              errors.push(`Slide ${i + 1}: Stability API error (${response.status})`);
              continue;
            }

            const buffer = await response.arrayBuffer();
            base64Image = Buffer.from(buffer).toString("base64");
          } else if (selectedProvider === "openai") {
            const { OpenAI } = await import("openai");
            const openai = new OpenAI({ apiKey: openaiApiKey! });

            const response = await openai.images.generate({
              model: "dall-e-3",
              prompt: prompt,
              n: 1,
              size: "1024x1024",
              quality: "standard",
              response_format: "b64_json",
            });

            if (response.data?.[0]?.b64_json) {
              base64Image = response.data[0].b64_json;
            } else {
              errors.push(`Slide ${i + 1}: No image from OpenAI`);
              continue;
            }
          }

          // Upload to Firebase Storage if configured, otherwise fall back to base64
          if (base64Image) {
            if (useStorage) {
              try {
                const imageUrl = await uploadImageToStorage(
                  base64Image,
                  carouselId,
                  slide.number,
                  mimeType
                );
                updatedSlides[i] = {
                  ...updatedSlides[i],
                  imageUrl
                };
                console.log(`Slide ${i + 1}: Uploaded to Firebase Storage`);
              } catch (uploadError: any) {
                console.error(`Failed to upload slide ${i + 1} to Storage:`, uploadError);
                // Fall back to base64 if upload fails
                updatedSlides[i] = {
                  ...updatedSlides[i],
                  base64Image: `data:${mimeType};base64,${base64Image}`
                };
              }
            } else {
              // No storage configured, use base64
              updatedSlides[i] = {
                ...updatedSlides[i],
                base64Image: `data:${mimeType};base64,${base64Image}`
              };
            }
          }
        } catch (imgError: any) {
          console.error(`Image generation failed for slide ${i + 1}:`, imgError);
          errors.push(`Slide ${i + 1}: ${imgError.message}`);
        }
      }

      // Deep sanitize function to remove undefined values recursively for Firestore
      const deepSanitize = (obj: any): any => {
        if (obj === undefined) {
          return null;
        }
        if (obj === null) {
          return null;
        }
        if (Array.isArray(obj)) {
          return obj.map(item => deepSanitize(item));
        }
        if (typeof obj === 'object' && obj !== null) {
          const cleanObj: Record<string, any> = {};
          for (const [key, value] of Object.entries(obj)) {
            if (value !== undefined) {
              cleanObj[key] = deepSanitize(value);
            }
          }
          return cleanObj;
        }
        return obj;
      };

      // Sanitize slides for Firestore
      const sanitizedSlides = updatedSlides.map(slide => deepSanitize(slide));

      // Check if all slides have images (either URL or base64)
      const hasAllImages = sanitizedSlides.every(s => s.imageUrl || s.base64Image);
      await updateCarousel(carouselId, { 
        slides: sanitizedSlides as any,
        status: hasAllImages ? "images_generated" : "draft"
      });

      const updatedCarousel = await getCarousel(carouselId);

      res.json({
        success: true,
        carousel: updatedCarousel,
        generatedCount: updatedSlides.filter(s => s.imageUrl || s.base64Image).length,
        totalSlides: updatedSlides.length,
        provider: selectedProvider,
        storageUsed: useStorage,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error: any) {
      console.error("Generate carousel images error:", error);
      res.status(500).json({ error: error.message || "Failed to generate images" });
    }
  });

  /**
   * API: Create and Save PDF for Carousel
   * Creates PDF from images (URLs or Base64) and uploads to Firebase Storage
   */
  app.post("/api/carousel/:carouselId/create-pdf", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { carouselId } = req.params;
      
      const { 
        getCarousel, 
        saveCarouselPdf,
        updateCarousel,
        isFirebaseConfigured,
        uploadPdfToStorage,
        isStorageConfigured
      } = await import("./lib/firebase-admin");
      
      if (!isFirebaseConfigured) {
        return res.status(503).json({ error: "Firebase not configured." });
      }

      const carousel = await getCarousel(carouselId);
      if (!carousel) {
        return res.status(404).json({ error: "Carousel not found" });
      }
      if (carousel.userId !== req.session.user.profile.sub) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Check if slides have images (either URL or base64)
      const slidesWithImages = carousel.slides.filter(s => s.imageUrl || s.base64Image);
      if (slidesWithImages.length === 0) {
        return res.status(400).json({ error: "No images to create PDF from" });
      }

      const PDFDocument = (await import("pdfkit")).default;
      
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({
        size: [1080, 1080],
        margin: 0,
      });

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));

      const pdfPromise = new Promise<Buffer>((resolve, reject) => {
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);
      });

      for (let i = 0; i < slidesWithImages.length; i++) {
        if (i > 0) {
          doc.addPage();
        }

        const slide = slidesWithImages[i];
        try {
          let imgBuffer: Buffer | null = null;

          if (slide.imageUrl) {
            // Fetch image from URL
            const response = await fetch(slide.imageUrl);
            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer();
              imgBuffer = Buffer.from(arrayBuffer);
            }
          } else if (slide.base64Image) {
            // Extract base64 data from data URL
            const base64Data = slide.base64Image.split(",")[1];
            imgBuffer = Buffer.from(base64Data, "base64");
          }

          if (imgBuffer) {
            doc.image(imgBuffer, 0, 0, { width: 1080, height: 1080 });
          } else {
            throw new Error("No image data");
          }
        } catch (imgError: any) {
          console.error(`Failed to add image ${i + 1} to PDF:`, imgError);
          doc.rect(0, 0, 1080, 1080).fill("#f0f0f0");
          doc.fill("#666").fontSize(24).text(`Slide ${i + 1}`, 100, 500);
        }
      }

      doc.end();
      const pdfBuffer = await pdfPromise;
      const pdfBase64 = pdfBuffer.toString("base64");

      // Upload to Firebase Storage if configured
      console.log("[PDF Route] Checking storage configuration...");
      const useStorage = isStorageConfigured();
      console.log(`[PDF Route] useStorage: ${useStorage}, carouselId: ${carouselId}`);
      let pdfUrl: string | undefined;

      if (useStorage) {
        try {
          console.log("[PDF Route] Attempting to upload PDF to Firebase Storage...");
          pdfUrl = await uploadPdfToStorage(pdfBase64, carouselId);
          console.log(`[PDF Route] PDF uploaded successfully: ${pdfUrl}`);
          await updateCarousel(carouselId, { pdfUrl, status: "pdf_created" });
        } catch (uploadError: any) {
          console.error("[PDF Route] Failed to upload PDF to Storage:", uploadError.message || uploadError);
          // Fall back to base64 in Firestore
          await saveCarouselPdf(carouselId, `data:application/pdf;base64,${pdfBase64}`);
        }
      } else {
        console.log("[PDF Route] Storage not configured, saving base64 to Firestore");
        // No storage, save base64 to Firestore
        await saveCarouselPdf(carouselId, `data:application/pdf;base64,${pdfBase64}`);
      }

      const updatedCarousel = await getCarousel(carouselId);

      res.json({
        success: true,
        carousel: updatedCarousel,
        pdfUrl: pdfUrl || undefined,
        pdfBase64: !pdfUrl ? `data:application/pdf;base64,${pdfBase64}` : undefined,
        pageCount: slidesWithImages.length,
        storageUsed: !!pdfUrl,
      });
    } catch (error: any) {
      console.error("Create carousel PDF error:", error);
      res.status(500).json({ error: error.message || "Failed to create PDF" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
