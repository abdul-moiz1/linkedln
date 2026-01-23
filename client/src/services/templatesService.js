import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  doc, 
  getDoc 
} from "firebase/firestore";

/**
 * Fetch all active carousel templates from Firestore
 */
export async function getCarouselTemplates() {
  try {
    const templatesRef = collection(db, "templates");
    const q = query(
      templatesRef,
      where("type", "==", "carousel"),
      where("status", "==", "active")
    );
    
    const querySnapshot = await getDocs(q);
    const docs = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id // Force the ID to be the Firestore document ID
      };
    });

    // Sort in memory to avoid index requirement for new collections
    return docs.sort((a, b) => {
      const dateA = a.createdAt?.seconds || 0;
      const dateB = b.createdAt?.seconds || 0;
      return dateB - dateA;
    });
  } catch (error) {
    console.error("Error fetching carousel templates:", error);
    // Return empty array instead of throwing to prevent app crash
    return [];
  }
}

/**
 * Fetch a single template by ID from Firestore
 */
export async function getTemplateById(templateId) {
  try {
    console.log(`[templatesService] Fetching template by ID: "${templateId}"`);
    const docRef = doc(db, "templates", templateId);
    console.log(`[templatesService] docPath: "templates/${templateId}"`);
    
    const docSnap = await getDoc(docRef);
    console.log(`[templatesService] snapshot.exists: ${docSnap.exists()}`);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log(`[templatesService] snapshot.id: ${docSnap.id}, data.name: ${data.name}`);
      return {
        ...data,
        id: docSnap.id
      };
    }
    console.warn(`[templatesService] No template found with ID: ${templateId}`);
    return null;
  } catch (error) {
    console.error(`[templatesService] Error fetching template by ID: "${templateId}":`, error);
    return null;
  }
}
