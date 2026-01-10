import { z } from "zod";
import { pgTable, text, timestamp, varchar, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

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

// Auth Provider type
export type AuthProvider = "linkedin" | "firebase";

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

// LinkedIn Post from /rest/posts API
export const linkedInPostSchema = z.object({
  id: z.string(), // URN like "urn:li:share:123456"
  author: z.string(), // URN like "urn:li:person:abc"
  commentary: z.string().optional(),
  publishedAt: z.number().optional(), // Unix timestamp in milliseconds
  lifecycleState: z.string().optional(), // "PUBLISHED", "DRAFT", etc.
  visibility: z.string().optional(), // "PUBLIC", "CONNECTIONS", etc.
  reshareContext: z.object({
    parent: z.string(),
    root: z.string().optional(),
  }).optional(),
});

export type LinkedInPost = z.infer<typeof linkedInPostSchema>;

// LinkedIn Post Analytics from /v2/socialActions API
export const postAnalyticsSchema = z.object({
  postId: z.string(),
  likesSummary: z.object({
    totalLikes: z.number(),
    likedByCurrentUser: z.boolean().optional(),
  }),
  commentsSummary: z.object({
    totalFirstLevelComments: z.number(),
    aggregatedTotalComments: z.number().optional(),
  }),
});

export type PostAnalytics = z.infer<typeof postAnalyticsSchema>;

// Combined Post with Analytics
export interface PostWithAnalytics extends LinkedInPost {
  analytics?: PostAnalytics;
}

// Repost Request Schema
export const repostSchema = z.object({
  postId: z.string().startsWith("urn:li:"), // Original post URN
  commentary: z.string().max(3000).optional(), // Optional comment on repost
});

export type RepostRequest = z.infer<typeof repostSchema>;

// Scheduled Post Schema (for database storage)
export const scheduledPostSchema = z.object({
  id: z.string().optional(),
  userId: z.string(), // LinkedIn sub (person ID)
  content: z.string().min(1).max(3000),
  scheduledTime: z.string().datetime(), // ISO 8601 format
  status: z.enum(["pending", "posted", "failed"]).default("pending"),
  createdAt: z.string().datetime().optional(),
  postedAt: z.string().datetime().optional(),
  errorMessage: z.string().optional(),
});

export type ScheduledPost = z.infer<typeof scheduledPostSchema>;

// User Profile Table (for additional info and subscription)
export const users = pgTable("users", {
  id: varchar("id").primaryKey(), // LinkedIn sub or Firebase UID
  fullName: varchar("full_name"),
  email: varchar("email"),
  phone: varchar("phone"),
  plan: varchar("plan", { length: 20 }).default("free"), // "free", "starter", "intermediate", "pro"
  subscriptionStatus: varchar("subscription_status", { length: 20 }).default("none"), // "none", "trialing", "active", "canceled"
  stripeCustomerId: varchar("stripe_customer_id"),
  trialEndDate: timestamp("trial_end_date", { withTimezone: true }),
  onboardingCompleted: varchar("onboarding_completed", { length: 10 }).default("false"),
  carouselCount: integer("carousel_count").default(0),
});

export const insertUserSchema = createInsertSchema(users).omit({
  onboardingCompleted: true,
  carouselCount: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type SelectUser = typeof users.$inferSelect;

// Create Scheduled Post Request
export const createScheduledPostSchema = z.object({
  content: z.string().min(1, "Post content is required").max(3000, "Post content must be less than 3000 characters"),
  scheduledTime: z.string().datetime("Invalid date/time format. Use ISO 8601 format (e.g., 2025-12-31T14:30:00Z)"),
});

export type CreateScheduledPost = z.infer<typeof createScheduledPostSchema>;

// Drizzle Database Table: Scheduled Posts
export const scheduledPosts = pgTable("scheduled_posts", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id").notNull(), // LinkedIn sub (person ID)
  content: text("content").notNull(),
  scheduledTime: timestamp("scheduled_time", { withTimezone: true }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // "pending", "posted", "failed"
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  postedAt: timestamp("posted_at", { withTimezone: true }),
  errorMessage: text("error_message"),
});

// Drizzle-Zod Insert Schema (for validation)
export const insertScheduledPostSchema = createInsertSchema(scheduledPosts).omit({
  id: true,
  createdAt: true,
  postedAt: true,
});

export type InsertScheduledPost = z.infer<typeof insertScheduledPostSchema>;
export type SelectScheduledPost = typeof scheduledPosts.$inferSelect;
