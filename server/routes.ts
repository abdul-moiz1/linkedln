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
      };

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

      // Redirect to the profile page where user can see their data
      res.redirect("/profile");
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
      // This overrides the task's default input with the user-provided profile URL
      // Different Apify LinkedIn scrapers use different input field names:
      // - "profileUrls" for harvestapi/linkedin-profile-posts, apimaestro/linkedin-profile-posts
      // - "startUrls" for curious_coder/linkedin-post-search-scraper
      // - "urls" for some other actors
      // We provide all common field names to maximize compatibility
      const inputOverride = profileUrl ? {
        profileUrls: [profileUrl],
        startUrls: [profileUrl],
        urls: [profileUrl],
        profiles: [profileUrl],
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
        console.warn("Check your Apify task configuration to ensure it accepts startUrls, profileUrls, profiles, or urls input.");
        
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
   * Generates images using OpenAI's DALL-E, Google's Gemini, or Stability AI based on text prompts.
   * Each message in the array becomes an image in the carousel.
   * Provider can be "openai", "gemini", or "stability" (auto selects first available)
   */
  app.post("/api/images/generate", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

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
            const prompt = `Create a professional, visually appealing LinkedIn carousel slide with the following message: "${messages[i]}". Make it clean, modern, and suitable for professional social media. Use bold typography and subtle gradients. The image should be square format.`;
            
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
            const prompt = `${messages[i]}, professional illustration, modern style`;
            
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
            const prompt = `Create a professional, visually appealing LinkedIn carousel slide with the following message: "${messages[i]}". Make it clean, modern, and suitable for professional social media. Use bold typography and subtle gradients.`;
            
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
   * API: Create PDF from Images
   * 
   * Converts an array of image URLs into a multi-page PDF document.
   * Each image becomes a page in the carousel PDF.
   */
  app.post("/api/pdf/create", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { imageUrls, title } = req.body;

      if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
        return res.status(400).json({ error: "Image URLs array is required" });
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

      for (let i = 0; i < imageUrls.length; i++) {
        if (i > 0) {
          doc.addPage();
        }

        try {
          const imgResponse = await fetch(imageUrls[i]);
          const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());
          doc.image(imgBuffer, 0, 0, { width: 1080, height: 1080 });
        } catch (imgError: any) {
          console.error(`Failed to fetch image ${i + 1}:`, imgError);
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
        pageCount: imageUrls.length,
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
      const { pdfBase64, caption, title } = req.body;

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
      
      res.json({ 
        success: true, 
        postId: postId,
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

  const httpServer = createServer(app);
  return httpServer;
}
