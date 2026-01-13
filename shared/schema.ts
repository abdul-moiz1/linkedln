import { z } from "zod";

// Auth Provider type
export type AuthProvider = "linkedin" | "firebase";

// LinkedIn User Profile from /v2/userinfo endpoint (OpenID Connect)
export const linkedInUserSchema = z.object({
  sub: z.string(),
  name: z.string().optional(),
  given_name: z.string().optional(),
  family_name: z.string().optional(),
  picture: z.string().optional(),
  email: z.string().email().optional(),
  email_verified: z.boolean().optional(),
  locale: z.union([z.string(), z.object({
    country: z.string(),
    language: z.string(),
  })]).optional(),
});

export type LinkedInUser = z.infer<typeof linkedInUserSchema>;

// Shared User Profile (Persisted in Firestore)
export interface UserProfile {
  id: string; // LinkedIn sub or Firebase UID
  fullName: string;
  email: string;
  profilePicture?: string;
  authProvider: AuthProvider;
  plan: string;
  subscriptionStatus: string;
  trialEndDate?: string;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// Linked LinkedIn Integration (for publishing only, not login)
export interface LinkedLinkedIn {
  accessToken: string;
  linkedinId: string; // LinkedIn sub (user ID)
  name?: string;
  email?: string;
  picture?: string;
  linkedAt: Date;
  expiresAt?: Date;
}

// Session User Data (stored in session)
export interface SessionUser {
  profile: LinkedInUser;
  accessToken: string;
  profileUrl?: string;
  authProvider: AuthProvider;
  linkedLinkedIn?: LinkedLinkedIn; // Linked LinkedIn for publishing (when using Firebase auth)
}

// LinkedIn Post Creation Schema
export const createPostSchema = z.object({
  text: z.string().min(1, "Post content is required").max(3000, "Post content must be less than 3000 characters"),
  media: z.array(z.object({
    url: z.string(),
    type: z.enum(["IMAGE", "VIDEO"]),
    filename: z.string(),
  })).optional(),
});

export type CreatePost = z.infer<typeof createPostSchema>;

// Repost Request Schema
export const repostSchema = z.object({
  postId: z.string().startsWith("urn:li:"), // Original post URN
  commentary: z.string().max(3000).optional(), // Optional comment on repost
});

export type RepostRequest = z.infer<typeof repostSchema>;

// Create Scheduled Post Request
export const createScheduledPostSchema = z.object({
  content: z.string().min(1, "Post content is required").max(3000, "Post content must be less than 3000 characters"),
  scheduledTime: z.string().datetime("Invalid date/time format. Use ISO 8601 format (e.g., 2025-12-31T14:30:00Z)"),
});

export type CreateScheduledPost = z.infer<typeof createScheduledPostSchema>;

// Mock/Legacy interfaces for remaining server code
export interface CarouselSlide {
  number: number;
  rawText: string;
  finalText: string;
  imagePrompt: string;
  layout: string;
  imageUrl?: string;
}

export interface Carousel {
  id: string;
  userId: string;
  title: string;
  slides: CarouselSlide[];
  status: string;
}
