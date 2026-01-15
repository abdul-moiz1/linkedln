import { users, projects, postsCache, sessions, carouselTemplates, type User, type Project, type CarouselTemplate, type InsertCarouselTemplate } from "@shared/schema";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and, desc } from "drizzle-orm";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

export function getDb() {
  return db;
}

export interface IStorage {
  // We're primarily using Firestore now as requested
}

export class MemStorage implements IStorage {
}

export const storage = new MemStorage();
