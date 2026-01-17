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

export const styleDNAProfileSchema = z.object({
  version: z.string(),
  generatedAt: z.string(),
  sourceWordCount: z.number(),
  locked: z.boolean(),
  profile: z.object({
    voiceToneRules: z.string(),
    rhythmFlow: z.string(),
    structureTemplates: z.object({
      hooks: z.array(z.string()),
      bullets: z.string(),
      endings: z.array(z.string()),
    }),
    languagePreferences: z.string(),
    doDontList: z.object({
      do: z.array(z.string()),
      dont: z.array(z.string()),
    }),
    styleChecklist: z.array(z.string()),
    signatureElements: z.array(z.string()),
  }),
  writeLikeMePrompt: z.string(),
  fewShotExamples: z.array(z.object({
    input: z.string(),
    output: z.string(),
  })).optional(),
});

export type StyleDNAProfile = z.infer<typeof styleDNAProfileSchema>;

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
export const scheduledPosts = pgTable("scheduled_posts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  content: text("content").notNull(),
  scheduledTime: timestamp("scheduled_time").notNull(),
  status: text("status").default("pending").notNull(), // pending, posted, failed
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export interface SessionUser {
  profile: LinkedInUser;
  accessToken: string;
  profileUrl?: string;
  authProvider: AuthProvider;
  linkedLinkedIn?: LinkedLinkedIn;
  writingStyle?: string;
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

// Carousel Template Design Schema
export const templateDesignSchema = z.object({
  slides: z.array(z.object({
    backgroundColor: z.string(),
    titleText: z.string().optional(),
    bodyText: z.string().optional(),
    fontFamily: z.string(),
    fontSize: z.string(),
    textAlignment: z.enum(["left", "center", "right"]),
    imagePlaceholder: z.boolean().default(false),
    padding: z.string(),
    accentColor: z.string(),
  })),
});

export type TemplateDesign = z.infer<typeof templateDesignSchema>;

// Admin-defined carousel templates
export const carouselTemplates = pgTable("carousel_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(), // e.g. "Basic", "Educational", "Story"
  thumbnailUrl: text("thumbnail_url"),
  previewSlides: text("preview_slides"), // JSON string array of slide image URLs
  slideCount: integer("slide_count").notNull(),
  isPublic: boolean("is_public").default(true).notNull(),
  designSchema: text("design_schema").notNull(), // JSON string of TemplateDesign
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User-owned customized carousels
export const userCarousels = pgTable("user_carousels", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  templateId: integer("template_id").references(() => carouselTemplates.id),
  customizedDesignSchema: text("customized_design_schema").notNull(), // JSON string
  status: text("status").default("draft").notNull(), // draft, scheduled, published
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCarouselTemplateSchema = createInsertSchema(carouselTemplates).omit({
  id: true,
  createdAt: true,
});

export const insertUserCarouselSchema = createInsertSchema(userCarousels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CarouselTemplate = typeof carouselTemplates.$inferSelect;
export type UserCarousel = typeof userCarousels.$inferSelect;
export type InsertCarouselTemplate = z.infer<typeof insertCarouselTemplateSchema>;
export type InsertUserCarousel = z.infer<typeof insertUserCarouselSchema>;

export interface Carousel {
  id: string;
  userId: string;
  title: string;
  slides: CarouselSlide[];
  status: string;
}
