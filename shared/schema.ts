import { z } from "zod";

// LinkedIn User Profile from /v2/userinfo endpoint (OpenID Connect)
export const linkedInUserSchema = z.object({
  sub: z.string(),
  name: z.string().optional(),
  given_name: z.string().optional(),
  family_name: z.string().optional(),
  picture: z.string().optional(),
  email: z.string().email().optional(),
  email_verified: z.boolean().optional(),
  locale: z.string().optional(),
});

export type LinkedInUser = z.infer<typeof linkedInUserSchema>;

// LinkedIn Post Creation Schema
export const createPostSchema = z.object({
  text: z.string().min(1, "Post content is required").max(3000, "Post content must be less than 3000 characters"),
});

export type CreatePost = z.infer<typeof createPostSchema>;

// Session User Data (stored in session)
export interface SessionUser {
  profile: LinkedInUser;
  accessToken: string;
}
