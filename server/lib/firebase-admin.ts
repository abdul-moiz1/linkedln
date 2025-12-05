import admin from "firebase-admin";

const isFirebaseConfigured = Boolean(
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY
);

let adminDb: admin.firestore.Firestore | null = null;
let adminAuth: admin.auth.Auth | null = null;

if (isFirebaseConfigured) {
  try {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    };

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      });
    }

    adminDb = admin.firestore();
    adminAuth = admin.auth();
  } catch (error) {
    console.warn("Firebase initialization failed:", error);
  }
}

function getDb() {
  if (!adminDb) {
    throw new Error("Firebase not configured. Please add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY to your secrets.");
  }
  return adminDb;
}

export { adminDb, adminAuth, isFirebaseConfigured };

export interface User {
  id: string;
  linkedinId: string;
  email: string;
  name: string;
  profilePicture?: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  userId: string;
  title: string;
  messages: string[];
  imageUrls: string[];
  pdfUrl?: string;
  status: "draft" | "images_generated" | "pdf_created" | "published";
  linkedinPostId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Carousel Types for LinkedIn-style carousels
export type CarouselType = 
  | "story-flow"
  | "educational"
  | "before-after"
  | "checklist"
  | "quote"
  | "stats-data"
  | "portfolio"
  | "comparison"
  | "achievement"
  | "framework";

export interface CarouselTypeInfo {
  id: CarouselType;
  name: string;
  description: string;
  slideCount: { min: number; max: number };
}

export const CAROUSEL_TYPES: CarouselTypeInfo[] = [
  { id: "story-flow", name: "Story-Flow", description: "Tell a narrative across slides", slideCount: { min: 3, max: 5 } },
  { id: "educational", name: "Educational", description: "Teach concepts step by step", slideCount: { min: 3, max: 5 } },
  { id: "before-after", name: "Before/After", description: "Show transformation or comparison", slideCount: { min: 2, max: 4 } },
  { id: "checklist", name: "Checklist", description: "Present actionable items", slideCount: { min: 3, max: 5 } },
  { id: "quote", name: "Quote", description: "Feature impactful quotes", slideCount: { min: 2, max: 4 } },
  { id: "stats-data", name: "Stats/Data", description: "Present key statistics", slideCount: { min: 3, max: 5 } },
  { id: "portfolio", name: "Portfolio", description: "Showcase work examples", slideCount: { min: 3, max: 5 } },
  { id: "comparison", name: "Comparison", description: "Compare options or choices", slideCount: { min: 2, max: 4 } },
  { id: "achievement", name: "Achievement", description: "Highlight accomplishments", slideCount: { min: 2, max: 5 } },
  { id: "framework", name: "Framework", description: "Present a methodology or process", slideCount: { min: 3, max: 5 } },
];

// Layout types for slides
export type SlideLayout = "title_top" | "big_text_center" | "points_center" | "footer_cta" | "split_image_text";

// Individual slide in a carousel
export interface CarouselSlide {
  number: number;
  rawText: string;
  finalText: string;
  imagePrompt: string;
  layout: SlideLayout;
  base64Image?: string; // data:image/png;base64,...
}

// Carousel document structure for Firestore
export interface Carousel {
  id: string;
  userId: string;
  title: string;
  carouselType: CarouselType;
  slides: CarouselSlide[];
  pdfBase64?: string; // data:application/pdf;base64,...
  status: "draft" | "processing" | "images_generated" | "pdf_created" | "published";
  linkedinPostId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  accessToken: string;
  expiresAt: Date;
  createdAt: Date;
}

export async function saveUser(userData: Omit<User, "id" | "createdAt" | "updatedAt">) {
  const db = getDb();
  const now = new Date();
  const userRef = db.collection("users").doc(userData.linkedinId);
  
  await userRef.set({
    ...userData,
    updatedAt: now,
  }, { merge: true });

  const doc = await userRef.get();
  if (!doc.exists) {
    await userRef.set({
      ...userData,
      createdAt: now,
      updatedAt: now,
    });
  }

  return { id: userRef.id, ...userData };
}

export async function getUser(linkedinId: string): Promise<User | null> {
  const db = getDb();
  const doc = await db.collection("users").doc(linkedinId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as User;
}

export async function saveProject(projectData: Omit<Project, "id" | "createdAt" | "updatedAt">) {
  const db = getDb();
  const now = new Date();
  const projectRef = db.collection("projects").doc();
  
  await projectRef.set({
    ...projectData,
    createdAt: now,
    updatedAt: now,
  });

  return { id: projectRef.id, ...projectData, createdAt: now, updatedAt: now };
}

export async function updateProject(projectId: string, updates: Partial<Project>) {
  const db = getDb();
  const projectRef = db.collection("projects").doc(projectId);
  await projectRef.update({
    ...updates,
    updatedAt: new Date(),
  });
}

export async function getUserProjects(userId: string): Promise<Project[]> {
  const db = getDb();
  const snapshot = await db.collection("projects")
    .where("userId", "==", userId)
    .orderBy("updatedAt", "desc")
    .get();
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
}

export async function getProject(projectId: string): Promise<Project | null> {
  const db = getDb();
  const doc = await db.collection("projects").doc(projectId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Project;
}

export async function updateUserProfileUrl(userId: string, profileUrl: string): Promise<void> {
  const db = getDb();
  const userRef = db.collection("users").doc(userId);
  await userRef.set({
    profileUrl,
    updatedAt: new Date(),
  }, { merge: true });
}

// Cache TTL in milliseconds (24 hours)
const POSTS_CACHE_TTL = 24 * 60 * 60 * 1000;

export interface CachedPosts {
  userId: string;
  posts: any[];
  cachedAt: Date;
  expiresAt: Date;
}

/**
 * Get cached LinkedIn posts for a user
 * Returns null if cache is expired or doesn't exist
 */
export async function getCachedPosts(userId: string): Promise<any[] | null> {
  const db = getDb();
  const cacheRef = db.collection("posts_cache").doc(userId);
  const doc = await cacheRef.get();
  
  if (!doc.exists) {
    return null;
  }
  
  const data = doc.data() as CachedPosts;
  const expiresAt = data.expiresAt instanceof Date ? data.expiresAt : new Date((data.expiresAt as any).toDate());
  
  // Check if cache is expired
  if (expiresAt < new Date()) {
    console.log(`Posts cache expired for user ${userId}`);
    return null;
  }
  
  console.log(`Found ${data.posts?.length || 0} cached posts for user ${userId}`);
  return data.posts;
}

/**
 * Save LinkedIn posts to cache for a user
 */
export async function saveCachedPosts(userId: string, posts: any[]): Promise<void> {
  const db = getDb();
  const cacheRef = db.collection("posts_cache").doc(userId);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + POSTS_CACHE_TTL);
  
  await cacheRef.set({
    userId,
    posts,
    cachedAt: now,
    expiresAt,
  });
  
  console.log(`Cached ${posts.length} posts for user ${userId}, expires at ${expiresAt.toISOString()}`);
}

/**
 * Clear cached posts for a user (useful when they want to force refresh)
 */
export async function clearCachedPosts(userId: string): Promise<void> {
  const db = getDb();
  const cacheRef = db.collection("posts_cache").doc(userId);
  await cacheRef.delete();
  console.log(`Cleared posts cache for user ${userId}`);
}

// ============================================
// CAROUSEL CRUD OPERATIONS
// ============================================

/**
 * Recursively sanitize an object for Firestore - removes undefined/null values
 */
function sanitizeForFirestore(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item)).filter(item => item !== null);
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined && value !== null) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned;
  }
  return obj;
}

/**
 * Create a new carousel
 */
export async function createCarousel(carouselData: Omit<Carousel, "id" | "createdAt" | "updatedAt">): Promise<Carousel> {
  const db = getDb();
  const now = new Date();
  const carouselRef = db.collection("carousels").doc();
  
  // Sanitize the carousel data before saving
  const sanitizedData = sanitizeForFirestore(carouselData);
  
  const carousel: Omit<Carousel, "id"> = {
    ...sanitizedData,
    createdAt: now,
    updatedAt: now,
  };
  
  await carouselRef.set(carousel);
  
  return { id: carouselRef.id, ...carousel };
}

/**
 * Get a carousel by ID
 */
export async function getCarousel(carouselId: string): Promise<Carousel | null> {
  const db = getDb();
  const doc = await db.collection("carousels").doc(carouselId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Carousel;
}

/**
 * Get all carousels for a user
 */
export async function getUserCarousels(userId: string): Promise<Carousel[]> {
  const db = getDb();
  const snapshot = await db.collection("carousels")
    .where("userId", "==", userId)
    .orderBy("updatedAt", "desc")
    .get();
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Carousel));
}

/**
 * Update a carousel
 */
export async function updateCarousel(carouselId: string, updates: Partial<Carousel>): Promise<void> {
  const db = getDb();
  const carouselRef = db.collection("carousels").doc(carouselId);
  
  // Sanitize the updates to remove any undefined/null values that Firestore can't handle
  const sanitizedUpdates = sanitizeForFirestore(updates);
  
  await carouselRef.update({
    ...sanitizedUpdates,
    updatedAt: new Date(),
  });
}

/**
 * Update a specific slide in a carousel (used for storing Base64 images)
 */
export async function updateCarouselSlide(
  carouselId: string, 
  slideNumber: number, 
  slideData: Partial<CarouselSlide>
): Promise<void> {
  const db = getDb();
  const carouselRef = db.collection("carousels").doc(carouselId);
  const doc = await carouselRef.get();
  
  if (!doc.exists) {
    throw new Error("Carousel not found");
  }
  
  const carousel = doc.data() as Carousel;
  
  // Sanitize the slideData before merging
  const sanitizedSlideData = sanitizeForFirestore(slideData);
  
  const updatedSlides = carousel.slides.map(slide => 
    slide.number === slideNumber ? { ...slide, ...sanitizedSlideData } : slide
  );
  
  // Sanitize the entire slides array before saving
  const sanitizedSlides = sanitizeForFirestore(updatedSlides);
  
  await carouselRef.update({
    slides: sanitizedSlides,
    updatedAt: new Date(),
  });
}

/**
 * Save Base64 PDF to carousel
 */
export async function saveCarouselPdf(carouselId: string, pdfBase64: string): Promise<void> {
  const db = getDb();
  const carouselRef = db.collection("carousels").doc(carouselId);
  
  // Only save if pdfBase64 is a valid string
  if (!pdfBase64 || typeof pdfBase64 !== 'string') {
    throw new Error("Invalid PDF data");
  }
  
  await carouselRef.update({
    pdfBase64,
    status: "pdf_created",
    updatedAt: new Date(),
  });
}

/**
 * Delete a carousel
 */
export async function deleteCarousel(carouselId: string): Promise<void> {
  const db = getDb();
  await db.collection("carousels").doc(carouselId).delete();
}
