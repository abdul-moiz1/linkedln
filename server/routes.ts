import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { 
  linkedInUserSchema, 
  createPostSchema, 
  type SessionUser,
  repostSchema,
  createScheduledPostSchema,
  scheduledPosts,
  type SelectScheduledPost,
} from "@shared/schema";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and, lte } from "drizzle-orm";

// Initialize database connection (optional - only needed for scheduled posts)
let db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL not configured. Scheduled posts feature requires a database.");
  }
  if (!db) {
    const sql = neon(process.env.DATABASE_URL);
    db = drizzle(sql);
  }
  return db;
}

// LinkedIn OAuth2 Configuration
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
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
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  /**
   * STEP 1: Initiate LinkedIn OAuth2 Authorization Flow
   * 
   * When user clicks "Login with LinkedIn", redirect them to LinkedIn's
   * authorization page where they can grant permissions to our app.
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
              <h1>⚠️ LinkedIn OAuth Not Configured</h1>
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
              <p><a href="/">← Back to Home</a></p>
            </div>
          </body>
        </html>
      `);
    }

    // Generate a random state parameter for CSRF protection
    const state = Math.random().toString(36).substring(7);
    
    // Store state in session to verify in callback
    req.session.oauth_state = state;

    // Build the authorization URL with all required parameters
    const authUrl = new URL(LINKEDIN_AUTH_URL);
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("client_id", LINKEDIN_CLIENT_ID!);
    authUrl.searchParams.append("redirect_uri", REDIRECT_URI);
    authUrl.searchParams.append("state", state);
    authUrl.searchParams.append("scope", "openid profile email w_member_social");

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
        console.error("Token exchange failed:", errorText);
        return res.status(500).send("Failed to obtain access token from LinkedIn.");
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
       * STEP 5: Store User Data in Session and Firestore
       * 
       * Save the user's profile and access token in the session.
       * This allows us to:
       * 1. Display user information on the profile page
       * 2. Use the access token for API calls (like creating posts)
       * 3. Maintain authentication state across requests
       * 
       * Also persist to Firestore if configured for data durability.
       */
      req.session.user = {
        profile,
        accessToken,
        authProvider: "linkedin",
      };
      req.session.authType = "linkedin"; // Set auth type for LinkedIn OAuth

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
            tokenExpiresAt: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000),
          });
        }
      } catch (firestoreError) {
        // Firestore is optional - continue even if it fails
        console.warn("Firestore save failed (Firebase may not be configured):", firestoreError);
      }

      // Redirect to the preview page so user can continue with their carousel
      res.redirect("/preview");
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
  app.get("/api/user", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Try to fetch profileUrl from Firestore
    let profileUrl: string | undefined;
    try {
      const { getUser, isFirebaseConfigured } = await import("./lib/firebase-admin");
      const userId = req.session.user.profile.sub;
      console.log(`Fetching user data from Firestore for ${userId}, Firebase configured: ${isFirebaseConfigured}`);
      if (isFirebaseConfigured) {
        const userData = await getUser(userId);
        console.log(`Firestore user data:`, userData ? JSON.stringify(userData) : 'not found');
        if (userData && (userData as any).profileUrl) {
          profileUrl = (userData as any).profileUrl;
          console.log(`Found stored profileUrl: ${profileUrl}`);
        }
      }
    } catch (firestoreError) {
      console.error("Failed to fetch user from Firestore:", firestoreError);
    }

    res.json({
      ...req.session.user,
      profileUrl,
    });
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
  app.post("/api/auth/firebase/verify", async (req: Request, res: Response) => {
    try {
      const { idToken } = req.body;
      
      if (!idToken) {
        return res.status(400).json({ error: "ID token is required" });
      }

      const { adminAuth, isFirebaseConfigured, saveUser } = await import("./lib/firebase-admin");
      
      if (!isFirebaseConfigured || !adminAuth) {
        return res.status(503).json({ 
          error: "Firebase Auth not configured. Please add Firebase credentials to your secrets." 
        });
      }

      // Verify the ID token
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      const { uid, email, name, picture, email_verified } = decodedToken;

      // Create session user from Firebase auth
      req.session.user = {
        profile: {
          sub: `firebase-${uid}`,
          name: name || email?.split('@')[0] || 'User',
          email: email,
          email_verified: email_verified,
          picture: picture,
        },
        accessToken: idToken, // Store the Firebase token for API calls
        authProvider: "firebase",
      };
      req.session.authType = "firebase";
      req.session.firebaseUid = uid;

      // Save user to Firestore
      try {
        await saveUser({
          linkedinId: `firebase-${uid}`,
          email: email || "",
          name: name || email?.split('@')[0] || "User",
          profilePicture: picture,
          accessToken: idToken,
          tokenExpiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
        });
      } catch (saveError) {
        console.warn("Could not save Firebase user to Firestore:", saveError);
      }

      // Migrate any guest carousels if guestId exists
      if (req.session.guestId) {
        try {
          const { migrateGuestCarousels } = await import("./lib/firebase-admin");
          await migrateGuestCarousels(req.session.guestId, `firebase-${uid}`);
          delete req.session.guestId;
        } catch (migrateError) {
          console.warn("Could not migrate guest carousels:", migrateError);
        }
      }

      res.json({
        success: true,
        user: {
          uid,
          email,
          name: name || email?.split('@')[0],
          picture,
          authType: "firebase"
        }
      });
    } catch (error: any) {
      console.error("Firebase auth verification error:", error);
      res.status(401).json({ error: "Invalid or expired token" });
    }
  });

  /**
   * API: Check Auth Status
   * Returns whether user is authenticated and what type of auth they used
   */
  app.get("/api/auth/status", (req: Request, res: Response) => {
    const isAuthenticated = !!req.session.user;
    const hasLinkedInAuth = isAuthenticated && req.session.authType === "linkedin";
    
    res.json({
      isAuthenticated,
      authType: req.session.authType || null,
      hasLinkedInAuth,
      canDownload: isAuthenticated,
      canPostToLinkedIn: hasLinkedInAuth,
      loginRequired: {
        download: !isAuthenticated,
        linkedinPost: !hasLinkedInAuth
      }
    });
  });

  // ============================================
  // GUEST CAROUSEL ENDPOINTS (No Auth Required)
  // ============================================

  /**
   * API: Create Guest Carousel
   * Creates a carousel for guests, stored with a guest ID
   * Guest can later claim these carousels after logging in
   */
  app.post("/api/guest/carousel", async (req: Request, res: Response) => {
    try {
      const { guestId, title, carouselType, slides } = req.body;
      
      if (!guestId) {
        return res.status(400).json({ error: "Guest ID is required" });
      }

      const { createCarousel, isFirebaseConfigured } = await import("./lib/firebase-admin");
      
      if (!isFirebaseConfigured) {
        // Return a mock response for local storage fallback
        return res.json({ 
          success: true, 
          carousel: {
            id: `local-${Date.now()}`,
            userId: `guest-${guestId}`,
            title: title || "Untitled Carousel",
            carouselType: carouselType || "story-flow",
            slides: slides || [],
            status: "draft",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          isLocal: true
        });
      }

      // Store guest ID in session for later migration
      req.session.guestId = guestId;

      // Deep sanitize function for Firestore
      const deepSanitize = (obj: any): any => {
        if (obj === undefined) return null;
        if (obj === null) return null;
        if (Array.isArray(obj)) return obj.map(item => deepSanitize(item));
        if (typeof obj === 'object' && obj !== null) {
          const cleanObj: Record<string, any> = {};
          for (const [key, value] of Object.entries(obj)) {
            if (value !== undefined) cleanObj[key] = deepSanitize(value);
          }
          return cleanObj;
        }
        return obj;
      };

      const sanitizedSlides = slides ? deepSanitize(slides) : [];

      const carousel = await createCarousel({
        userId: `guest-${guestId}`,
        title: title || "Untitled Carousel",
        carouselType: carouselType || "story-flow",
        slides: sanitizedSlides,
        status: "draft",
      });

      res.json({ success: true, carousel });
    } catch (error: any) {
      console.error("Create guest carousel error:", error);
      res.status(500).json({ error: error.message || "Failed to create carousel" });
    }
  });

  /**
   * API: Get Guest Carousel
   * Retrieves a carousel by ID for guests
   */
  app.get("/api/guest/carousel/:carouselId", async (req: Request, res: Response) => {
    try {
      const { carouselId } = req.params;
      const { guestId } = req.query;
      
      const { getCarousel, isFirebaseConfigured } = await import("./lib/firebase-admin");
      
      if (!isFirebaseConfigured) {
        return res.status(404).json({ error: "Carousel not found" });
      }

      const carousel = await getCarousel(carouselId);
      
      if (!carousel) {
        return res.status(404).json({ error: "Carousel not found" });
      }

      // Verify guest ownership
      if (carousel.userId !== `guest-${guestId}`) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(carousel);
    } catch (error: any) {
      console.error("Get guest carousel error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch carousel" });
    }
  });

  /**
   * API: Update Guest Carousel
   * Updates a carousel for guests (e.g., adding base64 images)
   */
  app.patch("/api/guest/carousel/:carouselId", async (req: Request, res: Response) => {
    try {
      const { carouselId } = req.params;
      const { guestId, ...updates } = req.body;
      
      if (!guestId) {
        return res.status(400).json({ error: "Guest ID is required" });
      }

      const { getCarousel, updateCarousel, isFirebaseConfigured } = await import("./lib/firebase-admin");
      
      if (!isFirebaseConfigured) {
        return res.json({ success: true, message: "Local update only" });
      }

      const carousel = await getCarousel(carouselId);
      
      if (!carousel) {
        return res.status(404).json({ error: "Carousel not found" });
      }

      if (carousel.userId !== `guest-${guestId}`) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Deep sanitize for Firestore
      const deepSanitize = (obj: any): any => {
        if (obj === undefined) return null;
        if (obj === null) return null;
        if (Array.isArray(obj)) return obj.map(item => deepSanitize(item));
        if (typeof obj === 'object' && obj !== null) {
          const cleanObj: Record<string, any> = {};
          for (const [key, value] of Object.entries(obj)) {
            if (value !== undefined) cleanObj[key] = deepSanitize(value);
          }
          return cleanObj;
        }
        return obj;
      };

      const sanitizedUpdates = deepSanitize(updates) || {};
      await updateCarousel(carouselId, sanitizedUpdates);
      const updated = await getCarousel(carouselId);

      res.json({ success: true, carousel: updated });
    } catch (error: any) {
      console.error("Update guest carousel error:", error);
      res.status(500).json({ error: error.message || "Failed to update carousel" });
    }
  });

  /**
   * API: Save Slide Base64 Image (Guest-friendly)
   * Saves a generated base64 image to a specific slide
   */
  app.post("/api/carousel/:carouselId/slide/:slideNumber/image", async (req: Request, res: Response) => {
    try {
      const { carouselId, slideNumber } = req.params;
      const { base64Image, guestId } = req.body;
      
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

      // Check authorization
      const isGuest = carousel.userId.startsWith("guest-");
      const isOwner = req.session.user?.profile.sub === carousel.userId;
      const isGuestOwner = isGuest && carousel.userId === `guest-${guestId}`;

      if (!isOwner && !isGuestOwner) {
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
   * API: Check Existing Slide Images (Guest-friendly)
   * Returns existing base64 images from Firestore for a carousel
   * Allows checking before regenerating images to avoid unnecessary API calls
   */
  app.get("/api/carousel/:carouselId/images", async (req: Request, res: Response) => {
    try {
      const { carouselId } = req.params;
      const { guestId } = req.query;
      
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

      // Check authorization
      const isGuest = carousel.userId.startsWith("guest-");
      const isOwner = req.session.user?.profile.sub === carousel.userId;
      const isGuestOwner = isGuest && carousel.userId === `guest-${guestId}`;

      if (!isOwner && !isGuestOwner) {
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
   * Compares current slide text with stored text to determine if image needs regeneration
   */
  app.post("/api/carousel/:carouselId/check-regeneration", async (req: Request, res: Response) => {
    try {
      const { carouselId } = req.params;
      const { slides, guestId } = req.body;
      
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

      // Check authorization
      const isGuest = carousel.userId.startsWith("guest-");
      const isOwner = req.session.user?.profile.sub === carousel.userId;
      const isGuestOwner = isGuest && carousel.userId === `guest-${guestId}`;

      if (!isOwner && !isGuestOwner) {
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
      const { accessToken, profile } = req.session.user;

      /**
       * Extract LinkedIn Person ID from OpenID Connect 'sub' field
       */
      const personId = profile.sub.replace(/^linkedin-person-/, '');
      const authorUrn = `urn:li:person:${personId}`;

      // Extract locale data
      let localeData: { country: string; language: string };
      if (typeof profile.locale === 'object' && profile.locale !== null) {
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
   * API: Generate AI Images (Guest-friendly)
   * 
   * Generates images using OpenAI's DALL-E, Google's Gemini, or Stability AI based on text prompts.
   * Each message in the array becomes an image in the carousel.
   * Provider can be "openai", "gemini", or "stability" (auto selects first available)
   * No authentication required - allows guests to create carousels
   */
  app.post("/api/images/generate", async (req: Request, res: Response) => {
    // Guest-friendly endpoint - no auth required for carousel creation
    try {
      const { messages, provider = "auto" } = req.body;
      
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "Messages array is required" });
      }

      if (messages.length > 5) {
        return res.status(400).json({ error: "Maximum 5 messages allowed" });
      }

      const geminiApiKey = process.env.GEMINI_API_KEY;
      const openaiApiKey = process.env.OPENAI_API_KEY;
      const stabilityApiKey = process.env.STABILITY_API_KEY;

      let selectedProvider = provider;
      if (provider === "auto") {
        selectedProvider = geminiApiKey ? "gemini" : stabilityApiKey ? "stability" : openaiApiKey ? "openai" : null;
      }

      if (!selectedProvider || 
          (selectedProvider === "gemini" && !geminiApiKey) || 
          (selectedProvider === "openai" && !openaiApiKey) ||
          (selectedProvider === "stability" && !stabilityApiKey)) {
        return res.status(503).json({ 
          error: "No AI API key configured. Please add GEMINI_API_KEY, STABILITY_API_KEY, or OPENAI_API_KEY to your secrets." 
        });
      }

      const imageUrls: string[] = [];
      const errors: string[] = [];

      if (selectedProvider === "gemini") {
        for (let i = 0; i < messages.length; i++) {
          try {
            // Process text for display - crop if too long
            let displayText = (messages[i] || "").trim();
            const maxTextLength = 120;
            if (displayText.length > maxTextLength) {
              const truncated = displayText.substring(0, maxTextLength);
              const lastSpace = truncated.lastIndexOf(" ");
              displayText = (lastSpace > maxTextLength * 0.6 ? truncated.substring(0, lastSpace) : truncated) + "...";
            }
            
            const prompt = `Create a professional, visually striking image that represents this concept: "${displayText}"

Design requirements:
- Generate imagery that visually illustrates and represents the meaning/theme of the text
- DO NOT include any text, words, or letters in the image
- Use relevant visual metaphors, symbols, and professional imagery
- Modern, clean, polished aesthetic suitable for LinkedIn
- High-quality, vibrant but professional color palette
- Square format (1:1 aspect ratio)`;
            
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
            console.error(`Gemini image generation failed for message ${i + 1}:`, imgError);
            errors.push(`Slide ${i + 1}: ${imgError.message}`);
          }
        }
      } else if (selectedProvider === "stability") {
        for (let i = 0; i < messages.length; i++) {
          try {
            // Process text for display - crop if too long
            let displayText = (messages[i] || "").trim();
            const maxTextLength = 120;
            if (displayText.length > maxTextLength) {
              const truncated = displayText.substring(0, maxTextLength);
              const lastSpace = truncated.lastIndexOf(" ");
              displayText = (lastSpace > maxTextLength * 0.6 ? truncated.substring(0, lastSpace) : truncated) + "...";
            }
            
            const prompt = `Professional image illustrating this concept: "${displayText}". Visually represent the meaning with relevant imagery, metaphors, and symbols. NO text or words in the image. Modern clean polished aesthetic, vibrant professional colors, LinkedIn-appropriate, square format.`;
            
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
            console.error(`Stability image generation failed for message ${i + 1}:`, imgError);
            errors.push(`Slide ${i + 1}: ${imgError.message}`);
          }
        }
      } else {
        const { OpenAI } = await import("openai");
        const openai = new OpenAI({ apiKey: openaiApiKey! });

        for (let i = 0; i < messages.length; i++) {
          try {
            // Process text for display - crop if too long
            let displayText = (messages[i] || "").trim();
            const maxTextLength = 120;
            if (displayText.length > maxTextLength) {
              const truncated = displayText.substring(0, maxTextLength);
              const lastSpace = truncated.lastIndexOf(" ");
              displayText = (lastSpace > maxTextLength * 0.6 ? truncated.substring(0, lastSpace) : truncated) + "...";
            }
            
            const prompt = `Create a professional image that visually represents this concept: "${displayText}". Generate imagery that illustrates the meaning using relevant visual metaphors, symbols, and professional imagery. DO NOT include any text, words, or letters in the image. Modern clean polished aesthetic, high-quality vibrant but professional colors, LinkedIn-appropriate, square format.`;
            
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
            console.error(`OpenAI image generation failed for message ${i + 1}:`, imgError);
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
        requestedCount: messages.length,
        provider: selectedProvider,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error: any) {
      console.error("Image generation error:", error);
      res.status(500).json({ error: error.message || "Failed to generate images" });
    }
  });

  /**
   * API: Create PDF from Images (Guest-friendly)
   * 
   * Converts an array of image URLs into a multi-page PDF document.
   * Each image becomes a page in the carousel PDF.
   * No authentication required - allows guests to create and download PDFs
   */
  app.post("/api/pdf/create", async (req: Request, res: Response) => {
    // Guest-friendly endpoint - no auth required for PDF creation
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

      res.json({
        success: true,
        pdfUrl: pdfDataUrl,
        pdfBase64: pdfDataUrl,
        pageCount: imageArray.length,
        title: title || "LinkedIn Carousel",
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
      const { pdfBase64, caption, title, carouselId } = req.body;

      if (!pdfBase64) {
        return res.status(400).json({ error: "PDF data is required" });
      }

      const { accessToken, profile } = req.session.user;
      const personId = profile.sub.replace(/^linkedin-person-/, '');
      const authorUrn = `urn:li:person:${personId}`;

      const base64Data = pdfBase64.includes(",") ? pdfBase64.split(",")[1] : pdfBase64;
      const pdfBuffer = Buffer.from(base64Data, "base64");

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
          const userId = profile.sub;
          const pdfDataUrl = pdfBase64.includes(",") ? pdfBase64 : `data:application/pdf;base64,${pdfBase64}`;
          
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
   * API: Create Carousel from URL (Guest-friendly)
   * Scrapes a URL, extracts text content, and uses AI to summarize into 7-10 carousel slides
   * No authentication required - allows guests to create carousels from blog URLs
   */
  app.post("/api/carousel/from-url", async (req: Request, res: Response) => {
    try {
      const { url, carouselType = "tips-howto" } = req.body;

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

      const geminiApiKey = process.env.GEMINI_API_KEY;
      const openaiApiKey = process.env.OPENAI_API_KEY;

      if (!geminiApiKey && !openaiApiKey) {
        return res.status(503).json({ 
          error: "No AI API key configured. Please add GEMINI_API_KEY or OPENAI_API_KEY to your secrets." 
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
      const systemPrompt = `You are a LinkedIn Carousel Expert. Your task is to transform blog/article content into a high-performing LinkedIn carousel with 7-10 slides.

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

IMAGE PROMPT (required for each slide):
For each slide, include an "imagePrompt" field (20-40 words) describing a visual scene based on the article:
- Professional imagery suitable for LinkedIn, relevant to the article's topic
- Specific visual elements, colors, and style
- No text in the image (text overlaid separately)

Examples:
- "Futuristic robot arm with laptop, glowing circuits, blue and silver tech office aesthetic"
- "Diverse professionals forming expanding circle, network connection lines, warm corporate lighting"

Return your response as a valid JSON object with this structure:
{
  "title": "Suggested carousel title based on the content",
  "slides": [
    {
      "number": 1,
      "rawText": "Original concept from article",
      "finalText": "Refined short hook text",
      "imagePrompt": "Brief visual scene description based on article (20-40 words)",
      "layout": "hook_slide",
      "charCount": 45
    }
  ]
}`;

      const userPrompt = `Transform this article/blog content into a LinkedIn carousel with 7-10 slides:

SOURCE URL: ${url}

CONTENT:
${textContent}

Create a compelling carousel that captures the key insights. Return ONLY the JSON object, no other text.`;

      let aiResponse: { title: string; slides: any[] } = { title: "", slides: [] };

      if (geminiApiKey) {
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
      } else if (openaiApiKey) {
        // Use OpenAI for text processing
        const { OpenAI } = await import("openai");
        const openai = new OpenAI({ apiKey: openaiApiKey });

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
        
        // Generate a fallback imagePrompt if AI didn't provide one
        const fallbackImagePrompt = `Professional LinkedIn visual for "${finalText}". Modern, clean design with business imagery related to the article topic, abstract shapes or relevant icons. Corporate blue and neutral color palette, suitable for professional social media.`;
        
        return {
          number: index + 1,
          rawText: slide.rawText || finalText,
          finalText,
          imagePrompt: slide.imagePrompt || fallbackImagePrompt,
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
   * API: Process Text with AI (Guest-friendly)
   * Takes raw text + carousel type and returns refined LinkedIn-ready text with image prompts
   * No authentication required - allows guests to create carousels
   */
  app.post("/api/carousel/process", async (req: Request, res: Response) => {
    // Guest-friendly endpoint - no auth required for carousel creation
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
          // Truncate at word boundary
          const truncated = trimmed.substring(0, maxChars);
          const lastSpace = truncated.lastIndexOf(" ");
          return lastSpace > maxChars * 0.7 ? truncated.substring(0, lastSpace) : truncated;
        }
        return trimmed;
      }).filter((t: string) => t.length > 0);

      if (normalizedRawTexts.length === 0) {
        return res.status(400).json({ error: "At least one non-empty text is required" });
      }

      const geminiApiKey = process.env.GEMINI_API_KEY;
      const openaiApiKey = process.env.OPENAI_API_KEY;

      if (!geminiApiKey && !openaiApiKey) {
        return res.status(503).json({ 
          error: "No AI API key configured. Please add GEMINI_API_KEY or OPENAI_API_KEY to your secrets." 
        });
      }

      // Build the AI prompt for processing text
      const systemPrompt = `You are a LinkedIn Carousel Expert. Create high-performing, professional carousel slides.

CAROUSEL TYPE: ${carouselType}
CAROUSEL TITLE: ${title || 'LinkedIn Carousel'}

TEXT RULES:
1. Keep each slide to ONE single idea - max 100 characters
2. Use clean, bold, human-friendly wording
3. Slide 1 = HOOK: Make it punchy, curiosity-driven, max 50 characters
4. Last slide = CTA: "Follow for more" or similar call-to-action
5. Clear hierarchy: Headlines big, details smaller

LAYOUT OPTIONS:
- "hook_slide": For Slide 1 - bold, centered, maximum impact
- "big_text_center": For impactful statements or quotes  
- "points_center": For lists (keep to 3 points max)
- "cta_slide": For the final call-to-action slide

IMAGE PROMPT (required for each slide):
For each slide, include an "imagePrompt" field (20-40 words) describing a visual scene:
- Professional/business imagery suitable for LinkedIn
- Specific visual elements, colors, and style
- No text in the image (text overlaid separately)

Examples:
- "Modern office desk with laptop showing upward graph, magnifying glass icons, blue and white professional style"
- "Split scene: person in business attire vs casual clothes, warm sunset lighting"

Return your response as a valid JSON array:
[
  {
    "number": 1,
    "finalText": "Short, powerful hook text",
    "imagePrompt": "Brief visual scene description (20-40 words)",
    "layout": "hook_slide",
    "charCount": 45
  }
]`;

      const userPrompt = `Process these ${normalizedRawTexts.length} slide texts for a "${carouselType}" style LinkedIn carousel titled "${title || 'LinkedIn Carousel'}":

${normalizedRawTexts.map((text: string, i: number) => `Slide ${i + 1}: "${text}"`).join('\n')}

Return ONLY the JSON array, no other text.`;

      let slides: any[] = [];

      if (geminiApiKey) {
        // Use Gemini for text processing
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;
        
        const response = await fetch(url, {
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

        const textContent = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!textContent) {
          throw new Error("No response from Gemini");
        }

        // Parse JSON from the response
        const jsonMatch = textContent.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          slides = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("Failed to parse AI response as JSON");
        }
      } else if (openaiApiKey) {
        // Use OpenAI for text processing
        const { OpenAI } = await import("openai");
        const openai = new OpenAI({ apiKey: openaiApiKey });

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

        const parsed = JSON.parse(content);
        slides = parsed.slides || parsed;
      }

      // Ensure each slide has required fields including base64Image placeholder
      const totalSlides = slides.length;
      const processedSlides = slides.map((slide: any, index: number) => {
        const isFirstSlide = index === 0;
        const isLastSlide = index === totalSlides - 1;
        const maxChars = isFirstSlide ? 50 : 100;
        
        // Get and clamp finalText to enforce character limits
        let finalText = (slide.finalText || normalizedRawTexts[index] || "").trim();
        if (finalText.length > maxChars) {
          // Reserve 3 chars for ellipsis to ensure total length never exceeds maxChars
          const truncateAt = maxChars - 3;
          const truncated = finalText.substring(0, truncateAt);
          const lastSpace = truncated.lastIndexOf(" ");
          // Try to break at word boundary, otherwise just truncate
          finalText = (lastSpace > truncateAt * 0.7 ? truncated.substring(0, lastSpace) : truncated) + "...";
        }
        
        const charCount = finalText.length;
        
        // Determine layout based on position
        let layout = slide.layout || "big_text_center";
        if (isFirstSlide && layout !== "hook_slide") layout = "hook_slide";
        if (isLastSlide && layout !== "cta_slide") layout = "cta_slide";
        
        // Warning for too much text (should be false after clamping)
        const tooMuchText = charCount > maxChars;
        
        // Generate a fallback imagePrompt if AI didn't provide one
        const fallbackImagePrompt = `Professional LinkedIn visual for "${finalText}". Modern, clean design with business imagery, abstract shapes or relevant icons. Corporate blue and neutral color palette, suitable for professional social media.`;
        
        return {
          number: slide.number || index + 1,
          rawText: normalizedRawTexts[index] || "",
          finalText,
          imagePrompt: slide.imagePrompt || fallbackImagePrompt,
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
   * API: Generate Images for Carousel with Base64 Storage
   * Generates images and stores them as Base64 in Firestore
   */
  app.post("/api/carousel/:carouselId/generate-images", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { carouselId } = req.params;
      const { provider = "auto" } = req.body;
      
      const { 
        getCarousel, 
        updateCarousel, 
        isFirebaseConfigured 
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

      let selectedProvider = provider;
      if (provider === "auto") {
        selectedProvider = geminiApiKey ? "gemini" : stabilityApiKey ? "stability" : openaiApiKey ? "openai" : null;
      }

      if (!selectedProvider) {
        await updateCarousel(carouselId, { status: "draft" });
        return res.status(503).json({ 
          error: "No AI API key configured. Please add GEMINI_API_KEY, STABILITY_API_KEY, or OPENAI_API_KEY." 
        });
      }

      const updatedSlides = [...carousel.slides];
      const errors: string[] = [];

      for (let i = 0; i < carousel.slides.length; i++) {
        const slide = carousel.slides[i];
        
        // Skip if already has a Base64 image
        if (slide.base64Image) {
          continue;
        }

        try {
          // Process text for display - crop if too long for image
          let displayText = (slide.finalText || "").trim();
          const maxTextLength = 120;
          if (displayText.length > maxTextLength) {
            const truncated = displayText.substring(0, maxTextLength);
            const lastSpace = truncated.lastIndexOf(" ");
            displayText = (lastSpace > maxTextLength * 0.6 ? truncated.substring(0, lastSpace) : truncated) + "...";
          }
          
          // Use ONLY the user's text to generate image - no preset examples
          const prompt = `Create a professional LinkedIn carousel slide image with the following text beautifully displayed on it:

"${displayText}"

Design the image so:
- The text is the focal point, displayed in a clean, modern, readable font
- Use an elegant background that complements the text (gradients, subtle patterns, or professional imagery)
- Text should be well-positioned with good contrast for readability
- Professional LinkedIn-appropriate style
- Square format (1:1 aspect ratio)`;

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
              const mimeType = imagePart.inlineData.mimeType || 'image/png';
              updatedSlides[i] = {
                ...updatedSlides[i],
                base64Image: `data:${mimeType};base64,${imagePart.inlineData.data}`
              };
            } else {
              errors.push(`Slide ${i + 1}: No image in Gemini response`);
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
            const base64 = Buffer.from(buffer).toString("base64");
            updatedSlides[i] = {
              ...updatedSlides[i],
              base64Image: `data:image/png;base64,${base64}`
            };
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
              updatedSlides[i] = {
                ...updatedSlides[i],
                base64Image: `data:image/png;base64,${response.data[0].b64_json}`
              };
            } else {
              errors.push(`Slide ${i + 1}: No image from OpenAI`);
            }
          }
        } catch (imgError: any) {
          console.error(`Image generation failed for slide ${i + 1}:`, imgError);
          errors.push(`Slide ${i + 1}: ${imgError.message}`);
        }
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

      // Sanitize slides for Firestore - remove undefined values and preserve all slides
      const sanitizedSlides = updatedSlides.map(slide => deepSanitize(slide));

      // Save updated slides to Firestore
      const hasAllImages = sanitizedSlides.every(s => s.base64Image);
      await updateCarousel(carouselId, { 
        slides: sanitizedSlides as any,
        status: hasAllImages ? "images_generated" : "draft"
      });

      const updatedCarousel = await getCarousel(carouselId);

      res.json({
        success: true,
        carousel: updatedCarousel,
        generatedCount: updatedSlides.filter(s => s.base64Image).length,
        totalSlides: updatedSlides.length,
        provider: selectedProvider,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error: any) {
      console.error("Generate carousel images error:", error);
      res.status(500).json({ error: error.message || "Failed to generate images" });
    }
  });

  /**
   * API: Create and Save PDF for Carousel
   * Creates PDF from Base64 images and saves it to Firestore
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
        isFirebaseConfigured 
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

      // Check if all slides have images
      const slidesWithImages = carousel.slides.filter(s => s.base64Image);
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
        if (slide.base64Image) {
          try {
            // Extract base64 data from data URL
            const base64Data = slide.base64Image.split(",")[1];
            const imgBuffer = Buffer.from(base64Data, "base64");
            doc.image(imgBuffer, 0, 0, { width: 1080, height: 1080 });
          } catch (imgError: any) {
            console.error(`Failed to add image ${i + 1} to PDF:`, imgError);
            doc.rect(0, 0, 1080, 1080).fill("#f0f0f0");
            doc.fill("#666").fontSize(24).text(`Slide ${i + 1}`, 100, 500);
          }
        }
      }

      doc.end();
      const pdfBuffer = await pdfPromise;
      const pdfBase64 = `data:application/pdf;base64,${pdfBuffer.toString("base64")}`;

      // Save PDF to Firestore
      await saveCarouselPdf(carouselId, pdfBase64);

      const updatedCarousel = await getCarousel(carouselId);

      res.json({
        success: true,
        carousel: updatedCarousel,
        pdfBase64,
        pageCount: slidesWithImages.length,
      });
    } catch (error: any) {
      console.error("Create carousel PDF error:", error);
      res.status(500).json({ error: error.message || "Failed to create PDF" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
