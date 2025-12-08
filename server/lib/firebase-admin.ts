import admin from "firebase-admin";

const isFirebaseConfigured = Boolean(
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY
);

// Storage bucket from env var (VITE_ prefix for frontend, but we also use it on backend)
const storageBucket = process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET;

let adminDb: admin.firestore.Firestore | null = null;
let adminAuth: admin.auth.Auth | null = null;
let adminStorage: admin.storage.Storage | null = null;

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
        storageBucket: storageBucket,
      });
    }

    adminDb = admin.firestore();
    adminAuth = admin.auth();
    adminStorage = admin.storage();
    
    if (storageBucket) {
      console.log(`Firebase Storage configured with bucket: ${storageBucket}`);
    } else {
      console.warn("Firebase Storage bucket not configured. Set VITE_FIREBASE_STORAGE_BUCKET or FIREBASE_STORAGE_BUCKET");
    }
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

export { adminDb, adminAuth, adminStorage, isFirebaseConfigured };

// ============================================
// FIREBASE STORAGE OPERATIONS
// ============================================

/**
 * Check if Firebase Storage is properly configured
 */
export function isStorageConfigured(): boolean {
  const configured = !!(adminStorage && storageBucket);
  console.log(`[Storage Debug] isStorageConfigured: ${configured}, adminStorage: ${!!adminStorage}, storageBucket: "${storageBucket}"`);
  return configured;
}

/**
 * Get the Storage bucket instance
 */
function getStorageBucket() {
  if (!adminStorage) {
    throw new Error("Firebase Storage not configured");
  }
  // Explicitly pass the bucket name to ensure correct bucket is used
  const bucketName = storageBucket || undefined;
  console.log(`[Storage Debug] Getting bucket with name: ${bucketName}`);
  return adminStorage.bucket(bucketName);
}

/**
 * Upload a base64 image to Firebase Storage and return the public URL
 * @param base64Data - Base64 encoded image data (with or without data URI prefix)
 * @param carouselId - The carousel ID for organizing files
 * @param slideNumber - The slide number
 * @param contentType - MIME type of the image (default: image/png)
 * @returns Public download URL for the uploaded image
 */
export async function uploadImageToStorage(
  base64Data: string,
  carouselId: string,
  slideNumber: number,
  contentType: string = "image/png"
): Promise<string> {
  if (!adminStorage || !storageBucket) {
    throw new Error("Firebase Storage not configured. Please set VITE_FIREBASE_STORAGE_BUCKET");
  }

  console.log(`[uploadImageToStorage] Starting upload for carousel: ${carouselId}, slide: ${slideNumber}`);

  const bucket = getStorageBucket();
  
  // Remove data URI prefix if present (e.g., "data:image/png;base64,")
  let imageData = base64Data;
  if (base64Data.startsWith("data:")) {
    const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      contentType = matches[1];
      imageData = matches[2];
    }
  }

  // Convert base64 to buffer
  const buffer = Buffer.from(imageData, "base64");
  console.log(`[uploadImageToStorage] Image buffer size: ${buffer.length} bytes`);
  
  // Generate unique file path: carousels/{carouselId}/slide_{slideNumber}_{timestamp}.png
  const timestamp = Date.now();
  const extension = contentType.split("/")[1] || "png";
  const filePath = `carousels/${carouselId}/slide_${slideNumber}_${timestamp}.${extension}`;
  
  const file = bucket.file(filePath);
  
  try {
    // Upload the file with public read access
    await file.save(buffer, {
      metadata: {
        contentType,
        cacheControl: "public, max-age=31536000",
      },
      public: true, // Make file public during upload
    });
    console.log(`[uploadImageToStorage] File saved successfully`);

    // Return the public URL using Firebase Storage URL format
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o/${encodeURIComponent(filePath)}?alt=media`;
    console.log(`[uploadImageToStorage] Public URL: ${publicUrl}`);
    
    return publicUrl;
  } catch (uploadError: any) {
    console.error(`[uploadImageToStorage] Upload failed:`, uploadError.message || uploadError);
    throw uploadError;
  }
}

/**
 * Upload a PDF to Firebase Storage and return the public URL
 * @param base64Data - Base64 encoded PDF data (with or without data URI prefix)
 * @param carouselId - The carousel ID for organizing files
 * @returns Public download URL for the uploaded PDF
 */
export async function uploadPdfToStorage(
  base64Data: string,
  carouselId: string
): Promise<string> {
  if (!adminStorage || !storageBucket) {
    throw new Error("Firebase Storage not configured. Please set VITE_FIREBASE_STORAGE_BUCKET");
  }

  console.log(`[uploadPdfToStorage] Starting upload for carousel: ${carouselId}`);
  console.log(`[uploadPdfToStorage] Bucket name: ${storageBucket}`);

  const bucket = getStorageBucket();
  
  // Remove data URI prefix if present
  let pdfData = base64Data;
  if (base64Data.startsWith("data:")) {
    const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      pdfData = matches[2];
    }
  }

  // Convert base64 to buffer
  const buffer = Buffer.from(pdfData, "base64");
  console.log(`[uploadPdfToStorage] PDF buffer size: ${buffer.length} bytes`);
  
  // Generate unique file path: carousels/{carouselId}/carousel_{timestamp}.pdf
  const timestamp = Date.now();
  const filePath = `carousels/${carouselId}/carousel_${timestamp}.pdf`;
  console.log(`[uploadPdfToStorage] File path: ${filePath}`);
  
  const file = bucket.file(filePath);
  
  try {
    // Upload the file with public read access
    await file.save(buffer, {
      metadata: {
        contentType: "application/pdf",
        cacheControl: "public, max-age=31536000",
      },
      public: true, // Make file public during upload
    });
    console.log(`[uploadPdfToStorage] File saved successfully`);

    // Return the public URL using Firebase Storage URL format
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o/${encodeURIComponent(filePath)}?alt=media`;
    console.log(`[uploadPdfToStorage] Public URL: ${publicUrl}`);
    
    return publicUrl;
  } catch (uploadError: any) {
    console.error(`[uploadPdfToStorage] Upload failed:`, uploadError.message || uploadError);
    throw uploadError;
  }
}

/**
 * Delete all files for a carousel from Firebase Storage
 * @param carouselId - The carousel ID
 */
export async function deleteCarouselFiles(carouselId: string): Promise<void> {
  if (!adminStorage || !storageBucket) {
    console.warn("Firebase Storage not configured, skipping file deletion");
    return;
  }

  const bucket = getStorageBucket();
  const prefix = `carousels/${carouselId}/`;
  
  try {
    const [files] = await bucket.getFiles({ prefix });
    
    if (files.length > 0) {
      await Promise.all(files.map(file => file.delete()));
      console.log(`Deleted ${files.length} files for carousel ${carouselId}`);
    }
  } catch (error) {
    console.error(`Error deleting files for carousel ${carouselId}:`, error);
  }
}

/**
 * Get a signed URL for a file (useful for temporary access to private files)
 * @param filePath - The path to the file in Storage
 * @param expiresInMinutes - How long the URL should be valid (default: 60 minutes)
 * @returns Signed URL that expires after the specified time
 */
export async function getSignedUrl(
  filePath: string,
  expiresInMinutes: number = 60
): Promise<string> {
  if (!adminStorage || !storageBucket) {
    throw new Error("Firebase Storage not configured");
  }

  const bucket = getStorageBucket();
  const file = bucket.file(filePath);
  
  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + expiresInMinutes * 60 * 1000,
  });
  
  return url;
}

export interface User {
  id: string;
  linkedinId: string;
  email: string;
  name: string;
  profilePicture?: string | null;
  accessToken: string;
  refreshToken?: string | null;
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
  | "custom"
  | "story-flow"
  | "educational"
  | "before-after"
  | "checklist"
  | "quote"
  | "stats-data"
  | "portfolio"
  | "comparison"
  | "achievement"
  | "framework"
  | "tips-howto"
  | "quote-inspiration";

export interface CarouselTypeInfo {
  id: CarouselType;
  name: string;
  description: string;
  slideCount: { min: number; max: number };
}

export const CAROUSEL_TYPES: CarouselTypeInfo[] = [
  { id: "custom", name: "Custom", description: "Any length you need (min 2 slides)", slideCount: { min: 2, max: 20 } },
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
  { id: "tips-howto", name: "Tips & How-To", description: "Share actionable advice", slideCount: { min: 3, max: 5 } },
  { id: "quote-inspiration", name: "Quote", description: "Feature powerful quotes", slideCount: { min: 2, max: 4 } },
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
  base64Image?: string; // data:image/png;base64,... (legacy, for backward compatibility)
  imageUrl?: string; // Firebase Storage URL (preferred)
}

// Carousel document structure for Firestore
export interface Carousel {
  id: string;
  userId: string;
  title: string;
  carouselType: CarouselType;
  slides: CarouselSlide[];
  pdfBase64?: string; // data:application/pdf;base64,... (legacy, for backward compatibility)
  pdfUrl?: string; // Firebase Storage URL (preferred)
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
  
  // Sanitize user data to convert undefined to null for Firestore
  const sanitizedData: Record<string, any> = {};
  for (const [key, value] of Object.entries(userData)) {
    sanitizedData[key] = value === undefined ? null : value;
  }
  
  await userRef.set({
    ...sanitizedData,
    updatedAt: now,
  }, { merge: true });

  const doc = await userRef.get();
  if (!doc.exists) {
    await userRef.set({
      ...sanitizedData,
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
  // Note: We avoid using orderBy with where to prevent needing a composite index
  const snapshot = await db.collection("carousels")
    .where("userId", "==", userId)
    .get();
  
  const carousels = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Carousel));
  
  // Sort by updatedAt descending (most recent first)
  carousels.sort((a, b) => {
    const dateA = a.updatedAt instanceof Date ? a.updatedAt : 
                  (a.updatedAt as any)?._seconds ? new Date((a.updatedAt as any)._seconds * 1000) : 
                  new Date(a.updatedAt || 0);
    const dateB = b.updatedAt instanceof Date ? b.updatedAt : 
                  (b.updatedAt as any)?._seconds ? new Date((b.updatedAt as any)._seconds * 1000) : 
                  new Date(b.updatedAt || 0);
    return dateB.getTime() - dateA.getTime();
  });
  
  return carousels;
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

/**
 * Migrate guest carousels to a user account
 * Called when a guest logs in to claim their carousels
 */
export async function migrateGuestCarousels(guestId: string, newUserId: string): Promise<number> {
  const db = getDb();
  const guestUserId = `guest-${guestId}`;
  
  const snapshot = await db.collection("carousels")
    .where("userId", "==", guestUserId)
    .get();
  
  let migratedCount = 0;
  const batch = db.batch();
  
  snapshot.docs.forEach(doc => {
    batch.update(doc.ref, {
      userId: newUserId,
      updatedAt: new Date(),
    });
    migratedCount++;
  });
  
  if (migratedCount > 0) {
    await batch.commit();
    console.log(`Migrated ${migratedCount} carousels from ${guestUserId} to ${newUserId}`);
  }
  
  return migratedCount;
}
