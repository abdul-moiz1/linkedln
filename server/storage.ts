import { users, projects, postsCache, sessions, carouselTemplates, type User, type Project, type CarouselTemplate, type InsertCarouselTemplate } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  getCarouselTemplates(): Promise<CarouselTemplate[]>;
}

export class MemStorage implements IStorage {
  async getCarouselTemplates(): Promise<CarouselTemplate[]> {
    return await db.select().from(carouselTemplates);
  }
}

export const storage = new MemStorage();
