import admin from "firebase-admin";

const isFirebaseConfigured = Boolean(
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY
);

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
      try {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
          storageBucket: storageBucket,
        });
        console.log("Firebase Admin initialized with project:", process.env.FIREBASE_PROJECT_ID);
      } catch (initError) {
        console.error("Firebase initializeApp failed:", initError);
      }
    }

    try {
      adminDb = admin.firestore();
      adminAuth = admin.auth();
      adminStorage = admin.storage();
      
      adminDb.listCollections()
        .then(async (collections) => {
          console.log("Firestore connection verified. Collections:", collections.map(c => c.id));
          console.log("[Firebase] Seeding templates into collection 'carouselTemplates'...");
          await seedTemplates(true);
        })
        .catch((connError: any) => console.error("Firestore connection test failed:", connError.message));
    } catch (instanceError) {
      console.error("Failed to get Firebase service instances:", instanceError);
    }
  } catch (error) {
    console.warn("Firebase initialization failed:", error);
  }
}

function getDb() {
  if (isFirebaseConfigured && !adminDb) {
    try {
      adminDb = admin.firestore();
    } catch (error) {
      console.error("[Firebase] Firestore init failed:", error);
    }
  }
  return adminDb;
}

export async function getTemplates(): Promise<any[]> {
  try {
    const db = getDb();
    if (!db) return [];
    const snapshot = await db.collection("carouselTemplates").get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("[Firebase] getTemplates error:", error);
    return [];
  }
}

export async function saveTemplate(templateData: any): Promise<any> {
  try {
    const db = getDb();
    if (!db) throw new Error("Firebase not configured");
    const templateRef = db.collection("carouselTemplates").doc();
    const data = { 
      ...templateData, 
      createdAt: admin.firestore.FieldValue.serverTimestamp(), 
      updatedAt: admin.firestore.FieldValue.serverTimestamp() 
    };
    await templateRef.set(data);
    return { id: templateRef.id, ...templateData };
  } catch (error) {
    console.error("[Firebase] saveTemplate error:", error);
    throw error;
  }
}

export async function seedTemplates(force = false) {
  if (!isFirebaseConfigured) return;
  try {
    const db = getDb();
    if (!db) return;
    
    const snapshot = await db.collection("carouselTemplates").where("category", "==", "Basic").get();
    
    if (snapshot.size < 20 || force) {
      console.log("[Firebase] Seeding 20 Basic templates...");
      
      const colors = [
        { primary: "#00a0dc", secondary: "#f3f6f8", bg: "#ffffff", text: "#1d2226", accent: "#0073b1" },
        { primary: "#e84e1b", secondary: "#fff5f2", bg: "#ffffff", text: "#1a1a1a", accent: "#ff6b35" },
        { primary: "#057642", secondary: "#e6f4ea", bg: "#ffffff", text: "#1a1a1a", accent: "#0a8d48" },
        { primary: "#7127a8", secondary: "#f3e8ff", bg: "#ffffff", text: "#1a1a1a", accent: "#9333ea" },
        { primary: "#111827", secondary: "#374151", bg: "#111827", text: "#ffffff", accent: "#3b82f6" },
      ];

      const fonts = ["Inter", "Roboto", "Montserrat", "Playfair Display", "Open Sans"];
      const slideImageIds = [
        "1460925895917-afdab827c52f", "1551288049-bebda4e38f71", "1557683316-973673baf926",
        "1516321318423-f06f85e504b3", "1558655146-d09347e92766", "1542744094-24638eff58bb",
        "1551434678-e076c223a692", "1522202176988-66273c2fd55f", "1504384308090-c894fdcc538d",
        "1517245318773-b7b8b42d3933"
      ];
      
      const templates = [];
      for (let i = 1; i <= 20; i++) {
        const colorSet = colors[i % colors.length];
        const font = fonts[i % fonts.length];
        const slidesCount = (i % 2 === 0) ? 4 : 5;
        
        const slides = Array.from({ length: slidesCount }, (_, index) => {
          let layoutType: "title" | "text" | "image" | "mixed" = "text";
          let textAlign: "left" | "center" | "right" = "center";
          
          if (index === 0) {
            layoutType = "title";
            textAlign = i % 3 === 0 ? "left" : i % 3 === 1 ? "center" : "right";
          } else if (index === slidesCount - 1) {
            layoutType = "mixed";
            textAlign = "center";
          } else {
            const variety = (i + index) % 4;
            if (variety === 0) layoutType = "text";
            else if (variety === 1) layoutType = "image";
            else if (variety === 2) layoutType = "mixed";
            else layoutType = "text";
            textAlign = (i + index) % 2 === 0 ? "left" : "center";
          }

          const imgIndex = (i * 3 + index) % slideImageIds.length;
          const imageId = slideImageIds[imgIndex];
          const imageUrl = `https://images.unsplash.com/photo-${imageId}?auto=format&fit=crop&w=800&q=80`;

          const placeholder = {
            title: index === 0 ? `The Essence of Leadership` : 
                   index === slidesCount - 1 ? "What are your thoughts?" : 
                   `Strategic Insight #${index}`,
            subtitle: index === 0 ? "Building High-Performance Teams in 2026" : "",
            body: layoutType === "text" || layoutType === "mixed" ? 
                  (index === slidesCount - 1 ? "Ready to transform your leadership style?\n\nFollow for more!" : 
                  "True leadership isn't about being in charge. It's about taking care of those in your charge.") : "",
            image: layoutType === "image" || layoutType === "mixed" ? imageUrl : ""
          };

          return {
            slideIndex: index,
            layoutType,
            backgroundColor: (i + index) % 5 === 0 ? colorSet.secondary : colorSet.bg,
            textAlign,
            placeholder,
            fontFamily: font,
            accentColor: colorSet.accent
          };
        });

        const coverImgIndex = (i * 7) % slideImageIds.length;
        const coverImageId = slideImageIds[coverImgIndex];
        
        templates.push({
          templateId: `basic_${i.toString().padStart(3, '0')}`,
          type: "carousel",
          status: "active",
          category: "Basic",
          title: `Professional Guide ${i}`,
          name: `Basic #${i}`,
          description: `A high-converting basic template for LinkedIn creators.`,
          slidesCount,
          isPublic: true,
          isNew: i > 15,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          fields: ["title", "description", "authorName", "authorHandle"],
          defaults: {
            title: `The Essence of Leadership #${i}`,
            description: "True leadership isn't about being in charge. It's about taking care of those in your charge."
          },
          layout: i % 2 === 0 ? "basic_cover" : "basic_modern",
          theme: {
            primaryColor: colorSet.primary,
            secondaryColor: colorSet.secondary,
            backgroundColor: colorSet.bg,
            textColor: colorSet.text,
            accentColor: colorSet.accent
          },
          preview: {
            coverImage: `https://images.unsplash.com/photo-${coverImageId}?auto=format&fit=crop&w=600&q=80`,
            hoverSlides: slides.map((_, idx) => {
              const slideImgIndex = (i * 3 + idx) % slideImageIds.length;
              return `https://images.unsplash.com/photo-${slideImageIds[slideImgIndex]}?auto=format&fit=crop&w=600&q=80`;
            })
          },
          slides,
          customization: {
            allowTextEdit: true,
            allowColorChange: true,
            allowImageUpload: true,
            allowReorderSlides: true
          }
        });
      }

      const batch = db.batch();
      if (force) snapshot.docs.forEach(doc => batch.delete(doc.ref));
      templates.forEach(t => batch.set(db.collection("carouselTemplates").doc(t.templateId), t));
      await batch.commit();
    console.log(`[Firebase] Seeded ${templates.length} templates.`);
    
    // Index templates in Pinecone for semantic search
    try {
      const { upsertVector } = await import("./vector-operations");
      console.log(`[Firebase] Indexing ${templates.length} templates in Pinecone...`);
      let indexedCount = 0;
      for (const t of templates) {
        // Wrap in try-catch to allow seeding to continue if Pinecone fails
        try {
          // Check for OpenAI quota before attempting
          if (!process.env.OPENAI_API_KEY) {
            console.warn("[Firebase] Skipping Pinecone index - OpenAI API key missing");
            break;
          }
          const result = await upsertVector("carouselTemplates", t.templateId, "");
          if (result.indexed) indexedCount++;
        } catch (e: any) {
          if (e.message?.includes("insufficient_quota")) {
            console.warn("[Firebase] OpenAI quota exceeded, stopping index process");
            break;
          }
          console.warn(`[Firebase] Failed to index template ${t.templateId}:`, e);
        }
      }
      console.log(`[Firebase] Indexed ${indexedCount}/${templates.length} templates in Pinecone.`);
    } catch (indexError: any) {
      console.warn(`[Firebase] Template indexing skipped:`, indexError.message);
    }
  }
} catch (e) {
  console.error("[Firebase] Seeding failed:", e);
}
}

export async function getUser(userId: string) {
if (!isFirebaseConfigured || !adminDb) return null;
const doc = await adminDb.collection("users").doc(userId).get();
return doc.exists ? doc.data() : null;
}

export async function saveUser(userData: any) {
if (!isFirebaseConfigured || !adminDb) return;
const { linkedinId, ...data } = userData;
await adminDb.collection("users").doc(linkedinId).set({
  ...data,
  updatedAt: admin.firestore.FieldValue.serverTimestamp()
}, { merge: true });
}

export async function saveLinkedLinkedIn(userId: string, data: any) {
if (!isFirebaseConfigured || !adminDb) return;
await adminDb.collection("users").doc(userId).set({
  linkedLinkedIn: {
    ...data,
    linkedAt: admin.firestore.FieldValue.serverTimestamp()
  }
}, { merge: true });
}

export async function getLinkedLinkedIn(userId: string) {
const user = await getUser(userId);
return user?.linkedLinkedIn || null;
}

export async function migrateGuestCarousels(guestId: string, userId: string) {
if (!isFirebaseConfigured || !adminDb) return;
const carousels = await adminDb.collection("carousels").where("guestId", "==", guestId).get();
const batch = adminDb.batch();
carousels.forEach(doc => {
  batch.update(doc.ref, { userId, guestId: admin.firestore.FieldValue.delete() });
});
await batch.commit();
}

export async function getCarousel(id: string) {
if (!isFirebaseConfigured || !adminDb) return null;
const doc = await adminDb.collection("carousels").doc(id).get();
return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

export async function updateCarousel(id: string, data: any) {
if (!isFirebaseConfigured || !adminDb) return;
await adminDb.collection("carousels").doc(id).set({
  ...data,
  updatedAt: admin.firestore.FieldValue.serverTimestamp()
}, { merge: true });
}

export async function createCarousel(data: any) {
if (!isFirebaseConfigured || !adminDb) return null;
const ref = adminDb.collection("carousels").doc();
await ref.set({
  ...data,
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp()
});
return { id: ref.id, ...data };
}

export async function getUserCarousels(userId: string) {
if (!isFirebaseConfigured || !adminDb) return [];
const snap = await adminDb.collection("carousels").where("userId", "==", userId).get();
return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function deleteCarousel(id: string) {
if (!isFirebaseConfigured || !adminDb) return;
await adminDb.collection("carousels").doc(id).delete();
}

export async function updateCarouselSlide(carouselId: string, slideIndex: number, data: any) {
const carousel = await getCarousel(carouselId) as any;
if (!carousel) return;
const slides = [...(carousel.slides || [])];
slides[slideIndex] = { ...slides[slideIndex], ...data };
await updateCarousel(carouselId, { slides });
}

export async function updateUserProfileUrl(userId: string, profileUrl: string) {
await adminDb?.collection("users").doc(userId).update({ profileUrl });
}

export async function getCachedPosts(userId: string) {
if (!adminDb) return [];
const snap = await adminDb.collection("posts_cache").where("userId", "==", userId).get();
return snap.docs.map(doc => doc.data());
}

export async function saveCachedPosts(userId: string, posts: any[]) {
if (!adminDb) return;
const batch = adminDb.batch();
posts.forEach(post => {
  const ref = adminDb!.collection("posts_cache").doc();
  batch.set(ref, { ...post, userId, createdAt: admin.firestore.FieldValue.serverTimestamp() });
});
await batch.commit();
}

export async function clearCachedPosts(userId: string) {
if (!adminDb) return;
const snap = await adminDb.collection("posts_cache").where("userId", "==", userId).get();
const batch = adminDb.batch();
snap.docs.forEach(doc => batch.delete(doc.ref));
await batch.commit();
}

export async function getProject(id: string) {
if (!adminDb) return null;
const doc = await adminDb.collection("projects").doc(id).get();
return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

export async function saveProject(data: any) {
if (!adminDb) return null;
const ref = adminDb.collection("projects").doc();
await ref.set({ ...data, createdAt: admin.firestore.FieldValue.serverTimestamp() });
return { id: ref.id, ...data };
}

export async function updateProject(id: string, data: any) {
if (!adminDb) return;
await adminDb.collection("projects").doc(id).update(data);
}

export async function getUserProjects(userId: string) {
if (!adminDb) return [];
const snap = await adminDb.collection("projects").where("userId", "==", userId).get();
return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function recoverCarouselImages(id: string) {
// Mock implementation or logic to recover images from storage
return listCarouselImages(id);
}

export async function saveCarouselPdf(carouselId: string, pdfUrl: string) {
await updateCarousel(carouselId, { pdfUrl });
}

export const CAROUSEL_TYPES = {
STANDARD: "standard",
TALL: "tall",
SQUARE: "square"
};

export { adminDb, adminAuth, adminStorage, isFirebaseConfigured, adminDb as adminFirestore };

export function isStorageConfigured(): boolean {
  return !!(adminStorage && storageBucket);
}

function getStorageBucket() {
  if (!adminStorage) throw new Error("Firebase Storage not configured");
  return adminStorage.bucket(storageBucket);
}

export async function uploadImageToStorage(base64Data: string, carouselId: string, slideNumber: number, contentType: string = "image/png"): Promise<string> {
  if (!adminStorage || !storageBucket) throw new Error("Firebase Storage not configured");
  const bucket = getStorageBucket();
  let imageData = base64Data;
  if (base64Data.startsWith("data:")) {
    const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) { contentType = matches[1]; imageData = matches[2]; }
  }
  const buffer = Buffer.from(imageData, "base64");
  const filePath = `carousels/${carouselId}/slide_${slideNumber}_${Date.now()}.${contentType.split("/")[1] || "png"}`;
  const file = bucket.file(filePath);
  await file.save(buffer, { metadata: { contentType, cacheControl: "public, max-age=31536000" }, public: true });
  return `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o/${encodeURIComponent(filePath)}?alt=media`;
}

export async function uploadPdfToStorage(base64Data: string, carouselId: string): Promise<string> {
  if (!adminStorage || !storageBucket) throw new Error("Firebase Storage not configured");
  const bucket = getStorageBucket();
  let pdfData = base64Data;
  if (base64Data.startsWith("data:")) {
    const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) { pdfData = matches[2]; }
  }
  const buffer = Buffer.from(pdfData, "base64");
  const filePath = `carousels/${carouselId}/carousel_${Date.now()}.pdf`;
  const file = bucket.file(filePath);
  await file.save(buffer, { metadata: { contentType: "application/pdf", cacheControl: "public, max-age=31536000" }, public: true });
  return `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o/${encodeURIComponent(filePath)}?alt=media`;
}

export async function deleteCarouselFiles(carouselId: string): Promise<void> {
  if (!adminStorage || !storageBucket) return;
  const bucket = getStorageBucket();
  try {
    const [files] = await bucket.getFiles({ prefix: `carousels/${carouselId}/` });
    if (files.length > 0) await Promise.all(files.map(file => file.delete()));
  } catch (error) { console.error(`Error deleting files for carousel ${carouselId}:`, error); }
}

export interface StorageListResult { success: boolean; images: { slideNumber: number; imageUrl: string }[]; error?: string; }

export async function listCarouselImages(carouselId: string): Promise<StorageListResult> {
  if (!adminStorage || !storageBucket) return { success: false, images: [], error: "Firebase Storage not configured" };
  const bucket = getStorageBucket();
  try {
    const [files] = await bucket.getFiles({ prefix: `carousels/${carouselId}/` });
    const imageFiles = files
      .filter(file => file.name.includes("slide_") && /\.(png|jpg|jpeg|webp)$/i.test(file.name))
      .map(file => {
        const slideMatch = file.name.match(/slide_(\d+)_/);
        return { slideNumber: slideMatch ? parseInt(slideMatch[1], 10) : 0, imageUrl: `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o/${encodeURIComponent(file.name)}?alt=media` };
      })
      .sort((a, b) => a.slideNumber - b.slideNumber);
    return { success: true, images: imageFiles };
  } catch (error: any) { return { success: false, images: [], error: error.message }; }
}

export async function getSignedUrl(filePath: string, expiresInMinutes: number = 60): Promise<string> {
  if (!adminStorage || !storageBucket) throw new Error("Firebase Storage not configured");
  const bucket = getStorageBucket();
  const file = bucket.file(filePath);
  const [url] = await file.getSignedUrl({ action: "read", expires: Date.now() + expiresInMinutes * 60 * 1000 });
  return url;
}

export type CarouselSlide = {
  number: number;
  rawText: string;
  finalText: string;
  imagePrompt: string;
  layout: "big_text_center" | "split_left" | "split_right" | "image_full";
  imageUrl?: string;
  base64Image?: string;
};

export interface Carousel {
  id: string;
  userId: string;
  title: string;
  slides: CarouselSlide[];
  status: string;
}
