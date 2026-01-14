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
  getCarouselTemplates(): Promise<CarouselTemplate[]>;
}

export class MemStorage implements IStorage {
  async getCarouselTemplates(): Promise<CarouselTemplate[]> {
    try {
      // Return empty array instead of failing if table doesn't exist
      // Since we are moving to Firestore for templates, we should 
      // primarily use the /api/templates endpoint.
      return [];
    } catch (error) {
      console.error("Error in getCarouselTemplates:", error);
      return [];
    }
  }
}

export const storage = new MemStorage();
