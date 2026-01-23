# LinkedIn Carousel Maker

## Overview
This project is a professional SaaS application designed to empower users to create AI-generated LinkedIn carousels. The core functionality includes enabling users to input text messages, leverage AI for image generation, convert these into a PDF carousel, and directly upload them to LinkedIn. The application aims to streamline content creation for LinkedIn, offering a robust platform for engaging professional content.

## User Preferences
- I prefer clear and concise communication.
- I like a systematic and iterative approach to development.
- I value detailed explanations for complex features.
- Please ask for confirmation before making significant architectural changes or adding new external dependencies.
- Ensure that UI/UX decisions prioritize a modern, professional, and intuitive user experience.

## System Architecture

### Core Functionality
The application allows users to generate carousels from text input or a URL (which is then summarized by AI), generate AI images, combine them into a PDF, and post directly to LinkedIn. It also supports saving project drafts and provides a dedicated preview page.

### Frontend (React + TypeScript)
- **Frameworks**: React, TypeScript.
- **UI/UX**: Utilizes `shadcn/ui` components with Tailwind CSS for a clean, modern, and professional aesthetic.
- **State Management**: TanStack Query is used for efficient API call management and data caching.
- **Pages**: Key pages include Home (SaaS landing), Login, Signup, Create (carousel wizard), Preview (LinkedIn-style preview), and Profile (user dashboard).

### Backend (Express + Node.js)
- **Framework**: Express.js with Node.js.
- **Authentication**: Handles LinkedIn OAuth2 for posting functionality and Firebase Authentication for user login/signup (Google, Email/Password).
- **API Endpoints**: Comprehensive API for user management, image generation, PDF creation, LinkedIn post handling, project saving, and fetching LinkedIn posts via Apify.
- **Session Management**: Uses `express-session` for user session handling.

### Database (Firebase/Firestore)
- **Type**: NoSQL document database.
- **Collections**: Manages `users` (profiles, tokens), `projects` (carousel drafts), `posts_cache` (cached LinkedIn posts with TTL), and `sessions`.
- **Storage**: Firebase Storage is used for storing generated PDF carousels.

### AI Integration
- Supports multiple AI providers for image generation: Gemini, Stability AI, and OpenAI DALL-E.
- Utilizes AI for summarizing content from URLs to create carousel slides.

### Security
- Implements CSRF protection, HttpOnly session cookies, secure cookies for production, and environment-based secret management.
- Leverages Firebase Admin SDK for secure backend operations.

### Semantic Search
- Integrates Pinecone vector database for semantic search capabilities, utilizing OpenAI's `text-embedding-3-small` model. Users can search carousels and templates by meaning.

## External Dependencies

- **Firebase/Firestore**: Database and authentication services.
- **Firebase Storage**: Cloud storage for PDFs.
- **OpenAI API**: For AI image generation and text embeddings (text-embedding-3-small model).
- **Google Gemini API**: For AI image generation.
- **Stability AI API**: For AI image generation.
- **Apify**: For scraping LinkedIn posts.
- **LinkedIn API**: For OAuth2 authentication and posting carousels.
- **Pinecone**: Vector database for semantic search.