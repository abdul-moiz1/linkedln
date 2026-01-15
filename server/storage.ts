// PostgreSQL and Neon dependencies removed as requested
// All data operations should use Firestore via server/lib/firebase-admin.ts

export interface IStorage {
  // Methods moved to Firestore
}

export class MemStorage implements IStorage {
}

export const storage = new MemStorage();
export const getDb = () => { 
  console.warn("PostgreSQL call attempted. Use Firestore via firebase-admin.ts");
  return null as any; 
};
