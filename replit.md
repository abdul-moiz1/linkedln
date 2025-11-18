# LinkedIn OAuth2 Demo Application

## Project Overview
A comprehensive demonstration of LinkedIn OAuth2 authentication using OpenID Connect. This application showcases the complete OAuth2 authorization code flow, profile data retrieval, and LinkedIn post sharing functionality.

**Current State**: Fully functional LinkedIn OAuth2 demo with session-based authentication.

## Recent Changes (November 18, 2025)
- Implemented complete LinkedIn OAuth2 flow with CSRF protection
- Built beautiful UI with React, TypeScript, and Tailwind CSS
- Added comprehensive code comments explaining every OAuth2 step
- Integrated LinkedIn /v2/userinfo (OpenID Connect) for profile data
- Implemented LinkedIn post sharing via /v2/ugcPosts API
- Set up Express session management for user authentication state

## Architecture

### Frontend (React + TypeScript)
- **Home Page** (`/`): Login with LinkedIn button, initiates OAuth2 flow
- **Profile Page** (`/profile`): Displays user info, access token, and post creation form
- **Design System**: Clean, professional UI using shadcn/ui components
- **State Management**: TanStack Query for API calls and caching

### Backend (Express + Node.js)
- **OAuth2 Routes**:
  - `GET /auth/linkedin` - Initiates authorization flow
  - `GET /auth/linkedin/callback` - Handles callback, exchanges code for token
- **API Routes**:
  - `GET /api/user` - Returns current user session data
  - `POST /api/logout` - Destroys user session
  - `POST /api/share` - Creates LinkedIn post using user's access token
- **Session Management**: Express-session with in-memory storage

### OAuth2 Flow Steps
1. User clicks "Login with LinkedIn"
2. Redirect to LinkedIn authorization page (with state for CSRF protection)
3. User grants permissions
4. LinkedIn redirects to callback with authorization code
5. Exchange code for access token
6. Fetch user profile from /v2/userinfo
7. Store user data in session
8. Display profile and enable post creation

## Environment Variables
Required secrets (configured via Replit Secrets):
- `LINKEDIN_CLIENT_ID` - LinkedIn app Client ID
- `LINKEDIN_CLIENT_SECRET` - LinkedIn app Client Secret
- `BASE_URL` - Application base URL (e.g., https://your-app.replit.dev)
- `SESSION_SECRET` - Secret for session encryption (auto-generated)

## LinkedIn API Configuration
**Redirect URI**: `{BASE_URL}/auth/linkedin/callback`

**Required Scopes**:
- `openid` - OpenID Connect authentication
- `profile` - Basic profile information
- `email` - User email address
- `w_member_social` - Permission to post on user's behalf

**API Endpoints Used**:
- Authorization: `https://www.linkedin.com/oauth/v2/authorization`
- Token Exchange: `https://www.linkedin.com/oauth/v2/accessToken`
- User Profile: `https://api.linkedin.com/v2/userinfo`
- Post Sharing: `https://api.linkedin.com/v2/ugcPosts`

## Project Structure
```
├── client/
│   └── src/
│       ├── pages/
│       │   ├── home.tsx         # Login page
│       │   └── profile.tsx      # Profile & post creation
│       ├── components/ui/       # shadcn/ui components
│       └── App.tsx              # Router configuration
├── server/
│   ├── index.ts                 # Express server with session setup
│   └── routes.ts                # OAuth2 & API routes (heavily commented)
├── shared/
│   └── schema.ts                # TypeScript types & Zod schemas
└── design_guidelines.md         # UI/UX design specifications
```

## Running the Application
1. Configure environment variables in Replit Secrets
2. Add redirect URI to LinkedIn app settings
3. Start the application (runs automatically via workflow)
4. Access at the Replit dev URL shown in preview

## Security Features
- CSRF protection using state parameter
- HttpOnly session cookies
- Secure cookies in production (HTTPS)
- Environment-based secret management
- Session expiration (24 hours)

## Next Steps
Future enhancements could include:
- Token refresh logic for expired access tokens
- Persistent database storage for user sessions
- Enhanced error handling for API rate limits
- Image upload support for LinkedIn posts
- Display LinkedIn post history and analytics
