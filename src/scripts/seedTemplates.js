import { db } from "../lib/firebase"; // Adjust import based on your setup
import { collection, getDocs, doc, setDoc, serverTimestamp } from "firebase/firestore";

function generateThumbnailSvg(templateName, layout) {
  const gradients = [
    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
    "linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)",
    "linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)",
    "linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)",
  ];
  const bg = gradients[Math.floor(Math.random() * gradients.length)];
  
  const svg = `
    <svg width="400" height="300" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#4f46e5;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#9333ea;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#grad)" rx="8" />
      <text x="50%" y="45%" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="white" text-anchor="middle">${templateName}</text>
      <text x="50%" y="60%" font-family="Arial, sans-serif" font-size="16" fill="rgba(255,255,255,0.8)" text-anchor="middle">${layout.replace(/_/g, ' ').toUpperCase()}</text>
      <rect x="40" y="240" width="120" height="12" fill="white" fill-opacity="0.3" rx="6" />
      <rect x="40" y="260" width="80" height="12" fill="white" fill-opacity="0.3" rx="6" />
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg.trim())}`;
}

const commonFields = ["title", "description", "authorName", "authorHandle"];
const commonDefaults = {
  title: "The Power of Data-Driven Marketing",
  description: "A simple guide you can apply today.",
  authorName: "Your Name",
  authorHandle: "@your-handle"
};

const templatesToSeed = [
  { id: "basic_001", name: "Basic #1", slidesCount: 1, layout: "basic_cover" },
  { id: "basic_002", name: "Basic #2", slidesCount: 5, layout: "basic_modern" },
  { id: "hook_001", name: "Hook Carousel", slidesCount: 5, layout: "hook_bold" },
  { id: "howto_001", name: "How-To Steps", slidesCount: 6, layout: "howto_steps" },
  { id: "tips_001", name: "5 Quick Tips", slidesCount: 5, layout: "tips_cards" },
  { id: "story_001", name: "Story Format", slidesCount: 6, layout: "story_minimal" },
  { id: "stats_001", name: "Stats & Proof", slidesCount: 5, layout: "stats_clean" },
  { id: "mistakes_001", name: "Mistakes to Avoid", slidesCount: 6, layout: "mistakes_warning" },
  { id: "framework_001", name: "Framework", slidesCount: 5, layout: "framework_grid" },
  { id: "case_001", name: "Mini Case Study", slidesCount: 6, layout: "case_study" },
];

export async function seedCarouselTemplates() {
  try {
    const templatesCol = collection(db, "templates");
    const snapshot = await getDocs(templatesCol);
    
    if (!snapshot.empty) {
      console.log("Templates already exist. Skipping seed.");
      return;
    }

    console.log("Seeding templates...");
    for (const t of templatesToSeed) {
      const docRef = doc(db, "templates", t.id);
      await setDoc(docRef, {
        name: t.name,
        type: "carousel",
        slidesCount: t.slidesCount,
        layout: t.layout,
        fields: commonFields,
        defaults: commonDefaults,
        status: "active",
        isPublic: true,
        thumbnail: generateThumbnailSvg(t.name, t.layout),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    console.log("Seeding completed successfully.");
  } catch (error) {
    console.error("Error seeding templates:", error);
    throw error;
  }
}
