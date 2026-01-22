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
    const templatesRef = collection(db, "carouselTemplates");
    const q = query(
      templatesRef,
      where("type", "==", "carousel"),
      where("status", "==", "active"),
      orderBy("createdAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching carousel templates:", error);
    throw error;
  }
}

/**
 * Fetch a single template by ID from Firestore
 */
export async function getTemplateById(templateId) {
  try {
    const docRef = doc(db, "carouselTemplates", templateId);
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
    throw error;
  }
}
