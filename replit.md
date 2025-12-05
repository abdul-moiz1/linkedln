# LinkedIn Carousel Maker

## Project Overview
A professional SaaS application that allows users to create AI-generated LinkedIn carousels. Users can enter text messages, have AI generate images, convert them to a PDF carousel, and upload directly to LinkedIn.

**Current State**: Full-stack application with Firebase/Firestore integration.

## Recent Changes (December 2024)
- Transformed from OAuth demo to full LinkedIn Carousel Maker SaaS
- Created professional landing page with hero, how-it-works, features sections
- Added Firebase/Firestore integration for data persistence
- Implemented AI image generation using OpenAI DALL-E
- Added PDF carousel creation functionality
- Integrated LinkedIn document upload for carousels
- Added project draft saving functionality
- **Dec 4**: Added professional hero background image with gradient overlays
- **Dec 4**: Fixed header - keeps same nav links (Home, How It Works, Features) when logged in, only replaces Login with avatar
- **Dec 4**: Fixed LinkedIn posting error - now handles empty API responses correctly
- **Dec 4**: Added beautiful hover effects throughout homepage (buttons, cards, icons)
- **Dec 4**: Redesigned footer with 4-column layout, social links, and gradient background
- **Dec 4**: Improved "How It Works" section with colorful icons, card hover animations, and step indicators
- **Dec 4**: Redesigned "Share on LinkedIn" section to match LinkedIn's native post creation interface
- **Dec 4**: Added Apify LinkedIn Post Scraper integration for fetching user posts with engagement metrics
- **Dec 4**: Added "My LinkedIn Posts" page with Most Viral filter and responsive grid layout
- **Dec 4**: Fixed profile URL issue - added dialog for users to enter their LinkedIn profile URL (Apify needs public URL, not OpenID sub)
- **Dec 4**: Reverted Apify integration to use Task API with APIFY_TASK_ID for user's pre-configured scraper
- **Dec 4**: Redesigned Posts page with LinkedIn-style cards (profile picture, author info, reaction icons, engagement stats)
- **Dec 4**: Fixed repost functionality to properly extract and use LinkedIn URNs (activity_urn, share_urn, ugcPost_urn) instead of URLs
- **Dec 4**: Added auto-fetch for My Posts page - posts load automatically when profileUrl is stored in Firestore
- **Dec 4**: Extended SessionUser type to include optional profileUrl for type-safe frontend usage
- **Dec 4**: Made updateUserProfileUrl upsert-safe using Firestore set/merge for robustness
- **Dec 4**: Fixed Apify input override to use correct `urls` field per LinkedIn Post Scraper documentation
- **Dec 4**: Added comprehensive logging for Firebase and Apify operations for debugging
- **Dec 4**: Added warning message when zero posts are returned to help diagnose configuration issues
- **Dec 4**: Added Firestore caching for LinkedIn posts (24-hour TTL) to reduce Apify scraping calls
- **Dec 4**: Fixed Apify input format to include profileUrls/startUrls/urls/profiles for maximum actor compatibility
- **Dec 4**: Added /api/posts/clear-cache endpoint and forceRefresh parameter to bypass cache
- **Dec 4**: Fixed Apify integration - now correctly sends `username` field (not arrays) to apimaestro/linkedin-profile-posts actor
- **Dec 4**: Added PATCH /api/user/profile-url endpoint to persist profile URL changes to Firestore
- **Dec 4**: Added ability to edit/clear profile URL from Posts page with proper backend persistence
- **Dec 4**: Fixed image display - added getImageUrl helper to extract URLs from Apify image objects (which can be strings or objects)
- **Dec 4**: Redesigned Posts page with two-column layout: LinkedIn-style user card sidebar (left) and posts feed (right)
- **Dec 4**: Simplified Posts page header - minimal inline controls, removed bulky profile URL card
- **Dec 4**: Added user stats card showing total posts, reactions, and comments with LinkedIn profile link
- **Dec 4**: Added expandable post text with "...see more" / "Show less" toggle for long posts (>300 chars)
- **Dec 4**: Split refresh into two buttons: Cache Refresh (quick, from Firebase) and Re-scrape (full Apify scrape)
- **Dec 4**: Clear expanded post state when posts are refreshed
- **Dec 5**: Converted carousel type selection from grid cards to dropdown (Select component)
- **Dec 5**: Added AI provider selection dropdown in the type-select step with options: Auto, Gemini, OpenAI DALL-E, Stability AI
- **Dec 5**: Simplified input step by showing selected options as badges instead of duplicate dropdowns
- **Dec 5**: Improved carousel creation flow with cleaner two-column layout for selections
- **Dec 5**: Implemented guest-first flow - users can create carousels without logging in
- **Dec 5**: Created `/create` page for carousel creation with localStorage draft saving
- **Dec 5**: Created `/preview` page for LinkedIn-style preview before posting
- **Dec 5**: Made `/api/carousel/process`, `/api/images/generate`, `/api/pdf/create` guest-friendly (no auth required)
- **Dec 5**: LinkedIn OAuth only required when posting - triggered from preview page "Post to LinkedIn" button
- **Dec 5**: Added "Create" navigation link in header for easy access to carousel creation
- **Dec 5**: Fixed PDF creation to handle both base64 data URLs and remote URLs
- **Dec 5**: Fixed localStorage quota exceeded error - implemented in-memory carousel store for image data during navigation
- **Dec 5**: Updated hero section with new headline "Create Stunning LinkedIn Carousels in Minutes" and darkened overlay
- **Dec 5**: Simplified navbar - removed Create button, now shows: Home | How It Works | Features | Login
- **Dec 5**: Created dedicated login page at `/login` with LinkedIn OAuth
- **Dec 5**: Implemented login-first flow - "Start Creating" button redirects to login, carousel creation requires auth
- **Dec 5**: Updated user flow: Homepage → Login → Create → Preview → Post
- **Dec 5**: Simplified authentication - Removed LinkedIn login from login/signup pages (LinkedIn OAuth only needed when posting carousels)
- **Dec 5**: Created separate `/signup` page with Name, Email, Password, Confirm Password fields
- **Dec 5**: Redesigned login page with Google login and email/password only (no LinkedIn)
- **Dec 5**: Added "Forgot password?" functionality using Firebase password reset
- **Dec 5**: Fixed Firebase environment variables configuration for proper authentication
- **Dec 5**: Added authProvider field to SessionUser type to distinguish LinkedIn OAuth vs Firebase users
- **Dec 5**: Updated Header to conditionally show LinkedIn-only features (My Profile, My Posts, Scheduled Posts) only for LinkedIn OAuth users
- **Dec 5**: Redesigned create.tsx with elegant minimal professional look - progress indicator, cleaner cards, refined typography

## Architecture

### Frontend (React + TypeScript)
- **Home Page** (`/`): Professional SaaS landing page with login options
- **Profile Page** (`/profile`): User dashboard after login
- **Design System**: Clean, modern UI using shadcn/ui components with Tailwind CSS
- **State Management**: TanStack Query for API calls and caching

### Backend (Express + Node.js)
- **OAuth2 Routes**:
  - `GET /auth/linkedin` - Initiates authorization flow
  - `GET /auth/linkedin/callback` - Handles callback, exchanges code for token
- **API Routes**:
  - `GET /api/user` - Returns current user session data (includes profileUrl from Firestore)
  - `PATCH /api/user/profile-url` - Updates or clears user's LinkedIn profile URL in Firestore
  - `POST /api/logout` - Destroys user session
  - `POST /api/share` - Creates LinkedIn post
  - `POST /api/images/generate` - Generates AI images using Gemini, Stability AI, or OpenAI
  - `POST /api/pdf/create` - Creates PDF from images
  - `POST /api/linkedin/upload` - Uploads carousel to LinkedIn
  - `POST /api/project/save` - Saves project drafts
  - `GET /api/projects` - Gets user projects
  - `GET /api/project/:projectId` - Gets single project
  - `POST /api/posts/fetch` - Fetches LinkedIn posts via Apify scraper (sends `username` field)
  - `POST /api/posts/clear-cache` - Clears cached posts for the user
- **Session Management**: Express-session with in-memory storage

### Database (Firebase/Firestore)
Collections:
- `users` - LinkedIn user profiles and tokens (includes profileUrl)
- `projects` - Carousel projects and drafts
- `posts_cache` - Cached LinkedIn posts with 24-hour TTL
- `sessions` - User sessions

## Environment Variables
Required secrets:
- `LINKEDIN_CLIENT_ID` - LinkedIn app Client ID
- `LINKEDIN_CLIENT_SECRET` - LinkedIn app Client Secret
- `BASE_URL` - Application base URL
- `SESSION_SECRET` - Session encryption secret
- `GEMINI_API_KEY` - Google Gemini API key for image generation (preferred)
- `STABILITY_API_KEY` - Stability AI API key for image generation (alternative)
- `OPENAI_API_KEY` - OpenAI API key for image generation (fallback)
- `FIREBASE_PROJECT_ID` - Firebase project ID
- `FIREBASE_CLIENT_EMAIL` - Firebase service account email
- `FIREBASE_PRIVATE_KEY` - Firebase service account private key
- `APIFY_TOKEN` - Apify API token for LinkedIn post scraping
- `APIFY_TASK_ID` - Apify task ID for the LinkedIn scraper task

Frontend Firebase credentials (VITE_ prefixed for client-side access):
- `VITE_FIREBASE_API_KEY` - Firebase web API key
- `VITE_FIREBASE_AUTH_DOMAIN` - Firebase auth domain
- `VITE_FIREBASE_PROJECT_ID` - Firebase project ID
- `VITE_FIREBASE_STORAGE_BUCKET` - Firebase storage bucket
- `VITE_FIREBASE_MESSAGING_SENDER_ID` - Firebase messaging sender ID
- `VITE_FIREBASE_APP_ID` - Firebase app ID

## LinkedIn API Configuration
**Redirect URI**: `{BASE_URL}/auth/linkedin/callback`

**Required Scopes**:
- `openid` - OpenID Connect authentication
- `profile` - Basic profile information
- `email` - User email address
- `w_member_social` - Permission to post on user's behalf

## Project Structure
```
├── client/
│   └── src/
│       ├── pages/
│       │   ├── home.tsx         # SaaS landing page
│       │   ├── login.tsx        # Login page (Google + Email/Password)
│       │   ├── signup.tsx       # Sign up page (Name, Email, Password)
│       │   ├── create.tsx       # Carousel creation wizard
│       │   ├── preview.tsx      # Carousel preview before posting
│       │   └── profile.tsx      # User dashboard
│       ├── components/ui/       # shadcn/ui components
│       ├── lib/
│       │   ├── firebase.ts      # Firebase client config
│       │   └── carouselStore.ts # In-memory store for carousel data
│       └── App.tsx              # Router configuration
├── server/
│   ├── index.ts                 # Express server setup
│   ├── routes.ts                # All API routes
│   └── lib/
│       └── firebase-admin.ts    # Firebase Admin SDK
├── shared/
│   └── schema.ts                # TypeScript types & Zod schemas
└── design_guidelines.md         # UI/UX specifications
```

## How It Works
1. User signs in with Google or Email/Password (Firebase Auth)
2. User enters 4-5 text messages for carousel slides
3. AI generates professional images from text
4. Images are combined into a PDF carousel
5. User previews and connects LinkedIn OAuth (only when posting)
6. User uploads carousel directly to LinkedIn
7. Projects can be saved as drafts for later

## Security Features
- CSRF protection using state parameter
- HttpOnly session cookies
- Secure cookies in production (HTTPS)
- Environment-based secret management
- Firebase Admin SDK for secure backend operations
