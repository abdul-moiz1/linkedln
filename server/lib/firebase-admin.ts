import admin from "firebase-admin";

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

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();

export const collections = {
  users: adminDb.collection("users"),
  projects: adminDb.collection("projects"),
  sessions: adminDb.collection("sessions"),
};

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

export interface Session {
  id: string;
  userId: string;
  accessToken: string;
  expiresAt: Date;
  createdAt: Date;
}

export async function saveUser(userData: Omit<User, "id" | "createdAt" | "updatedAt">) {
  const now = new Date();
  const userRef = collections.users.doc(userData.linkedinId);
  
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
  const doc = await collections.users.doc(linkedinId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as User;
}

export async function saveProject(projectData: Omit<Project, "id" | "createdAt" | "updatedAt">) {
  const now = new Date();
  const projectRef = collections.projects.doc();
  
  await projectRef.set({
    ...projectData,
    createdAt: now,
    updatedAt: now,
  });

  return { id: projectRef.id, ...projectData, createdAt: now, updatedAt: now };
}

export async function updateProject(projectId: string, updates: Partial<Project>) {
  const projectRef = collections.projects.doc(projectId);
  await projectRef.update({
    ...updates,
    updatedAt: new Date(),
  });
}

export async function getUserProjects(userId: string): Promise<Project[]> {
  const snapshot = await collections.projects
    .where("userId", "==", userId)
    .orderBy("updatedAt", "desc")
    .get();
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
}

export async function getProject(projectId: string): Promise<Project | null> {
  const doc = await collections.projects.doc(projectId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Project;
}
