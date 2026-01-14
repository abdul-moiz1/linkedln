import { z } from "zod";
import { pgTable, text, serial, integer, boolean, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

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
export const users = pgTable("users", {
  id: varchar("id").primaryKey(), // LinkedIn sub or Firebase UID
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  profilePicture: text("profile_picture"),
  authProvider: text("auth_provider").$type<AuthProvider>().notNull(),
  plan: text("plan").default("free").notNull(),
  subscriptionStatus: text("subscription_status").default("none").notNull(),
  trialEndDate: timestamp("trial_end_date"),
  onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),
  writingStyle: text("writing_style"),
  styleProfile: text("style_profile"), // Structured style data as JSON string
  promptStyleInstruction: text("prompt_style_instruction"), // Prompt-ready instruction string
  styleDNA: text("style_dna"), // Full Style DNA system (JSON string)
  writeLikeMePrompt: text("write_like_me_prompt"), // Reusable instruction block for LLMs
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export type UserProfile = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

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
