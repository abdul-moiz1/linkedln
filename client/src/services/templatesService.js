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
    const docs = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

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
    const docRef = doc(db, "templates", templateId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching template by ID:", error);
    return null;
  }
}
