import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  serverTimestamp 
} from "firebase/firestore";

/**
 * Generates a branded SVG thumbnail for a template
 */
function generateThumbnailSvg(templateName, layout) {
  const gradients = {
    basic_cover: ["#0f172a", "#1e293b"],
    basic_modern: ["#0ea5e9", "#0284c7"],
    hook_bold: ["#f43f5e", "#e11d48"],
    howto_steps: ["#10b981", "#059669"],
    tips_cards: ["#f59e0b", "#d97706"],
    story_minimal: ["#6366f1", "#4f46e5"],
    stats_clean: ["#8b5cf6", "#7c3aed"],
    mistakes_warning: ["#ef4444", "#dc2626"],
    framework_grid: ["#06b6d4", "#0891b2"],
    case_study: ["#ec4899", "#db2777"]
  };

  const colors = gradients[layout] || ["#64748b", "#475569"];
  
  const svg = `
    <svg width="400" height="500" viewBox="0 0 400 500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad-${layout}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colors[0]};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colors[1]};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="400" height="500" fill="url(#grad-${layout})" rx="20" />
      <rect x="40" y="400" width="120" height="8" fill="white" fill-opacity="0.2" rx="4" />
      <rect x="40" y="420" width="80" height="8" fill="white" fill-opacity="0.1" rx="4" />
      <circle cx="340" cy="440" r="20" fill="white" fill-opacity="0.1" />
      <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="42" fill="white" style="text-transform:uppercase;letter-spacing:-1px">
        ${templateName}
      </text>
      <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="500" font-size="16" fill="white" fill-opacity="0.7">
        PROFESSIONAL TEMPLATE
      </text>
    </svg>
  `.trim().replace(/\s+/g, ' ');

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export async function seedCarouselTemplates() {
  const templates = [
    { id: "basic_001", name: "Basic #1", slidesCount: 1, layout: "basic_cover" },
    { id: "basic_002", name: "Basic #2", slidesCount: 5, layout: "basic_modern" },
    { id: "hook_001", name: "Hook Carousel", slidesCount: 5, layout: "hook_bold" },
    { id: "howto_001", name: "How-To Steps", slidesCount: 6, layout: "howto_steps" },
    { id: "tips_001", name: "5 Quick Tips", slidesCount: 5, layout: "tips_cards" },
    { id: "story_001", name: "Story Format", slidesCount: 6, layout: "story_minimal" },
    { id: "stats_001", name: "Stats & Proof", slidesCount: 5, layout: "stats_clean" },
    { id: "mistakes_001", name: "Mistakes to Avoid", slidesCount: 6, layout: "mistakes_warning" },
    { id: "framework_001", name: "Framework", slidesCount: 5, layout: "framework_grid" },
    { id: "case_001", name: "Mini Case Study", slidesCount: 6, layout: "case_study" }
  ];

  const commonFields = ["title", "description", "authorName", "authorHandle"];
  const templatesRef = collection(db, "carouselTemplates");

  try {
    const existingDocs = await getDocs(templatesRef);
    if (existingDocs.size > 0) {
      console.log("Templates collection already has data. Skipping seed.");
      return { success: true, count: 0, message: "Templates already exist." };
    }

    console.log("Seeding templates into Firestore...");
    let count = 0;

    for (const t of templates) {
      const templateData = {
        name: t.name,
        type: "carousel",
        slidesCount: t.slidesCount,
        layout: t.layout,
        thumbnail: generateThumbnailSvg(t.name, t.layout),
        fields: commonFields,
        defaults: {
          title: "The Power of Data-Driven Marketing",
          description: "A simple guide you can apply today.",
          authorName: "Your Name",
          authorHandle: "@your-handle"
        },
        status: "active",
        isPublic: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, "carouselTemplates", t.id), templateData);
      count++;
    }

    console.log(`Successfully seeded ${count} templates.`);
    return { success: true, count, message: `Successfully seeded ${count} templates.` };
  } catch (error) {
    console.error("Error seeding templates:", error);
    throw error;
  }
}
