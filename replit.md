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
  - `GET /api/user` - Returns current user session data
  - `POST /api/logout` - Destroys user session
  - `POST /api/share` - Creates LinkedIn post
  - `POST /api/images/generate` - Generates AI images using Gemini, Stability AI, or OpenAI
  - `POST /api/pdf/create` - Creates PDF from images
  - `POST /api/linkedin/upload` - Uploads carousel to LinkedIn
  - `POST /api/project/save` - Saves project drafts
  - `GET /api/projects` - Gets user projects
  - `GET /api/project/:projectId` - Gets single project
- **Session Management**: Express-session with in-memory storage

### Database (Firebase/Firestore)
Collections:
- `users` - LinkedIn user profiles and tokens
- `projects` - Carousel projects and drafts
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
│       │   └── profile.tsx      # User dashboard
│       ├── components/ui/       # shadcn/ui components
│       ├── lib/
│       │   └── firebase.ts      # Firebase client config
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
1. User signs in with LinkedIn OAuth2
2. User enters 4-5 text messages for carousel slides
3. AI generates professional images from text
4. Images are combined into a PDF carousel
5. User previews and uploads directly to LinkedIn
6. Projects can be saved as drafts for later

## Security Features
- CSRF protection using state parameter
- HttpOnly session cookies
- Secure cookies in production (HTTPS)
- Environment-based secret management
- Firebase Admin SDK for secure backend operations
