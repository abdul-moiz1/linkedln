import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { linkedInUserSchema, createPostSchema, type SessionUser } from "@shared/schema";

// LinkedIn OAuth2 Configuration
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
const REDIRECT_URI = `${BASE_URL}/auth/linkedin/callback`;

// LinkedIn API endpoints
const LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const LINKEDIN_USERINFO_URL = "https://api.linkedin.com/v2/userinfo";
const LINKEDIN_SHARE_URL = "https://api.linkedin.com/v2/ugcPosts";

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
  app.get("/auth/linkedin/callback", async (req: Request, res: Response) => {
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
       * STEP 5: Store User Data in Session
       * 
       * Save the user's profile and access token in the session.
       * This allows us to:
       * 1. Display user information on the profile page
       * 2. Use the access token for API calls (like creating posts)
       * 3. Maintain authentication state across requests
       */
      req.session.user = {
        profile,
        accessToken,
      };

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
   * Used by the frontend to display user information.
   */
  app.get("/api/user", (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json(req.session.user);
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
   * Creates a text post on the authenticated user's LinkedIn profile.
   * 
   * LinkedIn Share API (v2/ugcPosts):
   * - Requires w_member_social scope
   * - Posts are created as "NONE" visibility by default (connections only)
   * - Uses UGC (User Generated Content) API format
   * 
   * Request body:
   * - text: The content of the post (1-3000 characters)
   */
  app.post("/api/share", async (req: Request, res: Response) => {
    // Verify user is authenticated
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      // Validate request body
      const { text } = createPostSchema.parse(req.body);
      const { accessToken, profile } = req.session.user;

      /**
       * Extract LinkedIn Person ID from OpenID Connect 'sub' field
       * 
       * LinkedIn's OpenID Connect returns sub in format: "linkedin-person-{PERSON_ID}"
       * We need to strip the "linkedin-person-" prefix to get the raw person ID
       * for building the correct URN format: "urn:li:person:{PERSON_ID}"
       */
      const personId = profile.sub.replace(/^linkedin-person-/, '');

      /**
       * LinkedIn UGC Post Format
       * 
       * The post payload includes:
       * - author: URN format "urn:li:person:{USER_ID}" (numeric ID only)
       * - lifecycleState: "PUBLISHED" to make post live immediately
       * - specificContent: Contains the actual post content with required locale
       * - visibility: Who can see the post (PUBLIC, CONNECTIONS, etc.)
       * 
       * Note: shareCommentary requires a locale object specifying the language
       */
      const postPayload = {
        author: `urn:li:person:${personId}`,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: {
              text: text,
              locale: {
                country: profile.locale?.split('_')[1] || "US",
                language: profile.locale?.split('_')[0] || "en",
              },
            },
            shareMediaCategory: "NONE", // Text-only post
          },
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
          "X-Restli-Protocol-Version": "2.0.0", // Required header for LinkedIn API
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
      res.json({ 
        success: true, 
        postId: shareData.id,
        message: "Post shared successfully on LinkedIn" 
      });
    } catch (error: any) {
      console.error("Share post error:", error);
      res.status(500).json({ 
        error: error.message || "Failed to share post" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
